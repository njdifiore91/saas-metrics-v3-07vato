# Builder stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with exact versions
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Run security audit
RUN npm audit

# Prune dev dependencies
RUN npm prune --production

# Production stage
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install production dependencies
COPY package*.json ./
RUN npm ci --production --ignore-scripts

# Copy built artifacts from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Configure security headers
ENV NODE_TLS_REJECT_UNAUTHORIZED=1
ENV NPM_CONFIG_AUDIT=true

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set ownership and permissions
RUN chown -R nodejs:nodejs /usr/src/app && \
    chmod -R 755 /usr/src/app

# Set security limits
RUN echo "nodejs soft nofile 65536" >> /etc/security/limits.conf && \
    echo "nodejs hard nofile 65536" >> /etc/security/limits.conf

# Install required system dependencies
RUN apk add --no-cache \
    curl \
    tini

# Set up health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Set resource limits
ENV NODE_OPTIONS="--max-old-space-size=512"

# Expose API port
EXPOSE 3000

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Switch to non-root user
USER nodejs

# Start the application
CMD ["node", "dist/app.js"]