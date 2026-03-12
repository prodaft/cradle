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
interface ParsedAPIError {
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
 * API error response structure.
 * DRF validation errors can be nested: {"field": {"nested": ["error"]}}
 */
interface APIErrorResponse {
    code?: string;
    detail?: string;
    status?: number;
    title?: string;
    type?: string;
    instance?: string;
    timestamp?: string;
    errors?: Record<string, unknown>;
}

/**
 * Parse RFC 9457 error response into structured format
 *
 * @param error - Error object: { response, error? } from openapi-fetch throw,
 *   parsed body from openapi-react-query ($api.useMutation throws it directly),
 *   or axios-style { response } (body may be consumed)
 * @returns Parsed error object
 */
function isRfc9457Error(obj: unknown): obj is APIErrorResponse {
    if (!obj || typeof obj !== 'object') return false;
    const o = obj as Record<string, unknown>;
    return (
        !o.response &&
        typeof (o.status ?? o.detail ?? o.code) !== 'undefined' &&
        (typeof o.detail === 'string' || typeof o.code === 'string')
    );
}

export async function parseAPIError(error: any): Promise<ParsedAPIError> {
    // openapi-react-query throws the parsed body directly (no .response)
    if (isRfc9457Error(error)) {
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
            fieldErrors: flattenFieldErrors(data.errors),
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
        fieldErrors: flattenFieldErrors(data.errors),
        raw: data,
    };
}

/** Flatten DRF nested validation errors to Record<string, string[]> */
function flattenFieldErrors(errors: unknown): Record<string, string[]> {
    if (!errors || typeof errors !== 'object') return {};
    const out: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(errors)) {
        if (Array.isArray(val) && val.every((v) => typeof v === 'string')) {
            out[key] = val as string[];
        } else if (Array.isArray(val)) {
            val.forEach((item, i) => {
                if (item && typeof item === 'object') {
                    const nested = flattenFieldErrors(item);
                    for (const [k, v] of Object.entries(nested)) {
                        out[`${key}.${i}.${k}`] = v;
                    }
                }
            });
        } else if (val && typeof val === 'object') {
            const nested = flattenFieldErrors(val);
            for (const [k, v] of Object.entries(nested)) {
                out[`${key}.${k}`] = v;
            }
        }
    }
    return out;
}

/**
 * Get the best display message for an error, including field-level errors when present.
 * Use this for validation errors (e.g. filter params) to show actionable feedback.
 */
export function getDisplayMessage(parsed: ParsedAPIError): string {
    const fieldParts = Object.entries(parsed.fieldErrors)
        .filter(([, msgs]) => Array.isArray(msgs) && msgs.length > 0)
        .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`);
    if (fieldParts.length > 0) {
        return `${parsed.detail} ${fieldParts.join('; ')}`;
    }
    return parsed.detail;
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
interface HandleAPIErrorOptions {
    message?: string;
    duration?: number;
    notifyValidation?: boolean;
}

/**
 * Show error notification via toast.
 *
 * @param parsed - Parsed error object
 * @param options - Options (message, duration, notifyValidation)
 * @returns Parsed error object
 */
function handleAPIError(
    parsed: ParsedAPIError,
    options: HandleAPIErrorOptions = {},
): ParsedAPIError {
    if (parsed.isValidationError && !options.notifyValidation) {
        return parsed;
    }

    toast.error(options.message || getDisplayMessage(parsed), {
        duration: options.duration || 5000,
    });

    return parsed;
}
