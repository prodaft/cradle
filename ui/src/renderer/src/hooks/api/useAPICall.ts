/**
 * Hook for common API call pattern with error handling
 */

import { useNotif } from '@/contexts/ui/NotificationContext';
import { SessionExpiredException } from '@/exceptions/AuthExceptions';
import { handleAPIError, parseAPIError, ParsedAPIError } from '@/utils/api';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Options for execute function
 */
export interface ExecuteOptions<T = unknown> {
    successMessage?: string;
    errorMessage?: string;
    duration?: number;
    suppressNotification?: boolean;
    onSuccess?: (result: T) => void;
    onError?: (error: ParsedAPIError) => void;
}

/**
 * Return type for useAPICall hook
 */
export interface UseAPICallReturn {
    execute: <T>(apiCall: () => Promise<T>, options?: ExecuteOptions<T>) => Promise<T>;
    executor: <T>(
        apiCall: (...args: any[]) => Promise<T>,
        options?: ExecuteOptions<T>,
    ) => (...args: any[]) => Promise<T>;
    loading: boolean;
    handleError: <T = unknown>(
        err: unknown,
        options: ExecuteOptions<T>,
    ) => Promise<ParsedAPIError>;
}

/**
 * Hook for common API call pattern with error handling.
 * Provides explicit control over when and how errors are handled.
 *
 * @returns API call utilities
 *
 * @example
 * const { execute, loading, error } = useAPICall();
 *
 * // Execute with automatic error handling
 * await execute(
 *   () => api.deleteUser({ userId }),
 *   { successMessage: 'User deleted successfully' }
 * );
 *
 * @example
 * const { executor } = useAPICall();
 *
 * // Create a pre-configured function
 * const deleteUser = executor(
 *   () => api.deleteUser({ userId }),
 *   { successMessage: 'User deleted' }
 * );
 *
 * // Call it later
 * await deleteUser();
 */
export function useAPICall(): UseAPICallReturn {
    const { notify } = useNotif();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<ParsedAPIError | null>(null);

    const sessionExpiredNotifiedRef = useRef<boolean>(false);

    /**
     * Execute an API call with automatic error handling
     *
     * @param apiCall - Async function that makes the API call
     * @param options - Configuration options
     * @returns Result of API call
     */
    const execute = useCallback(
        async <T>(
            apiCall: () => Promise<T>,
            options: ExecuteOptions<T> = {},
        ): Promise<T> => {
            setLoading(true);
            setError(null);

            try {
                const result = await apiCall();

                // Optional success notification
                if (options.successMessage) {
                    notify({
                        type: 'success',
                        text: options.successMessage,
                        duration: options.duration || 3500,
                    });
                }

                // Optional success callback
                if (options.onSuccess) {
                    options.onSuccess(result);
                }

                return result;
            } catch (err) {
                const parsed = await handleError(err, options);
                if (parsed?.code !== 'UNAUTHENTICATED' && parsed?.code !== 'SESSION_EXPIRED') {
                    if (options.onError) {
                        options.onError(parsed!);
                    }
                }

                throw parsed;
            } finally {
                setLoading(false);
            }
        },
        [notify, navigate],
    );

    /**
     * Create a pre-configured executor function
     * Returns a function that can be called later with the same error handling
     *
     * @param apiCall - Async function that makes the API call
     * @param options - Configuration options (same as execute)
     * @returns Pre-configured async function
     */
    const executor = useCallback(
        <T>(
            apiCall: (...args: any[]) => Promise<T>,
            options: ExecuteOptions<T> = {},
        ) => {
            return (...args: any[]): Promise<T> => {
                return execute(() => apiCall(...args), options);
            };
        },
        [execute],
    );

    /**
     * Handle an error from an API call
     *
     * @param error - The error to handle
     * @returns The error
     */
    const handleError = useCallback(
        async <T = unknown>(err: unknown, options: ExecuteOptions<T>) => {
            // Handle session expiration separately
            let parsed: ParsedAPIError | null = null;
            if (err instanceof SessionExpiredException) {
                parsed = {
                    code: 'SESSION_EXPIRED',
                    detail: err.message,
                    status: 401,
                    title: 'Session Expired',
                    instance: 'unknown',
                    timestamp: new Date().toISOString(),
                    isValidationError: false,
                    fieldErrors: {},
                    raw: err,
                };
            } else {
                parsed = await parseAPIError(err);
            }

            if (parsed?.code === 'UNAUTHENTICATED' || parsed?.code === 'SESSION_EXPIRED') {
                if (!sessionExpiredNotifiedRef.current) {
                    sessionExpiredNotifiedRef.current = true;
                    notify({
                        type: 'error',
                        text: 'Authentication failed. Please log in again.',
                        duration: 3000,
                    });
                    navigate('/login');

                    setTimeout(() => {
                        sessionExpiredNotifiedRef.current = false;
                    }, 5000);
                }
                return parsed;
            }


            // Only notify if not suppressed
            if (!options.suppressNotification) {
                handleAPIError(parsed!, notify, {
                    message: options.errorMessage,
                    duration: options.duration,
                });
            }

            // Optional error callback
            if (options.onError) {
                options.onError(parsed!);
            }

            return parsed;
        },
        [notify],
    );

    return {
        execute,
        executor,
        loading,
        handleError,
    };
}

export default useAPICall;
