# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Add non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install dependencies first for better caching
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source code and configuration
COPY . .

# Set build arguments
ARG API_URL
ARG APP_VERSION

# Set environment variables for build
ENV NODE_ENV=production \
    VITE_API_URL=${API_URL} \
    VITE_APP_VERSION=${APP_VERSION}

# Build application
RUN npm run build

# Production stage
FROM nginx:1.25-alpine

# Add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-security-headers.conf /etc/nginx/security-headers.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create cache directory and set permissions
RUN mkdir -p /var/cache/nginx && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chmod -R 755 /var/cache/nginx

# Configure security
RUN chmod -R 755 /usr/share/nginx/html && \
    chown -R appuser:appgroup /usr/share/nginx/html

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/health || exit 1

# Expose port
EXPOSE 80

# Set user
USER appuser

# Add metadata labels
LABEL maintainer="Startup Metrics Platform Team" \
      version=${APP_VERSION} \
      description="Web frontend for Startup Metrics Benchmarking Platform" \
      security.scan-date=${BUILD_DATE}

# Drop capabilities and set security options
RUN apk add --no-cache libcap && \
    setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx && \
    apk del libcap

# Configure tmpfs volume for nginx cache
VOLUME ["/var/cache/nginx"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]