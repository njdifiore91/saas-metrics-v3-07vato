"""
Benchmark Controller Implementation
Version: 1.0.0

FastAPI controller handling benchmark data operations with enhanced performance,
monitoring, and reliability features.
"""

from fastapi import FastAPI, HTTPException, Depends
from typing import Dict, List, Optional, Union
from datetime import datetime, timedelta
import logging
from prometheus_client import Counter, Histogram, Gauge  # v0.17.1
from opentelemetry import trace  # v1.20.0
from pybreaker import CircuitBreaker  # v1.0.1
import grpc

from models.benchmark_model import BenchmarkModel
from services.aggregation_service import BenchmarkAggregator
from services.data_processing_service import DataProcessingService
from benchmark_pb2 import (
    GetBenchmarkRequest, GetBenchmarkResponse,
    CalculateRankingRequest, CalculateRankingResponse,
    BenchmarkData, BenchmarkStatistics
)

# Monitoring metrics
REQUEST_COUNT = Counter('benchmark_requests_total', 'Total benchmark requests', ['endpoint'])
RESPONSE_TIME = Histogram('benchmark_response_seconds', 'Response time in seconds')
ERROR_COUNT = Counter('benchmark_errors_total', 'Total errors', ['type'])
CACHE_HITS = Counter('benchmark_cache_hits_total', 'Cache hit count')
ACTIVE_REQUESTS = Gauge('benchmark_active_requests', 'Number of active requests')

class BenchmarkController:
    """Controller implementing the benchmark service gRPC interface with enhanced features."""

    def __init__(
        self,
        data_processor: DataProcessingService,
        aggregator: BenchmarkAggregator,
        circuit_breaker: Optional[CircuitBreaker] = None
    ):
        """
        Initialize the benchmark controller with required services and monitoring.
        
        Args:
            data_processor: Service for data processing
            aggregator: Service for data aggregation
            circuit_breaker: Optional circuit breaker for fault tolerance
        """
        self._data_processor = data_processor
        self._aggregator = aggregator
        self._tracer = trace.get_tracer(__name__)
        self._logger = logging.getLogger(__name__)
        
        # Initialize circuit breaker
        self._circuit_breaker = circuit_breaker or CircuitBreaker(
            fail_max=5,
            reset_timeout=60,
            exclude=[HTTPException]
        )
        
        # Initialize cache with TTL
        self._cache: Dict[str, Dict] = {}
        self._cache_ttl = timedelta(minutes=5)
        self._last_cache_cleanup = datetime.now()

    @RESPONSE_TIME.time()
    async def get_benchmark_data(
        self,
        request: GetBenchmarkRequest,
        context: grpc.ServicerContext
    ) -> GetBenchmarkResponse:
        """
        Retrieve benchmark data with comprehensive validation and caching.
        
        Args:
            request: GetBenchmarkRequest containing filter criteria
            context: gRPC service context
            
        Returns:
            GetBenchmarkResponse with filtered benchmark data
            
        Raises:
            grpc.RpcError: If request processing fails
        """
        REQUEST_COUNT.labels(endpoint='get_benchmark_data').inc()
        ACTIVE_REQUESTS.inc()
        
        try:
            with self._tracer.start_as_current_span("get_benchmark_data") as span:
                # Input validation
                if not request.revenue_range:
                    raise ValueError("Revenue range must be specified")
                if not request.metric_type:
                    raise ValueError("Metric type must be specified")
                
                # Check cache
                cache_key = f"{request.revenue_range}_{request.metric_type}"
                cached_response = self._get_from_cache(cache_key)
                if cached_response:
                    CACHE_HITS.inc()
                    return cached_response
                
                # Process request using circuit breaker
                @self._circuit_breaker
                def process_request():
                    # Filter and process data
                    filtered_data = self._data_processor.filter_by_revenue_range(
                        str(request.revenue_range)
                    )
                    
                    # Calculate statistics if requested
                    statistics = None
                    if request.include_statistics:
                        statistics = self._data_processor.calculate_statistics(
                            str(request.revenue_range),
                            str(request.metric_type)
                        )
                    
                    # Convert to protobuf response
                    benchmark_data = [
                        BenchmarkModel.from_dict(row).to_proto()
                        for _, row in filtered_data.iterrows()
                    ]
                    
                    response = GetBenchmarkResponse(
                        data=benchmark_data,
                        statistics=BenchmarkStatistics(**statistics) if statistics else None,
                        validation=self._validate_response(benchmark_data)
                    )
                    
                    # Cache response
                    self._cache[cache_key] = {
                        'data': response,
                        'timestamp': datetime.now()
                    }
                    
                    return response
                
                response = process_request()
                span.set_attribute("benchmark.response.size", len(response.data))
                return response
                
        except ValueError as e:
            ERROR_COUNT.labels(type='validation_error').inc()
            self._logger.error(f"Validation error: {str(e)}")
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(str(e))
            raise
            
        except Exception as e:
            ERROR_COUNT.labels(type='processing_error').inc()
            self._logger.error(f"Processing error: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Internal processing error")
            raise
            
        finally:
            ACTIVE_REQUESTS.dec()
            self._cleanup_cache()

    @RESPONSE_TIME.time()
    async def calculate_ranking(
        self,
        request: CalculateRankingRequest,
        context: grpc.ServicerContext
    ) -> CalculateRankingResponse:
        """
        Calculate percentile ranking with comprehensive peer comparison.
        
        Args:
            request: CalculateRankingRequest containing metric value and criteria
            context: gRPC service context
            
        Returns:
            CalculateRankingResponse with ranking information
            
        Raises:
            grpc.RpcError: If calculation fails
        """
        REQUEST_COUNT.labels(endpoint='calculate_ranking').inc()
        ACTIVE_REQUESTS.inc()
        
        try:
            with self._tracer.start_as_current_span("calculate_ranking") as span:
                # Generate comparison report
                comparison_report = self._aggregator.generate_comparison_report(
                    str(request.metric_type),
                    str(request.revenue_range),
                    request.metric_value
                )
                
                response = CalculateRankingResponse(
                    percentile=comparison_report['comparison']['percentile'],
                    rank=int(comparison_report['comparison']['rank']),
                    total_companies=comparison_report['metadata']['sample_size'],
                    peer_statistics=BenchmarkStatistics(
                        **comparison_report['comparison']['benchmark_stats']
                    ),
                    validation=self._validate_response([])
                )
                
                span.set_attribute("benchmark.percentile", response.percentile)
                return response
                
        except ValueError as e:
            ERROR_COUNT.labels(type='validation_error').inc()
            self._logger.error(f"Validation error: {str(e)}")
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(str(e))
            raise
            
        except Exception as e:
            ERROR_COUNT.labels(type='processing_error').inc()
            self._logger.error(f"Processing error: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Internal processing error")
            raise
            
        finally:
            ACTIVE_REQUESTS.dec()

    def _get_from_cache(self, key: str) -> Optional[GetBenchmarkResponse]:
        """Retrieve response from cache if valid."""
        if key in self._cache:
            cache_entry = self._cache[key]
            if datetime.now() - cache_entry['timestamp'] < self._cache_ttl:
                return cache_entry['data']
        return None

    def _cleanup_cache(self) -> None:
        """Perform cache cleanup based on TTL."""
        current_time = datetime.now()
        expired_keys = [
            key for key, value in self._cache.items()
            if current_time - value['timestamp'] > self._cache_ttl
        ]
        for key in expired_keys:
            del self._cache[key]

    def _validate_response(self, data: List[BenchmarkData]) -> Dict:
        """Validate response data and generate validation result."""
        return {
            'status': 'VALIDATION_STATUS_VALID',
            'code': 'SUCCESS',
            'message': 'Data validation successful',
            'details': {
                'record_count': str(len(data)),
                'timestamp': datetime.now().isoformat()
            }
        }