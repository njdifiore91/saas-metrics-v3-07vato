# Build stage
FROM python:3.11-slim AS builder

# Set build labels
LABEL maintainer="DevOps Team" \
      app.name="benchmark-service" \
      app.version="1.0.0" \
      security.profile="production" \
      compliance.gdpr="compliant"

# Set working directory for build
WORKDIR /app

# Copy requirements file
COPY requirements.txt ./

# Install build dependencies and Python packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        python3-dev && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir wheel && \
    pip wheel --no-cache-dir --wheel-dir=/app/packages -r requirements.txt

# Final stage
FROM python:3.11-slim

# Set production labels
LABEL maintainer="DevOps Team" \
      app.name="benchmark-service" \
      app.version="1.0.0" \
      security.profile="production" \
      compliance.gdpr="compliant"

# Create non-root user and group
RUN groupadd -r benchmark && \
    useradd -r -g benchmark -s /bin/false benchmark && \
    mkdir -p /app && \
    chown benchmark:benchmark /app

# Set working directory
WORKDIR /app

# Copy wheels from builder stage
COPY --from=builder /app/packages /app/packages

# Install runtime dependencies and Python packages from wheels
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq5 && \
    pip install --no-cache-dir --no-index --find-links=/app/packages -r requirements.txt && \
    rm -rf /app/packages && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy application code
COPY --chown=benchmark:benchmark src .

# Set environment variables
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PORT=50051 \
    WORKER_CLASS=uvicorn.workers.UvicornWorker \
    WORKERS=4 \
    MAX_REQUESTS=1000 \
    MAX_REQUESTS_JITTER=50 \
    PROMETHEUS_MULTIPROC_DIR=/tmp/benchmark_metrics

# Create directory for Prometheus metrics
RUN mkdir -p /tmp/benchmark_metrics && \
    chown benchmark:benchmark /tmp/benchmark_metrics

# Expose ports for gRPC and HTTP
EXPOSE 50051 8000

# Switch to non-root user
USER benchmark

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Start command
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]