/**
 * API Error Handler and Response Utilities
 *
 * Utilities for parsing and handling RFC 9457 compliant API errors.
 * All functions are explicit and require manual invocation.
 */

import { SessionExpiredException } from '@services/openapi/auth-exceptions';
import type { components } from '@services/openapi/schema';

/** RFC 9457 error body, as documented for every API error response. */
type ApiErrorBody = components['schemas']['ErrorResponse'];

/** Every machine-readable `code` the backend can return. */
type ApiErrorCode = components['schemas']['ErrorCodeEnum'];

/** Codes produced on the client when there is no backend error body. */
type ClientErrorCode = 'NETWORK_ERROR' | 'SESSION_EXPIRED';

/**
 * Parsed API error structure
 */
interface ParsedAPIError {
    code: ApiErrorCode | ClientErrorCode;
    detail: string;
    status: number;
    title: string;
    type?: string;
    instance: string;
    timestamp: string;
    isValidationError: boolean;
    fieldErrors: Record<string, string[]>;
    raw: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object';
}

function isErrorBody(value: unknown): value is Partial<ApiErrorBody> {
    if (!isRecord(value) || 'response' in value) return false;
    return typeof value.detail === 'string' || typeof value.code === 'string';
}

function isThrownApiError(
    value: unknown,
): value is { response: Response; error?: unknown } {
    return isRecord(value) && value.response instanceof Response;
}

function fromBody(body: Partial<ApiErrorBody>, fallbackStatus: number): ParsedAPIError {
    const code = body.code ?? 'UNKNOWN_ERROR';
    return {
        code,
        detail: body.detail || 'An error occurred',
        status: body.status ?? fallbackStatus,
        title: body.title || 'Error',
        type: body.type,
        instance: body.instance || 'unknown',
        timestamp: body.timestamp || new Date().toISOString(),
        isValidationError: code === 'VALIDATION_ERROR',
        fieldErrors: flattenFieldErrors(body.errors),
        raw: body,
    };
}

function clientError(
    code: ClientErrorCode | 'UNKNOWN_ERROR',
    title: string,
    detail: string,
    raw: unknown,
): ParsedAPIError {
    return {
        code,
        detail,
        status: 0,
        title,
        instance: 'unknown',
        timestamp: new Date().toISOString(),
        isValidationError: false,
        fieldErrors: {},
        raw,
    };
}

/**
 * Parse RFC 9457 error response into structured format
 *
 * @param error - Whatever a query or mutation threw: `{ response, error }` from an openapi-fetch
 *   call, the parsed body from openapi-react-query, or a client-side error
 * @returns Parsed error object
 */
export async function parseAPIError(error: unknown): Promise<ParsedAPIError> {
    if (isErrorBody(error)) {
        return fromBody(error, 500);
    }

    if (!isThrownApiError(error)) {
        if (error instanceof SessionExpiredException) {
            return clientError(
                'SESSION_EXPIRED',
                'Session Expired',
                error.message,
                error,
            );
        }
        if (error instanceof TypeError) {
            return clientError(
                'NETWORK_ERROR',
                'Network Error',
                'Unable to connect to the server. Please check your connection.',
                error,
            );
        }
        return clientError(
            'UNKNOWN_ERROR',
            'Unknown Error',
            'An unknown error occurred',
            error,
        );
    }

    const { response } = error;
    if (isRecord(error.error)) {
        return fromBody(error.error as Partial<ApiErrorBody>, response.status);
    }
    let body: unknown;
    try {
        body = await response.json();
    } catch {
        // Response body empty, not JSON, or already consumed by openapi-fetch
    }
    return fromBody(
        isRecord(body) ? (body as Partial<ApiErrorBody>) : {},
        response.status,
    );
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
