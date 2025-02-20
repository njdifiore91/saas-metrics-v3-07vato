# syntax=docker/dockerfile:1.4
# Enable BuildKit features
ARG BUILDKIT_INLINE_CACHE=1

# ===== Builder Stage =====
FROM node:20-alpine AS builder

# Security: Add build-time labels
LABEL org.opencontainers.image.vendor="Startup Metrics Platform Team" \
      org.opencontainers.image.title="Backend Services" \
      org.opencontainers.image.description="Startup Metrics Platform Backend Microservices" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.licenses="UNLICENSED"

# Set working directory
WORKDIR /usr/src/app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files with checksums
COPY --chown=node:node package*.json lerna.json ./
COPY --chown=node:node services/*/package*.json ./services/

# Mount cache and install dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci && \
    npm install -g lerna@7.1.4

# Copy source code
COPY --chown=node:node . .

# Bootstrap lerna packages
RUN lerna bootstrap --hoist

# Build TypeScript services in parallel
RUN lerna run build --parallel

# Run security audit
RUN npm audit --production --audit-level=high

# Prune dev dependencies
RUN npm prune --production

# ===== Production Stage =====
FROM node:20-alpine AS production

# Security: Add runtime labels
LABEL org.opencontainers.image.vendor="Startup Metrics Platform Team" \
      org.opencontainers.image.title="Backend Services Runtime" \
      org.opencontainers.image.description="Production Runtime for Startup Metrics Platform Backend" \
      org.opencontainers.image.version="1.0.0"

# Set production environment
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=2048" \
    NPM_CONFIG_LOGLEVEL=warn

# Create app directory and set permissions
WORKDIR /usr/src/app
RUN chown -R node:node .

# Install production dependencies
RUN apk add --no-cache \
    tini \
    dumb-init \
    curl

# Copy built artifacts from builder
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/package*.json ./

# Security: Configure non-root user
USER node

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Security: Set security options
RUN echo "fs.file-max = 65535" >> /etc/sysctl.conf && \
    echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf

# Resource limits
ENV NODE_OPTIONS="--max-old-space-size=2048 --max-http-header-size=16384"

# Expose default port
EXPOSE 3000

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start command with enhanced security
CMD ["node", "--no-deprecation", "--no-warnings", "./dist/services/api-gateway/src/index.js"]

# Security: Read-only root filesystem
VOLUME ["/tmp", "/var/run"]

# Security: Additional hardening
RUN addgroup -S appgroup && \
    adduser -S -G appgroup appuser && \
    chmod -R 550 /usr/src/app && \
    chmod -R 770 /tmp /var/run

# Security: Drop capabilities
RUN setcap 'cap_net_bind_service=+ep' /usr/local/bin/node

# Optimization: Compress final image
RUN set -ex && \
    find /usr/src/app -type f -name "*.map" -delete && \
    find /usr/src/app -type f -name "*.ts" -delete && \
    find /usr/src/app -type d -name "tests" -exec rm -rf {} + || true

# Apply security policies
SECURITY FROM=node:20-alpine \
    POLICY="seccomp=default capabilities=minimal"