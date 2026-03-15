/**
 * Logger utility for consistent logging across the application
 *
 * Provides structured logging with different levels and optional metadata.
 * In production, debug logs are automatically filtered out.
 * Errors are automatically sent to Sentry when configured.
 */

import * as Sentry from '@sentry/react';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
    [key: string]: unknown;
}

const isDevelopment = Boolean(
    import.meta.env.DEV || import.meta.env.MODE === 'development',
);
const isProduction = Boolean(
    import.meta.env.PROD || import.meta.env.MODE === 'production',
);

/**
 * Check if Sentry is configured and available
 */
function isSentryAvailable(): boolean {
    return typeof window !== 'undefined' && !!import.meta.env.VITE_SENTRY_DSN;
}

/**
 * Check if debug logging is enabled
 */
function isDebugEnabled(): boolean {
    return Boolean(isDevelopment);
}

/**
 * Format log message with metadata
 */
function formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
    const prefix = `[${level.toUpperCase()}]`;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${prefix} ${message}${metaStr}`;
}

/**
 * Logger utility with different log levels
 */
export const logger = {
    /**
     * Debug logs - only shown in development
     */
    debug: (message: string, meta?: LogMeta): void => {
        if (!isDebugEnabled()) return;
        // eslint-disable-next-line no-console
        console.debug(formatMessage('debug', message, meta));
    },

    /**
     * Info logs - general information
     */
    info: (message: string, meta?: LogMeta): void => {
        if (!isDevelopment) return; // Only log info in development
        // eslint-disable-next-line no-console
        console.info(formatMessage('info', message, meta));
    },

    /**
     * Warning logs - non-critical issues
     * Optionally sends to Sentry in production when configured (for important warnings)
     */
    warn: (message: string, meta?: LogMeta): void => {
        console.warn(formatMessage('warn', message, meta));

        // Optionally send important warnings to Sentry in production
        // Only if meta indicates it's important (e.g., meta.important === true)
        if (isProduction && isSentryAvailable() && meta?.important === true) {
            Sentry.captureMessage(message, {
                level: 'warning',
                tags: {
                    logger: 'utils/logger',
                },
                extra: meta,
            });
        }
    },

    /**
     * Error logs - errors that need attention
     * Automatically sends to Sentry in production when configured
     */
    error: (message: string, error?: Error | unknown, meta?: LogMeta): void => {
        const errorInfo =
            error instanceof Error
                ? { error: error.message, stack: error.stack }
                : error
                  ? { error: String(error) }
                  : {};

        const fullMeta = { ...errorInfo, ...meta };
        console.error(formatMessage('error', message, fullMeta));

        // Send to Sentry in production when configured
        if (isProduction && isSentryAvailable()) {
            if (error instanceof Error) {
                // Capture exception with context
                Sentry.captureException(error, {
                    level: 'error',
                    tags: {
                        logger: 'utils/logger',
                    },
                    extra: {
                        message,
                        ...meta,
                    },
                });
            } else if (error) {
                // Capture message for non-Error objects
                Sentry.captureMessage(message, {
                    level: 'error',
                    tags: {
                        logger: 'utils/logger',
                    },
                    extra: {
                        error: String(error),
                        ...meta,
                    },
                });
            } else {
                // Capture message only
                Sentry.captureMessage(message, {
                    level: 'error',
                    tags: {
                        logger: 'utils/logger',
                    },
                    extra: meta,
                });
            }
        }
    },
};
