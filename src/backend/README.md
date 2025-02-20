# Startup Metrics Benchmarking Platform - Backend Services

## Overview

Enterprise-grade microservices architecture for the Startup Metrics Benchmarking Platform, providing secure, scalable, and reliable metric processing and benchmarking capabilities.

## Architecture

### Service Components

- **API Gateway** (Node.js 20, Express)
  - Route management and request validation
  - Authentication and authorization
  - Rate limiting and security middleware
  - Load balancing and service discovery

- **Auth Service** (Node.js 20)
  - Google OAuth 2.0 integration
  - JWT token management
  - Role-based access control
  - Session management with Redis

- **Metrics Service** (Node.js 20, gRPC)
  - Metric calculation and processing
  - Time-series data management
  - Real-time aggregation
  - Cache management

- **Benchmark Service** (Python 3.11)
  - Statistical analysis
  - Data normalization
  - Industry comparison
  - Revenue-based filtering

### Data Storage

- **PostgreSQL 14**
  - Primary data store
  - Multi-AZ deployment
  - Point-in-time recovery
  - WAL archiving

- **Redis 7**
  - Session management
  - Rate limiting
  - Cache layer
  - Real-time data

## Development Setup

### Prerequisites

```bash
node >= 20.0.0
npm >= 9.0.0
python >= 3.11
docker >= 24.0
docker-compose >= 2.0
```

### Environment Setup

1. Clone the repository and install dependencies:
```bash
npm install
npm run bootstrap
```

2. Generate Protocol Buffers:
```bash
npm run proto:generate
```

3. Start development environment:
```bash
docker-compose up -d
npm run dev
```

### Service Configuration

Each service requires specific environment variables. Create `.env` files in respective service directories:

#### API Gateway (.env)
```
NODE_ENV=development
PORT=3000
AUTH_SERVICE_URL=auth:3000
METRICS_SERVICE_URL=metrics:50051
BENCHMARK_SERVICE_URL=benchmark:50051
REDIS_URL=redis://redis:6379
```

#### Auth Service (.env)
```
NODE_ENV=development
PORT=3000
POSTGRES_URL=postgres://user:password@postgres:5432/startup_metrics
REDIS_URL=redis://redis:6379
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_jwt_secret
```

#### Metrics Service (.env)
```
NODE_ENV=development
PORT=50051
POSTGRES_URL=postgres://user:password@postgres:5432/startup_metrics
REDIS_URL=redis://redis:6379
UV_THREADPOOL_SIZE=4
```

#### Benchmark Service (.env)
```
PYTHONPATH=/app
PYTHONUNBUFFERED=1
PORT=50051
POSTGRES_URL=postgres://user:password@postgres:5432/startup_metrics
PROMETHEUS_MULTIPROC_DIR=/tmp/benchmark_metrics
WORKERS=4
```

## Testing

Run comprehensive test suite:
```bash
npm test                 # Run all tests
npm run test:coverage   # Run tests with coverage
```

## Deployment

### Production Requirements

- AWS ECS Fargate for container orchestration
- AWS RDS for PostgreSQL (Multi-AZ)
- AWS ElastiCache for Redis (Cluster Mode)
- AWS CloudWatch for monitoring
- AWS WAF for security

### Deployment Process

1. Build production images:
```bash
docker-compose -f docker-compose.prod.yml build
```

2. Push to container registry:
```bash
docker-compose -f docker-compose.prod.yml push
```

3. Deploy to ECS:
```bash
aws ecs update-service --cluster startup-metrics --service $SERVICE_NAME --force-new-deployment
```

## Monitoring

### Health Checks

- API Gateway: `GET /health`
- Auth Service: `GET /health`
- Metrics Service: `gRPC Health Check`
- Benchmark Service: `GET /health`

### Metrics Collection

- Prometheus metrics exposed on `/metrics`
- Custom business metrics
- Resource utilization metrics
- Request/Response timing

### Logging

Structured logging with Winston:
- Log rotation
- JSON format
- Correlation IDs
- Error tracking

## Security

### Authentication

- Google OAuth 2.0
- JWT with short expiry
- Refresh token rotation
- CSRF protection

### Authorization

- Role-based access control
- Resource-level permissions
- API key management
- Rate limiting

### Data Protection

- TLS 1.3 encryption
- Field-level encryption
- Data masking
- Audit logging

## Performance

### Caching Strategy

- Redis for session data
- Local memory cache
- Cache invalidation
- Cache warming

### Optimization

- Connection pooling
- Query optimization
- Batch processing
- Resource limits

## Documentation

- API Documentation: `/docs/api`
- Architecture: `/docs/architecture`
- Deployment Guide: `/docs/deployment`
- Security Guidelines: `/docs/security`

## License

Proprietary - All rights reserved