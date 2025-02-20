import { Server, ServerCredentials, status as grpcStatus } from '@grpc/grpc-js'; // ^1.9.0
import { loadPackageDefinition } from '@grpc/proto-loader'; // ^0.7.0
import { createLogger, format, transports } from 'winston'; // ^3.10.0
import { Container } from 'inversify'; // ^6.0.1
import { register, collectDefaultMetrics, Gauge } from 'prom-client'; // ^14.2.0
import { join } from 'path';
import { config } from './config';
import { MetricsController } from './controllers/metrics.controller';
import { prisma, checkDatabaseHealth, disconnectPrisma } from '../../database/src/client';

// Initialize logger
const logger = createLogger({
    level: config.logging.level,
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new transports.Console()
    ]
});

// Initialize metrics
const serverMetrics = {
    activeConnections: new Gauge({
        name: 'metrics_service_active_connections',
        help: 'Number of active gRPC connections'
    }),
    requestDuration: new Gauge({
        name: 'metrics_service_request_duration_seconds',
        help: 'Duration of gRPC requests',
        labelNames: ['method']
    })
};

// Initialize dependency injection container
const container = new Container();
container.bind(MetricsController).toSelf();

class MetricsServer {
    private readonly server: Server;
    private readonly protoPath: string;
    private isShuttingDown: boolean = false;

    constructor() {
        this.server = new Server({
            'grpc.max_concurrent_streams': 1000,
            'grpc.keepalive_time_ms': 30000,
            'grpc.keepalive_timeout_ms': 10000
        });
        this.protoPath = join(__dirname, '../proto/metrics.proto');
    }

    public async start(): Promise<void> {
        try {
            // Load protobuf definition
            const packageDefinition = await loadPackageDefinition(this.protoPath);
            if (!packageDefinition) {
                throw new Error('Failed to load protobuf definition');
            }

            // Initialize metrics collection
            collectDefaultMetrics();

            // Add health check service
            this.server.addService(packageDefinition.HealthService.service, {
                check: async (call, callback) => {
                    const isHealthy = await this.performHealthCheck();
                    callback(null, { status: isHealthy ? 'SERVING' : 'NOT_SERVING' });
                }
            });

            // Add metrics service implementation
            const metricsController = container.get(MetricsController);
            this.server.addService(packageDefinition.MetricsService.service, {
                createMetric: this.wrapWithMetrics(metricsController.createMetric.bind(metricsController)),
                getMetrics: this.wrapWithMetrics(metricsController.getMetrics.bind(metricsController)),
                calculateMetric: this.wrapWithMetrics(metricsController.calculateMetric.bind(metricsController)),
                validateMetric: this.wrapWithMetrics(metricsController.validateMetric.bind(metricsController))
            });

            // Start server
            await new Promise<void>((resolve, reject) => {
                this.server.bindAsync(
                    `0.0.0.0:${config.app.port}`,
                    ServerCredentials.createInsecure(),
                    (error, port) => {
                        if (error) {
                            reject(error);
                            return;
                        }
                        this.server.start();
                        resolve();
                    }
                );
            });

            // Register signal handlers
            this.registerSignalHandlers();

            logger.info(`Metrics gRPC server started on port ${config.app.port}`, {
                environment: config.app.env,
                version: config.app.serviceVersion
            });
        } catch (error) {
            logger.error('Failed to start metrics server', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }

    private wrapWithMetrics(handler: Function): Function {
        return async (call: any, callback: any) => {
            const startTime = process.hrtime();
            serverMetrics.activeConnections.inc();

            try {
                const result = await handler(call.request);
                const [seconds, nanoseconds] = process.hrtime(startTime);
                const duration = seconds + nanoseconds / 1e9;
                
                serverMetrics.requestDuration
                    .labels(call.handler.path)
                    .set(duration);

                callback(null, result);
            } catch (error) {
                logger.error('Request handler error', {
                    method: call.handler.path,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                callback({
                    code: error.code || grpcStatus.INTERNAL,
                    message: error.message || 'Internal server error'
                });
            } finally {
                serverMetrics.activeConnections.dec();
            }
        };
    }

    private async performHealthCheck(): Promise<boolean> {
        try {
            const isDatabaseHealthy = await checkDatabaseHealth();
            const isServerHealthy = !this.isShuttingDown;
            
            return isDatabaseHealthy && isServerHealthy;
        } catch (error) {
            logger.error('Health check failed', { error });
            return false;
        }
    }

    private registerSignalHandlers(): void {
        const signals = ['SIGTERM', 'SIGINT'];
        signals.forEach(signal => {
            process.on(signal, async () => {
                await this.gracefulShutdown();
            });
        });
    }

    private async gracefulShutdown(): Promise<void> {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;

        logger.info('Starting graceful shutdown');

        try {
            // Stop accepting new requests
            this.server.tryShutdown(async () => {
                try {
                    // Wait for existing requests to complete
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    // Cleanup resources
                    await disconnectPrisma();
                    register.clear();

                    logger.info('Graceful shutdown completed');
                    process.exit(0);
                } catch (error) {
                    logger.error('Error during cleanup', { error });
                    process.exit(1);
                }
            });
        } catch (error) {
            logger.error('Error during shutdown', { error });
            process.exit(1);
        }
    }
}

// Start server
const server = new MetricsServer();
server.start().catch(error => {
    logger.error('Fatal error starting server', { error });
    process.exit(1);
});

export { MetricsServer };