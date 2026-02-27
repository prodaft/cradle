/**
 * API Error Handler and Response Utilities
 *
 * Utilities for parsing and handling RFC 9457 compliant API errors.
 * All functions are explicit and require manual invocation.
 */

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
 * @param error - Error object: { response, error? } from openapi-fetch throw,
 *   parsed body from openapi-react-query ($api.useMutation throws it directly),
 *   or axios-style { response } (body may be consumed)
 * @returns Parsed error object
 */
export async function parseAPIError(error: any): Promise<ParsedAPIError> {
    // openapi-react-query throws the parsed body directly (no .response)
    const isRfc9457Body =
        error &&
        typeof error === 'object' &&
        !error.response &&
        (typeof error.detail === 'string' || typeof error.code === 'string');
    if (isRfc9457Body) {
        const data = error as APIErrorResponse;
        return {
            code: data.code || 'UNKNOWN_ERROR',
            detail: data.detail || 'An error occurred',
            status: data.status ?? 500,
            title: data.title || 'Error',
            type: data.type,
            instance: data.instance || 'unknown',
            timestamp: data.timestamp || new Date().toISOString(),
            isValidationError: data.code === 'VALIDATION_ERROR',
            fieldErrors: data.errors || {},
            raw: data,
        };
    }

    // Network error (no response from server)
    if (!error.response) {
        if (error instanceof TypeError) {
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
        }
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

    let data: APIErrorResponse = {
        status: error.response?.status ?? 500,
    };
    // openapi-fetch returns pre-parsed body in error.error; use it when available
    const preParsed = error.error;
    if (preParsed && typeof preParsed === 'object') {
        data = {
            ...data,
            ...preParsed,
            status: preParsed.status ?? data.status,
        };
    } else {
        try {
            data = (await error.response.json()) || data;
        } catch {
            // Response body empty, not JSON, or already consumed by openapi-fetch
        }
    }

    return {
        code: data.code || 'UNKNOWN_ERROR',
        detail: data.detail || 'An error occurred',
        status: data.status ?? error.response?.status ?? 500,
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
 * Extract success message from API response (RFC 9457-aligned: "detail").
 */
export function getSuccessMessage(data: any): string | undefined {
    if (!data || typeof data !== 'object') return undefined;
    return data.detail;
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
