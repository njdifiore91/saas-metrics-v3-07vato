# Stage 1: Builder stage for Prisma client generation and dependency installation
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Install build dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Copy package files with proper permissions
COPY --chown=node:node package*.json ./

# Install production dependencies with security considerations
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy Prisma schema and migration files
COPY --chown=node:node prisma ./prisma/

# Generate Prisma client with security measures
ENV NODE_ENV=production \
    PRISMA_CLI_BINARY_TARGETS=native,linux-musl
RUN npx prisma generate

# Stage 2: Production stage with minimal footprint
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Create non-root user for security
RUN addgroup -g 1001 -S prisma && \
    adduser -u 1001 -S prisma -G prisma

# Install production-only dependencies
RUN apk add --no-cache \
    libgcc \
    libstdc++ \
    && rm -rf /var/cache/apk/*

# Copy only necessary files from builder
COPY --from=builder --chown=prisma:prisma /usr/src/app/node_modules ./node_modules/
COPY --from=builder --chown=prisma:prisma /usr/src/app/prisma ./prisma/
COPY --chown=prisma:prisma package*.json ./

# Set environment variables
ENV NODE_ENV=production \
    DATABASE_URL="" \
    PRISMA_CLI_QUERY_ENGINE_TYPE=binary \
    PRISMA_CLIENT_ENGINE_TYPE=binary

# Create volume mount points with proper permissions
RUN mkdir -p /usr/src/app/prisma/migrations && \
    chown -R prisma:prisma /usr/src/app/prisma

# Switch to non-root user
USER prisma

# Health check for container status
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD nc -z localhost 4466 || exit 1

# Set volume for migrations and generated client
VOLUME ["/usr/src/app/prisma/migrations", "/usr/src/app/node_modules/.prisma"]

# Default command to run migrations and generate client
CMD ["npx", "prisma", "migrate", "deploy", "--schema=./prisma/schema.prisma"]