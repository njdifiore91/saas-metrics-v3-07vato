# Stage 1: Builder
FROM node:20-alpine AS builder

# Build arguments
ARG NODE_ENV=production
ARG BUILD_VERSION

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    && mkdir -p /app/node_modules && chown -R node:node /app

# Copy package files
COPY --chown=node:node package*.json ./

# Install dependencies including dev dependencies for build
RUN npm ci --include=dev \
    && npm audit fix

# Copy source code and configs
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src/ ./src/

# Build TypeScript code
RUN npm run build \
    && npm prune --production \
    && apk del .build-deps

# Stage 2: Production
FROM node:20-alpine

# Build arguments and environment variables
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV} \
    PORT=50051 \
    NODE_OPTIONS="--max-old-space-size=2048" \
    UV_THREADPOOL_SIZE=4

# Create non-root user/group
RUN addgroup -g 1000 nodegroup && \
    adduser -u 1000 -G nodegroup -s /bin/sh -D nodeuser && \
    mkdir -p /app/node_modules /app/dist /tmp && \
    chown -R nodeuser:nodegroup /app /tmp

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nodeuser:nodegroup /app/node_modules ./node_modules/
COPY --from=builder --chown=nodeuser:nodegroup /app/dist ./dist/
COPY --chown=nodeuser:nodegroup package*.json ./

# Copy healthcheck script
COPY --chown=nodeuser:nodegroup healthcheck.js ./

# Configure security
RUN apk add --no-cache tini && \
    chmod -R 755 /app && \
    chmod 1777 /tmp

# Set resource limits
LABEL maintainer="DevOps Team <devops@company.com>" \
      version="${BUILD_VERSION}" \
      service="metrics"

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node healthcheck.js || exit 1

# Expose gRPC port
EXPOSE 50051

# Set user
USER nodeuser

# Set volume mounts
VOLUME ["/app/node_modules", "/tmp"]

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/app.js"]

# Security hardening
RUN echo "fs.file-max = 1024" > /etc/sysctl.d/99-file-limits.conf && \
    echo "nodeuser soft nofile 1024" >> /etc/security/limits.conf && \
    echo "nodeuser hard nofile 1024" >> /etc/security/limits.conf

# Resource limits
LABEL com.startup-metrics.resource.memory="2Gi" \
      com.startup-metrics.resource.cpu="1000m" \
      com.startup-metrics.resource.fd="1024" \
      com.startup-metrics.resource.pids="512"

# Read-only root filesystem
RUN chmod 444 /app/package.json && \
    chmod 444 /app/package-lock.json && \
    chmod 555 /app/dist

# Security options
LABEL com.startup-metrics.security.no-new-privileges="true" \
      com.startup-metrics.security.read-only-root="true" \
      com.startup-metrics.security.no-control-groups="true"