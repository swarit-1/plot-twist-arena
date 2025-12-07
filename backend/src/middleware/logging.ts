/**
 * Structured logging middleware with correlation IDs
 */
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Add uuid to dependencies if needed
// For now, simple implementation without uuid

export interface LogContext {
  correlationId: string;
  method: string;
  url: string;
  timestamp: string;
  userId?: string;
}

class Logger {
  private context: LogContext | null = null;

  setContext(context: LogContext) {
    this.context = context;
  }

  private log(level: string, message: string, data?: any) {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...data
    };

    console.log(JSON.stringify(logEntry));
  }

  info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }

  error(message: string, error?: any) {
    this.log('ERROR', message, {
      error: error?.message || error,
      stack: error?.stack
    });
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      this.log('DEBUG', message, data);
    }
  }
}

export const logger = new Logger();

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Generate correlation ID
  const correlationId = req.headers['x-correlation-id'] as string || generateId();

  // Set correlation ID in response headers
  res.setHeader('X-Correlation-ID', correlationId);

  // Create log context
  const context: LogContext = {
    correlationId,
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  };

  logger.setContext(context);

  // Log request
  logger.info('Incoming request', {
    headers: req.headers,
    query: req.query,
    body: sanitizeBody(req.body)
  });

  // Log response
  const originalSend = res.send;
  res.send = function (data): Response {
    logger.info('Outgoing response', {
      statusCode: res.statusCode,
      responseTime: Date.now() - parseInt(context.timestamp)
    });

    return originalSend.call(this, data);
  };

  next();
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function sanitizeBody(body: any): any {
  if (!body) return body;

  // Remove sensitive fields
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret'];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
