/**
 * API-related hooks
 * Hooks for interacting with backend API services
 */

export { useApi, type ApiContextValue } from './useApi';
export { useAPICall, type ExecuteOptions, type UseAPICallReturn } from './useAPICall';

/**
 * @deprecated Use the Form component from '@/components/forms' instead.
 */
export {
    useFormValidation,
    type FormSubmitOptions,
    type UseFormValidationReturn,
} from './useFormValidation';
