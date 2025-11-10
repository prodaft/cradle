import { useCallback, useState } from 'react';
import { useNotif } from '../contexts/NotificationContext/NotificationContext';
import { handleAPIError, parseAPIError } from '../utils/apiErrorHandler';

/**
 * Hook for common API call pattern with error handling.
 * Provides explicit control over when and how errors are handled.
 * 
 * @returns {Object} API call utilities
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
export function useAPICall() {
    const { notify } = useNotif();
    const [loading, setLoading] = useState(false);

    /**
     * Execute an API call with automatic error handling
     * 
     * @param {Function} apiCall - Async function that makes the API call
     * @param {Object} options - Configuration options
     * @param {string} options.successMessage - Message to show on success
     * @param {string} options.errorMessage - Custom error message
     * @param {number} options.duration - Notification duration
     * @param {boolean} options.suppressNotification - Don't show notification
     * @param {Function} options.onSuccess - Callback on success
     * @param {Function} options.onError - Callback on error
     * @returns {Promise} Result of API call
     */
    const execute = useCallback(async (apiCall, options = {}) => {
        setLoading(true);

        try {
            const result = await apiCall();

            // Optional success notification
            if (options.successMessage) {
                notify({
                    type: 'success',
                    text: options.successMessage,
                    duration: options.duration || 3500
                });
            }

            // Optional success callback
            if (options.onSuccess) {
                options.onSuccess(result);
            }

            return result;
        } catch (err) {
            var parsed = null;

            try {
                parsed = await parseAPIError(err);
            } catch (error) {
                if (err.response?.status === 500) {
                    parsed = {
                        code: "INTERNAL_SERVER_ERROR",
                        detail: "An internal server error occurred",
                        status: err.status,
                        title: "Internal Server Error",
                        instance: 'unknown',
                        timestamp: new Date().toISOString(),
                        isValidationError: false,
                        fieldErrors: {},
                        raw: err
                    };
                } else {
                    parsed = {
                        code: "UNKNOWN_ERROR",
                        detail: "An unknown error occurred",
                        status: err.status,
                        title: "Unknown Error",
                        instance: 'unknown',
                        timestamp: new Date().toISOString(),
                        isValidationError: false,
                        fieldErrors: {},
                        raw: err
                    }
                }
            }

            // Only notify if not suppressed
            handleAPIError(parsed, notify, {
                message: options.errorMessage,
                duration: options.duration
            });

            // Optional error callback
            if (options.onError) {
                options.onError(parsed);
            }

            throw parsed;
        } finally {
            setLoading(false);
        }
    }, [notify]);

    /**
     * Create a pre-configured executor function
     * Returns a function that can be called later with the same error handling
     * 
     * @param {Function} apiCall - Async function that makes the API call
     * @param {Object} options - Configuration options (same as execute)
     * @returns {Function} Pre-configured async function
     */
    const executor = useCallback((apiCall, options = {}) => {
        return async (...args) => {
            return execute(() => apiCall(...args), options);
        };
    }, [execute]);

    return {
        execute,
        executor,
        loading,
    };
}

