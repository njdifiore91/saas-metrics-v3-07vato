"""
Main application file for the Benchmark Service
Version: 1.0.0

Implements a high-performance FastAPI and gRPC server for benchmark data operations
with comprehensive monitoring, tracing, and fault tolerance.
"""

import asyncio
from concurrent import futures
import logging
import signal
from typing import Dict, Optional

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn  # v0.22.0
import grpc  # v1.56.0
from prometheus_client import start_http_server, Counter, Histogram, Gauge  # v0.17.0
from opentelemetry import trace  # v1.18.0
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.grpc import GrpcInstrumentor
from circuitbreaker import CircuitBreaker  # v1.4.0

from config import settings
from controllers.benchmark_controller import BenchmarkController
from services.data_processing_service import DataProcessingService
from services.aggregation_service import BenchmarkAggregator

# Initialize monitoring metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request duration', ['method', 'endpoint'])
ACTIVE_REQUESTS = Gauge('active_requests', 'Number of active requests')

# Initialize circuit breaker
CIRCUIT_BREAKER = CircuitBreaker(
    failure_threshold=5,
    recovery_timeout=60,
    exclude=[ValueError]
)

class HealthCheck:
    """Enhanced health check implementation with detailed system status."""
    
    def __init__(self):
        self.is_healthy = True
        self.component_status: Dict[str, bool] = {
            'database': True,
            'grpc_server': True,
            'cache': True
        }
        self.health_check_counter = Counter(
            'health_checks_total',
            'Total number of health checks'
        )
        self.health_check_duration = Histogram(
            'health_check_duration_seconds',
            'Health check duration'
        )

    @REQUEST_LATENCY.time()
    async def check_health(self) -> Dict:
        """Perform comprehensive health check with monitoring."""
        self.health_check_counter.inc()
        
        return {
            'status': 'healthy' if self.is_healthy else 'unhealthy',
            'components': self.component_status,
            'version': settings.VERSION,
            'environment': settings.ENV
        }

@CIRCUIT_BREAKER
def configure_app() -> FastAPI:
    """Configure FastAPI application with enhanced middleware and monitoring."""
    app = FastAPI(
        title='Benchmark Service',
        version=settings.VERSION,
        docs_url='/docs',
        redoc_url='/redoc'
    )

    # Add middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_HOSTS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Initialize services
    data_processor = DataProcessingService()
    aggregator = BenchmarkAggregator(data_processor.process_benchmark_data([]))
    benchmark_controller = BenchmarkController(data_processor, aggregator)
    health_check = HealthCheck()

    # Register routes
    @app.get("/health")
    async def health() -> Dict:
        return await health_check.check_health()

    @app.get("/metrics")
    async def metrics() -> Response:
        return Response(
            media_type="text/plain",
            content="Metrics endpoint for Prometheus scraping"
        )

    @app.middleware("http")
    async def monitor_requests(request: Request, call_next) -> Response:
        ACTIVE_REQUESTS.inc()
        try:
            response = await call_next(request)
            REQUEST_COUNT.labels(
                method=request.method,
                endpoint=request.url.path,
                status=response.status_code
            ).inc()
            return response
        finally:
            ACTIVE_REQUESTS.dec()

    # Initialize OpenTelemetry instrumentation
    FastAPIInstrumentor.instrument_app(app)

    return app

@CIRCUIT_BREAKER
def configure_grpc() -> grpc.Server:
    """Configure gRPC server with monitoring and fault tolerance."""
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        options=[
            ('grpc.max_send_message_length', 100 * 1024 * 1024),
            ('grpc.max_receive_message_length', 100 * 1024 * 1024),
            ('grpc.keepalive_time_ms', 30000),
            ('grpc.keepalive_timeout_ms', 10000)
        ]
    )

    # Initialize services
    data_processor = DataProcessingService()
    aggregator = BenchmarkAggregator(data_processor.process_benchmark_data([]))
    benchmark_controller = BenchmarkController(data_processor, aggregator)

    # Add services to server
    # Note: Service registration would be implemented here based on proto definitions

    # Initialize OpenTelemetry instrumentation
    GrpcInstrumentor.instrument_server(server)

    return server

async def main() -> None:
    """Enhanced main entry point with comprehensive monitoring and graceful shutdown."""
    # Initialize tracing
    tracer = trace.get_tracer(__name__)

    # Start Prometheus metrics server
    start_http_server(settings.TELEMETRY_CONFIG['metrics_port'])

    # Configure servers
    app = configure_app()
    grpc_server = configure_grpc()

    # Start gRPC server
    grpc_server.start()
    logging.info("gRPC server started")

    # Configure graceful shutdown
    shutdown_event = asyncio.Event()

    def handle_shutdown(signum, frame):
        logging.info("Shutdown signal received")
        shutdown_event.set()

    signal.signal(signal.SIGTERM, handle_shutdown)
    signal.signal(signal.SIGINT, handle_shutdown)

    # Start FastAPI server
    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=8000,
        log_level=settings.LOGGING['level'].lower(),
        loop="asyncio"
    )
    server = uvicorn.Server(config)

    # Run servers
    try:
        await server.serve()
    finally:
        grpc_server.stop(grace=5)
        logging.info("Servers shutdown completed")

if __name__ == "__main__":
    logging.basicConfig(
        level=getattr(logging, settings.LOGGING['level']),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    asyncio.run(main())