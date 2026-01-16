/**
 * API Error Handler and Response Utilities
 *
 * Utilities for parsing and handling RFC 9457 compliant API errors.
 * All functions are explicit and require manual invocation.
 */

import { FetchError } from '@/services/cradle/runtime';
import { toast } from 'sonner';

/**
 * Parsed API error structure
 */
export interface ParsedAPIError {
    code: string;
    detail: string;
    status: number;
    title: string;
    type?: string;
    instance: string;
    timestamp: string;
    isValidationError: boolean;
    fieldErrors: Record<string, string[]>;
    raw: any;
}

/**
 * API error response structure
 */
interface APIErrorResponse {
    code?: string;
    detail?: string;
    status: number;
    title?: string;
    type?: string;
    instance?: string;
    timestamp?: string;
    errors?: Record<string, string[]>;
}

/**
 * Parse RFC 9457 error response into structured format
 *
 * @param error - Error object with response
 * @returns Parsed error object
 */
export async function parseAPIError(error: any): Promise<ParsedAPIError> {
    // Network error (no response from server)
    if (!error.response) {
        if (error instanceof FetchError) {
            return {
                code: 'NETWORK_ERROR',
                detail: 'Unable to connect to the server. Please check your connection.',
                status: 0,
                title: 'Network Error',
                instance: 'unknown',
                timestamp: new Date().toISOString(),
                isValidationError: false,
                fieldErrors: {},
                raw: error,
            };
        } else {
            console.log(error);
            return {
                code: 'UNKNOWN_ERROR',
                detail: 'An unknown error occurred',
                status: 0,
                title: 'Unknown Error',
                instance: 'unknown',
                timestamp: new Date().toISOString(),
                isValidationError: false,
                fieldErrors: {},
                raw: error,
            };
        }
    }

    const data: APIErrorResponse = (await error.response.json()) || {};

    return {
        code: data.code || 'UNKNOWN_ERROR',
        detail: data.detail || 'An error occurred',
        status: data.status,
        title: data.title || 'Error',
        type: data.type,
        instance: data.instance || error.config?.url || 'unknown',
        timestamp: data.timestamp || new Date().toISOString(),
        isValidationError: data.code === 'VALIDATION_ERROR',
        fieldErrors: data.errors || {},
        raw: data,
    };
}

/**
 * Options for handling API errors
 */
export interface HandleAPIErrorOptions {
    message?: string;
    duration?: number;
    notifyValidation?: boolean;
}

/**
 * Simple helper to show error notification
 *
 * @param parsed - Parsed error object
 * @param notify - Notification function from useNotif
 * @param options - Options for notification
 * @returns Parsed error object
 */
export function handleAPIError(
    parsed: ParsedAPIError,
    options: HandleAPIErrorOptions = {},
): ParsedAPIError {
    if (parsed.isValidationError && !options.notifyValidation) {
        return parsed;
    }

    toast.error(options.message || parsed.detail, {
        duration: options.duration || 5000,
    });

    return parsed;
}

/**
 * Check if error matches a specific error code
 *
 * @param parsed - Parsed error object
 * @param code - Error code to check
 * @returns True if the error code matches
 */
export function isErrorCode(parsed: ParsedAPIError, code: string): boolean {
    return parsed.code === code;
}

/**
 * Get field-level validation errors from error response
 *
 * @param parsed - Parsed error object
 * @returns Field errors object
 */
export function getFieldErrors(parsed: ParsedAPIError): Record<string, string[]> {
    return parsed.fieldErrors;
}

/**
 * Get error message from error response
 *
 * @param parsed - Parsed error object
 * @param fallback - Fallback message if none found
 * @returns Error message
 */
export function getErrorMessage(
    parsed: ParsedAPIError,
    fallback: string = 'An error occurred',
): string {
    return parsed.detail || fallback;
}

/**
 * Check if error is a validation error
 *
 * @param parsed - Parsed error object
 * @returns True if the error is a validation error
 */
export function isValidationError(parsed: ParsedAPIError): boolean {
    return parsed.isValidationError;
}

/**
 * Get error status code
 *
 * @param parsed - Parsed error object
 * @returns HTTP status code
 */
export function getErrorStatus(parsed: ParsedAPIError): number {
    return parsed.status;
}

// ============================================================================
// Legacy Response Utils (to be phased out)
// ============================================================================
