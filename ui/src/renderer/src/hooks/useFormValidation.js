import { useState, useCallback } from 'react';
import { getFieldErrors, parseAPIError } from '../utils/apiErrorHandler';
import { useNotif } from '../contexts/NotificationContext/NotificationContext';

/**
 * Hook for form validation with API error handling.
 * Automatically extracts and stores field-level validation errors.
 * 
 * @returns {Object} Form validation utilities
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
export function useFormValidation() {
    const { notify } = useNotif();
    const [fieldErrors, setFieldErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * Handle form submission with validation error extraction
     * 
     * @param {Function} apiCall - Async function that submits the form
     * @param {Object} options - Configuration options
     * @param {string} options.successMessage - Message to show on success
     * @param {string} options.validationMessage - Message for validation errors
     * @param {number} options.duration - Notification duration
     * @param {Function} options.onSuccess - Callback on success
     * @param {Function} options.onError - Callback on error
     * @returns {Promise} Result of API call
     */
    const handleSubmit = useCallback(async (apiCall, options = {}) => {
        setFieldErrors({}); // Clear previous errors
        setIsSubmitting(true);
        
        try {
            const result = await apiCall();
            
            if (options.successMessage) {
                notify({
                    type: 'success',
                    text: options.successMessage,
                    duration: options.duration || 3500
                });
            }
            
            if (options.onSuccess) {
                options.onSuccess(result);
            }
            
            return result;
        } catch (error) {
            const parsed = parseAPIError(error);
            
            if (parsed.isValidationError) {
                // Store field errors for display
                setFieldErrors(parsed.fieldErrors);
                
                notify({
                    type: 'error',
                    text: options.validationMessage || 'Please fix the validation errors.',
                    duration: options.duration || 4000
                });
            } else {
                // Non-validation error
                notify({
                    type: 'error',
                    text: parsed.detail,
                    duration: options.duration || 5000
                });
            }
            
            if (options.onError) {
                options.onError(parsed);
            }
            
            throw parsed;
        } finally {
            setIsSubmitting(false);
        }
    }, [notify]);

    /**
     * Get errors for a specific field
     * 
     * @param {string} fieldName - Name of the form field
     * @returns {Array|null} Array of error messages or null
     */
    const getFieldError = useCallback((fieldName) => {
        return fieldErrors[fieldName] || null;
    }, [fieldErrors]);

    /**
     * Check if a specific field has errors
     * 
     * @param {string} fieldName - Name of the form field
     * @returns {boolean}
     */
    const hasFieldError = useCallback((fieldName) => {
        return !!fieldErrors[fieldName];
    }, [fieldErrors]);

    /**
     * Clear all field errors
     */
    const clearErrors = useCallback(() => {
        setFieldErrors({});
    }, []);

    /**
     * Clear errors for specific field
     * 
     * @param {string} fieldName - Name of the form field
     */
    const clearFieldError = useCallback((fieldName) => {
        setFieldErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fieldName];
            return newErrors;
        });
    }, []);

    /**
     * Manually set field errors (useful for custom validation)
     * 
     * @param {Object} errors - Object with field names as keys and error arrays as values
     */
    const setErrors = useCallback((errors) => {
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
        isSubmitting
    };
}

