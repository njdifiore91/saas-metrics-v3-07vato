import { PrismaClient } from '@prisma/client'; // v5.2.0
import pino from 'pino'; // v8.15.0

// Global singleton instance
let prismaInstance: PrismaClient | null = null;

// Configure logger
const logger = pino({ 
    name: 'database-client', 
    level: 'info',
    timestamp: true
});

// Connection pool configuration
const POOL_CONFIG = {
    max_connections: 20,
    connection_timeout: 30000, // 30 seconds
    idle_timeout: 60000 // 1 minute
};

// Prisma client options
const PRISMA_OPTIONS = {
    log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' }
    ],
    datasources: {
        db: {
            pooling: {
                max: POOL_CONFIG.max_connections,
                connectionTimeout: POOL_CONFIG.connection_timeout,
                idleTimeout: POOL_CONFIG.idle_timeout
            }
        }
    }
};

/**
 * Returns a singleton instance of PrismaClient with connection pooling
 * and enhanced error handling.
 */
function getPrismaClient(): PrismaClient {
    if (prismaInstance) {
        return prismaInstance;
    }

    try {
        prismaInstance = new PrismaClient(PRISMA_OPTIONS);

        // Configure event listeners
        prismaInstance.$on('query', (e) => {
            logger.debug({
                query: e.query,
                duration: e.duration,
                timestamp: e.timestamp
            }, 'Query executed');
        });

        prismaInstance.$on('error', (e) => {
            logger.error({
                error: e.message,
                timestamp: e.timestamp
            }, 'Database error occurred');
        });

        // Initialize connection
        prismaInstance.$connect()
            .then(() => {
                logger.info({
                    poolConfig: POOL_CONFIG
                }, 'Database client initialized successfully');
            })
            .catch((error) => {
                logger.error({
                    error: error.message
                }, 'Failed to initialize database client');
                throw error;
            });

        return prismaInstance;
    } catch (error) {
        logger.fatal({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Critical error initializing database client');
        throw error;
    }
}

/**
 * Safely disconnects the Prisma client with graceful shutdown handling.
 */
async function disconnectPrisma(): Promise<void> {
    if (!prismaInstance) {
        logger.warn('No active database connection to disconnect');
        return;
    }

    try {
        // Set disconnect timeout
        const disconnectTimeout = setTimeout(() => {
            logger.error('Database disconnect timeout exceeded');
            process.exit(1);
        }, 10000); // 10 second timeout

        await prismaInstance.$disconnect();
        clearTimeout(disconnectTimeout);
        
        prismaInstance = null;
        logger.info('Database client disconnected successfully');
    } catch (error) {
        logger.error({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Error disconnecting database client');
        throw error;
    }
}

/**
 * Performs health check on database connection.
 * @returns Promise<boolean> indicating connection health status
 */
async function checkDatabaseHealth(): Promise<boolean> {
    if (!prismaInstance) {
        logger.warn('No database client instance available for health check');
        return false;
    }

    try {
        // Execute simple query to verify connection
        await prismaInstance.$queryRaw`SELECT 1`;
        
        // Check replica lag if applicable
        const replicaLag = await prismaInstance.$queryRaw`
            SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp()))::INT as lag
        `;
        
        const lag = (replicaLag as any)[0]?.lag || 0;
        const isHealthy = lag < 300; // Consider unhealthy if replica lag > 5 minutes

        logger.info({
            replicaLag: lag,
            isHealthy
        }, 'Database health check completed');

        return isHealthy;
    } catch (error) {
        logger.error({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Database health check failed');
        return false;
    }
}

// Initialize singleton instance
const prisma = getPrismaClient();

// Export client and utility functions
export {
    prisma,
    disconnectPrisma,
    checkDatabaseHealth
};

// Export specific client models for type safety
export const company = prisma.company;
export const user = prisma.user;
export const metric = prisma.metric;
export const companyMetric = prisma.companyMetric;