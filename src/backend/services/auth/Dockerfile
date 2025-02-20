# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Set build-time environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512"

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with exact versions and security audit
RUN npm ci --only=production && \
    npm audit fix && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:20-alpine

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=512"

# Install security updates and required packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init curl && \
    addgroup -S nodejs && \
    adduser -S nodejs -G nodejs && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Set resource limits
ENV MEMORY_LIMIT=512m \
    CPU_SHARES=256

# Set security options
ENV NODE_TLS_REJECT_UNAUTHORIZED=1 \
    NODE_NO_WARNINGS=1

# Container metadata
LABEL maintainer="Startup Metrics Platform Team" \
      version="1.0.0" \
      description="Authentication service for Startup Metrics Platform" \
      security.oauth="Google OAuth 2.0" \
      security.jwt="JWT Token Management"

# Expose service port
EXPOSE ${PORT}

# Use dumb-init as PID 1
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the service
CMD ["node", "dist/app.js"]