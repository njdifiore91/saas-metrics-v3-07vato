# Benchmark Service

A high-performance Python-based service for benchmark data aggregation, analysis, and comparison with comprehensive statistical capabilities and enterprise-grade features.

## Overview

The Benchmark Service is a core component of the Startup Metrics Platform that provides:
- Multi-source benchmark data integration and aggregation
- Revenue-based filtering and peer group analysis
- Advanced statistical analysis and outlier detection
- Real-time metric comparison and ranking
- Comprehensive data validation and transformation

## Features

- **Data Processing**
  - Multi-source benchmark integration
  - Automated outlier detection and handling
  - Advanced statistical analysis
  - Time-series trend analysis
  - Configurable data validation rules

- **API Endpoints**
  - REST and gRPC interfaces
  - Comprehensive benchmark data retrieval
  - Real-time ranking calculations
  - Time-series data analysis
  - Statistical aggregations

- **Performance**
  - Intelligent caching system
  - Horizontal scaling support
  - Circuit breaker implementation
  - Request rate limiting
  - Performance monitoring

## Prerequisites

- Python 3.11+
- Docker 24.0+
- PostgreSQL 14+
- Redis 7.0+

## Installation

Using Poetry (recommended):
```bash
poetry install
```

Using pip:
```bash
pip install -r requirements.txt
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure environment variables:
```env
ENV=development
DEBUG=True
LOG_LEVEL=INFO
DB_PASSWORD=your_secure_password
```

## Development

1. Start the development server:
```bash
poetry run uvicorn src.app:app --reload
# or
uvicorn src.app:app --reload
```

2. Run tests:
```bash
poetry run pytest
# or
python -m pytest
```

## API Documentation

### REST Endpoints

- `GET /api/v1/benchmarks`
  - Retrieves benchmark data with filtering
  - Supports revenue range and metric type filters
  - Optional statistical analysis

- `POST /api/v1/benchmarks/ranking`
  - Calculates percentile ranking
  - Provides peer comparison
  - Returns comprehensive statistics

### gRPC Services

- `BenchmarkService`
  - `GetBenchmarkData`: Retrieves filtered benchmark data
  - `GetTimeSeriesData`: Provides time-series analysis
  - `CalculateRanking`: Computes percentile rankings

## Deployment

### Docker

```bash
docker build -t benchmark-service .
docker run -p 8000:8000 benchmark-service
```

### Kubernetes

```bash
kubectl apply -f k8s/
```

## Monitoring

- Prometheus metrics at `/metrics`
- Grafana dashboards for visualization
- ELK stack integration for logging
- Jaeger for distributed tracing

## Security

- OAuth 2.0 authentication
- Role-based access control
- Rate limiting
- Input validation
- Data encryption

## Dependencies

Core dependencies:
- FastAPI v0.100.0
- gRPC v1.56.0
- NumPy v1.24.0
- Pandas v2.0.0
- SQLAlchemy v2.0.0
- Prometheus Client v0.17.0

Development dependencies:
- pytest v7.4.0
- black v23.7.0
- mypy v1.4.0
- flake8 v6.0.0

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## License

Copyright © 2023 Startup Metrics Platform Team