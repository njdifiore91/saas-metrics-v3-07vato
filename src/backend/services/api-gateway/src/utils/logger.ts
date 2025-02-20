// winston v3.10.0 - Core logging library
import winston from 'winston';
// winston-daily-rotate-file v4.7.1 - Log rotation functionality
import DailyRotateFile from 'winston-daily-rotate-file';
import { logging } from '../config';

// Interface for structured log metadata
interface LogMetadata {
  requestId?: string;
  category?: string;
  serviceName: string;
  context?: Record<string, unknown>;
}

// Custom log levels with numeric priorities
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Logging format configuration
const LOG_FORMAT = {
  timestamp: true,
  colorize: process.env.NODE_ENV === 'development',
  json: process.env.NODE_ENV === 'production',
  metadata: true,
  requestId: true,
  category: true,
  serviceName: 'api-gateway'
};

// File transport configuration for log rotation
const FILE_TRANSPORT_CONFIG = {
  filename: 'logs/api-gateway-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: 'json',
  zippedArchive: true,
  handleExceptions: true
};

/**
 * Sanitizes log data by removing sensitive information and PII
 * @param data - Object containing log data
 * @returns Sanitized log data safe for storage
 */
const sanitizeLogData = (data: Record<string, unknown>): Record<string, unknown> => {
  const sensitiveFields = ['password', 'token', 'secret', 'authorization'];
  const piiFields = ['email', 'phone', 'address', 'ssn'];
  
  const sanitized = JSON.parse(JSON.stringify(data));

  const sanitizeValue = (value: unknown): unknown => {
    if (typeof value === 'string') {
      // Mask email addresses
      if (value.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
        return '***@***.***';
      }
      // Mask phone numbers
      if (value.match(/^\+?[\d\s-]{10,}$/)) {
        return '***-***-****';
      }
    }
    return value;
  };

  const sanitizeObject = (obj: Record<string, unknown>): void => {
    for (const key in obj) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        obj[key] = '********';
      } else if (piiFields.includes(key.toLowerCase())) {
        obj[key] = sanitizeValue(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key] as Record<string, unknown>);
      }
    }
  };

  sanitizeObject(sanitized);
  return sanitized;
};

/**
 * Creates and configures a Winston logger instance with ELK Stack integration
 * @returns Configured Winston logger instance
 */
const createLogger = (): winston.Logger => {
  // Custom format for ELK-compatible logging
  const elkFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillWith: ['requestId', 'category', 'serviceName', 'context'] }),
    winston.format.json()
  );

  // Development format with colors
  const developmentFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, metadata }) => {
      return `${timestamp} [${level}] [${metadata.serviceName}] ${metadata.requestId || '-'} ${metadata.category || 'default'}: ${message}`;
    })
  );

  // Create logger instance
  const logger = winston.createLogger({
    levels: LOG_LEVELS,
    level: logging.level,
    exitOnError: false,
    transports: [
      // Console transport for development
      new winston.transports.Console({
        format: process.env.NODE_ENV === 'development' ? developmentFormat : elkFormat,
        handleExceptions: true
      }),
      // File transport with rotation
      new DailyRotateFile({
        ...FILE_TRANSPORT_CONFIG,
        format: elkFormat
      })
    ]
  });

  // Add error handling for transports
  logger.transports.forEach(transport => {
    transport.on('error', (error) => {
      console.error('Logger transport error:', error);
    });
  });

  return logger;
};

// Create and configure the logger instance
const logger = createLogger();

// Add security event logging method
const securityEvent = (
  message: string,
  metadata: LogMetadata & { severity: 'low' | 'medium' | 'high' }
): void => {
  const sanitizedMetadata = sanitizeLogData(metadata);
  logger.warn(message, {
    ...sanitizedMetadata,
    category: 'security',
    timestamp: new Date().toISOString()
  });
};

// Extend logger with security event method
const extendedLogger = {
  ...logger,
  securityEvent
};

// Export the configured logger
export default extendedLogger;

// Named exports for specific logging methods
export const {
  error,
  warn,
  info,
  debug,
  securityEvent: logSecurityEvent
} = extendedLogger;