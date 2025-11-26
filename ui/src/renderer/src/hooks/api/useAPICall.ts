/**
 * Hook for common API call pattern with error handling
 */

import { useNotif } from '@/contexts/ui/NotificationContext';
import { handleAPIError, parseAPIError, ParsedAPIError } from '@/utils/api';
import { useCallback, useState } from 'react';

/**
 * Options for execute function
 */
export interface ExecuteOptions {
    successMessage?: string;
    errorMessage?: string;
    duration?: number;
    suppressNotification?: boolean;
    onSuccess?: (result: any) => void;
    onError?: (error: ParsedAPIError) => void;
}

/**
 * Return type for useAPICall hook
 */
export interface UseAPICallReturn {
    execute: <T>(apiCall: () => Promise<T>, options?: ExecuteOptions) => Promise<T>;
    executor: <T>(
        apiCall: (...args: any[]) => Promise<T>,
        options?: ExecuteOptions,
    ) => (...args: any[]) => Promise<T>;
    loading: boolean;
    handleError: (err: unknown, options: ExecuteOptions) => Promise<ParsedAPIError>;
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
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<ParsedAPIError | null>(null);

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
            options: ExecuteOptions = {},
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
                let parsed = await handleError(err, options);
                throw parsed;
            } finally {
                setLoading(false);
            }
        },
        [notify],
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
        <T>(apiCall: (...args: any[]) => Promise<T>, options: ExecuteOptions = {}) => {
            return async (...args: any[]): Promise<T> => {
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
        async (err: unknown, options: ExecuteOptions) => {
            const parsed = await parseAPIError(err);

            // Only notify if not suppressed
            if (!options.suppressNotification) {
                handleAPIError(parsed, notify, {
                    message: options.errorMessage,
                    duration: options.duration,
                });
            }

            // Optional error callback
            if (options.onError) {
                options.onError(parsed);
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
