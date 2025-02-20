"""
Integration tests for the Benchmark Service API endpoints and gRPC methods.
Version: 1.0.0

Tests the complete functionality of the benchmark service including data retrieval,
comparison, and time series analysis with actual database interactions.
"""

import pytest
import pytest_asyncio
import httpx
import grpc
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Tuple

from app import app, test_client
from models.benchmark_model import BenchmarkModel, REVENUE_RANGES
from benchmark_pb2 import (
    GetBenchmarkRequest, GetBenchmarkResponse,
    CalculateRankingRequest, CalculateRankingResponse,
    RevenueRange, MetricType
)

@pytest.fixture(scope='module')
async def setup_test_environment():
    """
    Sets up the test environment with database, test data, and server instances.
    """
    # Initialize test data
    test_data = {
        'ndr_metrics': [
            {
                'id': f'test_ndr_{i}',
                'metric_id': 'NDR',
                'source_id': 'test_source',
                'revenue_range': RevenueRange.REVENUE_RANGE_1M_5M,
                'value': Decimal(str(100 + i * 5)),
                'period_start': datetime.now() - timedelta(days=30),
                'period_end': datetime.now()
            } for i in range(10)
        ],
        'magic_number_metrics': [
            {
                'id': f'test_mn_{i}',
                'metric_id': 'MAGIC_NUMBER',
                'source_id': 'test_source',
                'revenue_range': RevenueRange.REVENUE_RANGE_5M_10M,
                'value': Decimal(str(1 + i * 0.2)),
                'period_start': datetime.now() - timedelta(days=30),
                'period_end': datetime.now()
            } for i in range(10)
        ]
    }

    # Create test client
    async with test_client(app) as client:
        # Create gRPC channel
        channel = grpc.aio.insecure_channel('localhost:50051')
        
        # Initialize test data in database
        for metric_list in test_data.values():
            for metric_data in metric_list:
                benchmark = BenchmarkModel(**metric_data)
                await client.post('/api/v1/benchmarks', json=benchmark.dict())

        yield client, channel

        # Cleanup test data
        await channel.close()

@pytest.mark.asyncio
class TestBenchmarkAPI:
    """Integration test suite for Benchmark API endpoints and gRPC methods."""

    async def test_get_benchmark_data(self, setup_test_environment):
        """Tests benchmark data retrieval with various filters."""
        client, channel = setup_test_environment

        # Test REST API endpoint
        response = await client.get(
            '/api/v1/benchmarks',
            params={
                'revenue_range': 'REVENUE_RANGE_1M_5M',
                'metric_type': 'METRIC_TYPE_NDR'
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data['data']) == 10
        assert data['statistics']['mean'] > 0
        assert data['validation']['status'] == 'VALIDATION_STATUS_VALID'

        # Test gRPC method
        stub = BenchmarkServiceStub(channel)
        request = GetBenchmarkRequest(
            revenue_range=RevenueRange.REVENUE_RANGE_1M_5M,
            metric_type=MetricType.METRIC_TYPE_NDR,
            include_statistics=True
        )
        response = await stub.GetBenchmarkData(request)
        assert len(response.data) == 10
        assert response.statistics.mean > 0
        assert response.validation.status == 'VALIDATION_STATUS_VALID'

    async def test_compare_metrics(self, setup_test_environment):
        """Tests metric comparison functionality."""
        client, channel = setup_test_environment

        # Test REST API endpoint
        response = await client.post(
            '/api/v1/benchmarks/compare',
            json={
                'metric_value': 110.0,
                'revenue_range': 'REVENUE_RANGE_1M_5M',
                'metric_type': 'METRIC_TYPE_NDR'
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert 0 <= data['percentile'] <= 100
        assert data['peer_statistics']['sample_size'] > 0

        # Test gRPC method
        stub = BenchmarkServiceStub(channel)
        request = CalculateRankingRequest(
            metric_value=110.0,
            revenue_range=RevenueRange.REVENUE_RANGE_1M_5M,
            metric_type=MetricType.METRIC_TYPE_NDR
        )
        response = await stub.CalculateRanking(request)
        assert 0 <= response.percentile <= 100
        assert response.peer_statistics.sample_size > 0

    async def test_time_series_analysis(self, setup_test_environment):
        """Tests time series analysis with trend detection."""
        client, channel = setup_test_environment

        # Test REST API endpoint
        response = await client.get(
            '/api/v1/benchmarks/timeseries',
            params={
                'revenue_range': 'REVENUE_RANGE_5M_10M',
                'metric_type': 'METRIC_TYPE_MAGIC_NUMBER',
                'period_type': 'monthly'
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data['data_points']) > 0
        assert 'trend_indicators' in data

        # Test gRPC method
        stub = BenchmarkServiceStub(channel)
        request = GetTimeSeriesRequest(
            revenue_range=RevenueRange.REVENUE_RANGE_5M_10M,
            metric_type=MetricType.METRIC_TYPE_MAGIC_NUMBER,
            granularity='monthly'
        )
        response = await stub.GetTimeSeriesData(request)
        assert len(response.data_points) > 0
        assert len(response.trend_indicators) > 0

    async def test_error_handling(self, setup_test_environment):
        """Tests error handling and validation."""
        client, channel = setup_test_environment

        # Test invalid revenue range
        response = await client.get(
            '/api/v1/benchmarks',
            params={
                'revenue_range': 'INVALID_RANGE',
                'metric_type': 'METRIC_TYPE_NDR'
            }
        )
        assert response.status_code == 400
        assert 'Invalid revenue range' in response.json()['detail']

        # Test invalid metric value
        response = await client.post(
            '/api/v1/benchmarks/compare',
            json={
                'metric_value': -1.0,
                'revenue_range': 'REVENUE_RANGE_1M_5M',
                'metric_type': 'METRIC_TYPE_NDR'
            }
        )
        assert response.status_code == 400
        assert 'Invalid metric value' in response.json()['detail']

    async def test_caching_behavior(self, setup_test_environment):
        """Tests response caching and performance."""
        client, channel = setup_test_environment

        # Make initial request
        start_time = datetime.now()
        response1 = await client.get(
            '/api/v1/benchmarks',
            params={
                'revenue_range': 'REVENUE_RANGE_1M_5M',
                'metric_type': 'METRIC_TYPE_NDR'
            }
        )
        first_request_time = (datetime.now() - start_time).total_seconds()

        # Make same request again
        start_time = datetime.now()
        response2 = await client.get(
            '/api/v1/benchmarks',
            params={
                'revenue_range': 'REVENUE_RANGE_1M_5M',
                'metric_type': 'METRIC_TYPE_NDR'
            }
        )
        second_request_time = (datetime.now() - start_time).total_seconds()

        # Verify cache hit
        assert response1.json() == response2.json()
        assert second_request_time < first_request_time

    async def test_data_consistency(self, setup_test_environment):
        """Tests data consistency across endpoints."""
        client, channel = setup_test_environment

        # Get data through different endpoints
        rest_response = await client.get(
            '/api/v1/benchmarks',
            params={
                'revenue_range': 'REVENUE_RANGE_1M_5M',
                'metric_type': 'METRIC_TYPE_NDR'
            }
        )
        rest_data = rest_response.json()

        stub = BenchmarkServiceStub(channel)
        grpc_response = await stub.GetBenchmarkData(GetBenchmarkRequest(
            revenue_range=RevenueRange.REVENUE_RANGE_1M_5M,
            metric_type=MetricType.METRIC_TYPE_NDR
        ))

        # Verify consistency
        assert len(rest_data['data']) == len(grpc_response.data)
        assert rest_data['statistics']['mean'] == grpc_response.statistics.mean