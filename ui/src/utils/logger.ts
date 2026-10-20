/**
 * Logger utility for consistent logging across the application
 *
 * Provides structured logging with different levels and optional metadata.
 * Debug and info only run in development; warn/error always hit the console.
 * In production with a DSN, errors (and warnings with meta.important) are forwarded to Sentry.
 */

import * as Sentry from '@sentry/tanstackstart-react';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
    [key: string]: unknown;
}

const isDevelopment = import.meta.env.DEV;
const sentryLoggerTags = { logger: 'utils/logger' } as const;
const sentryLoggerError = {
    level: 'error' as const,
    tags: sentryLoggerTags,
};
const sentryLoggerWarning = {
    level: 'warning' as const,
    tags: sentryLoggerTags,
};

function shouldForwardLoggerToSentry(): boolean {
    if (typeof window === 'undefined' || !import.meta.env.VITE_SENTRY_DSN) return false;
    return import.meta.env.PROD;
}

/**
 * Format log message with metadata
 */
function formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
    const prefix = `[${level.toUpperCase()}]`;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${prefix} ${message}${metaStr}`;
}

function logInDevelopment(
    level: 'debug' | 'info',
    message: string,
    meta?: LogMeta,
): void {
    if (!isDevelopment) return;
    const out = formatMessage(level, message, meta);
    if (level === 'debug') {
        // eslint-disable-next-line no-console
        console.debug(out);
        return;
    }
    // eslint-disable-next-line no-console
    console.info(out);
}

/**
 * Logger utility with different log levels
 */
export const logger = {
    /**
     * Debug logs - only shown in development
     */
    debug: (message: string, meta?: LogMeta): void =>
        logInDevelopment('debug', message, meta),

    /**
     * Info logs - general information
     */
    info: (message: string, meta?: LogMeta): void =>
        logInDevelopment('info', message, meta),

    /**
     * Warning logs - non-critical issues
     * Optionally sends to Sentry in production when configured (for important warnings)
     */
    warn: (message: string, meta?: LogMeta): void => {
        console.warn(formatMessage('warn', message, meta));

        if (shouldForwardLoggerToSentry() && meta?.important === true) {
            Sentry.captureMessage(message, {
                ...sentryLoggerWarning,
                extra: meta,
            });
        }
    },

    /**
     * Error logs - errors that need attention
     * Automatically sends to Sentry in production when configured
     */
    error: (message: string, error?: Error | unknown, meta?: LogMeta): void => {
        const asError = error instanceof Error ? error : undefined;
        const errorInfo =
            asError !== undefined
                ? { error: asError.message, stack: asError.stack }
                : error
                  ? { error: String(error) }
                  : {};

        const fullMeta = { ...errorInfo, ...meta };
        console.error(formatMessage('error', message, fullMeta));

        if (!shouldForwardLoggerToSentry()) return;

        if (asError !== undefined) {
            Sentry.captureException(asError, {
                ...sentryLoggerError,
                extra: { message, ...meta },
            });
            return;
        }
        if (error) {
            Sentry.captureMessage(message, {
                ...sentryLoggerError,
                extra: { error: String(error), ...meta },
            });
            return;
        }
        Sentry.captureMessage(message, {
            ...sentryLoggerError,
            extra: meta,
        });
    },
};
