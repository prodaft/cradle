/**
 * Hook for form validation with API error handling
 *
 * @deprecated Use the Form component from '@/components/forms' instead.
 * The Form component automatically handles API validation errors and merges
 * them with client-side validation errors.
 *
 * @example
 * // Instead of:
 * const { handleSubmit, getFieldError } = useFormValidation();
 *
 * // Use:
 * import { Form, FormInput } from '@/components/forms';
 *
 * <Form schema={schema} onSubmit={apiCall} successMessage="Success!">
 *   <FormInput name="username" label="Username" />
 * </Form>
 */

import { useNotif } from '@/contexts/ui/NotificationContext';
import { parseAPIError, ParsedAPIError } from '@/utils/api';
import { useCallback, useState } from 'react';

/**
 * Options for form submission
 */
export interface FormSubmitOptions {
    successMessage?: string;
    validationMessage?: string;
    duration?: number;
    onSuccess?: (result: any) => void;
    onError?: (error: ParsedAPIError) => void;
}

/**
 * Return type for useFormValidation hook
 */
export interface UseFormValidationReturn {
    handleSubmit: <T>(
        apiCall: () => Promise<T>,
        options?: FormSubmitOptions,
    ) => Promise<T>;
    fieldErrors: Record<string, string[]>;
    getFieldError: (fieldName: string) => string[] | null;
    hasFieldError: (fieldName: string) => boolean;
    clearErrors: () => void;
    clearFieldError: (fieldName: string) => void;
    setErrors: (errors: Record<string, string[]>) => void;
    isSubmitting: boolean;
}

/**
 * Hook for form validation with API error handling.
 * Automatically extracts and stores field-level validation errors.
 *
 * @returns Form validation utilities
 *
 * @example
 * const { handleSubmit, fieldErrors, getFieldError } = useFormValidation();
 *
 * const onSubmit = async (e) => {
 *   e.preventDefault();
 *   const formData = new FormData(e.target);
 *
 *   try {
 *     await handleSubmit(
 *       () => api.createUser({ userRequest: Object.fromEntries(formData) }),
 *       { successMessage: 'User created!' }
 *     );
 *     navigate('/users');
 *   } catch (error) {
 *     // Error already handled, fieldErrors set
 *   }
 * };
 *
 * // In JSX
 * const usernameError = getFieldError('username');
 * {usernameError && <span>{usernameError.join(', ')}</span>}
 */
export function useFormValidation(): UseFormValidationReturn {
    const { notify } = useNotif();
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    /**
     * Handle form submission with validation error extraction
     *
     * @param apiCall - Async function that submits the form
     * @param options - Configuration options
     * @returns Result of API call
     */
    const handleSubmit = useCallback(
        async <T>(
            apiCall: () => Promise<T>,
            options: FormSubmitOptions = {},
        ): Promise<T> => {
            setFieldErrors({}); // Clear previous errors
            setIsSubmitting(true);

            try {
                const result = await apiCall();

                if (options.successMessage) {
                    notify({
                        type: 'success',
                        text: options.successMessage,
                        duration: options.duration || 3500,
                    });
                }

                if (options.onSuccess) {
                    options.onSuccess(result);
                }

                return result;
            } catch (error) {
                const parsed = await parseAPIError(error);

                if (parsed.isValidationError) {
                    // Store field errors for display
                    setFieldErrors(parsed.fieldErrors);

                    notify({
                        type: 'error',
                        text:
                            options.validationMessage ||
                            'Please fix the validation errors.',
                        duration: options.duration || 4000,
                    });
                } else {
                    // Non-validation error
                    notify({
                        type: 'error',
                        text: parsed.detail,
                        duration: options.duration || 5000,
                    });
                }

                if (options.onError) {
                    options.onError(parsed);
                }

                throw parsed;
            } finally {
                setIsSubmitting(false);
            }
        },
        [notify],
    );

    /**
     * Get errors for a specific field
     *
     * @param fieldName - Name of the form field
     * @returns Array of error messages or null
     */
    const getFieldError = useCallback(
        (fieldName: string): string[] | null => {
            return fieldErrors[fieldName] || null;
        },
        [fieldErrors],
    );

    /**
     * Check if a specific field has errors
     *
     * @param fieldName - Name of the form field
     * @returns True if field has errors
     */
    const hasFieldError = useCallback(
        (fieldName: string): boolean => {
            return !!fieldErrors[fieldName];
        },
        [fieldErrors],
    );

    /**
     * Clear all field errors
     */
    const clearErrors = useCallback((): void => {
        setFieldErrors({});
    }, []);

    /**
     * Clear errors for specific field
     *
     * @param fieldName - Name of the form field
     */
    const clearFieldError = useCallback((fieldName: string): void => {
        setFieldErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[fieldName];
            return newErrors;
        });
    }, []);

    /**
     * Manually set field errors (useful for custom validation)
     *
     * @param errors - Object with field names as keys and error arrays as values
     */
    const setErrors = useCallback((errors: Record<string, string[]>): void => {
        setFieldErrors(errors);
    }, []);

    return {
        handleSubmit,
        fieldErrors,
        getFieldError,
        hasFieldError,
        clearErrors,
        clearFieldError,
        setErrors,
        isSubmitting,
    };
}

export default useFormValidation;
