/**
 * Error Logger Utility
 * 
 * Provides centralized error logging for the application.
 * In development: logs to console
 * In production: can be extended to send to error tracking service (e.g., Sentry)
 */

interface ErrorContext {
  timestamp: string;
  context: string;
  error: {
    message: string;
    stack?: string;
    name: string;
  } | unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Logs an error with context and metadata
 * 
 * @param context - Description of where/when the error occurred
 * @param error - The error object or unknown value
 * @param metadata - Additional context (user ID, request details, etc.)
 */
export function logError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  const errorData: ErrorContext = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error 
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      : error,
    metadata
  };

  // In development: console.error with formatted output
  if (import.meta.env.DEV) {
    console.error('🔴 API Error:', JSON.stringify(errorData, null, 2));
  } else {
    // In production: log without stack traces (security)
    console.error('API Error:', {
      timestamp: errorData.timestamp,
      context: errorData.context,
      message: error instanceof Error ? error.message : 'Unknown error',
      metadata: errorData.metadata
    });
  }

  // TODO: In production, send to error tracking service
  // Example with Sentry:
  // if (import.meta.env.PROD) {
  //   Sentry.captureException(error, {
  //     contexts: {
  //       custom: errorData
  //     }
  //   });
  // }
}

/**
 * Sanitizes metadata to remove sensitive information
 * Useful before logging user data or request details
 * 
 * @param metadata - Original metadata object
 * @returns Sanitized metadata without sensitive fields
 */
export function sanitizeMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(k => lowerKey.includes(k));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

