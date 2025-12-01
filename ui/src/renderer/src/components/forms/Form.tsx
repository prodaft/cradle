/**
 * Form - Main form wrapper component with react-hook-form and API integration
 */

import { useAPICall } from '@/hooks/api/useAPICall';
import { ParsedAPIError } from '@/utils/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { ReactNode, useCallback, useState } from 'react';
import {
    FieldValues,
    FormProvider,
    Path,
    SubmitHandler,
    useForm,
    UseFormProps,
    UseFormReturn,
} from 'react-hook-form';
import type { ObjectSchema } from 'yup';
import FormAlert, { FormAlertState } from './FormAlert';

/**
 * Props for the Form component
 */
export interface FormProps<TFieldValues extends FieldValues = FieldValues> {
    /** Form children (field components) */
    children: ReactNode | ((methods: UseFormReturn<TFieldValues>) => ReactNode);
    /** Yup validation schema */
    schema?: ObjectSchema<TFieldValues>;
    /** Submit handler - receives validated form data, should return a Promise */
    onSubmit: (data: TFieldValues) => Promise<unknown>;
    /** Success message to display after successful submission */
    successMessage?: string;
    /** Error message to display on non-validation errors */
    errorMessage?: string;
    /** Callback when submission succeeds */
    onSuccess?: (result: unknown) => void;
    /** Callback when submission fails */
    onError?: (error: ParsedAPIError) => void;
    /** Default form values */
    defaultValues?: UseFormProps<TFieldValues>['defaultValues'];
    /** Form mode for validation (default: 'onSubmit') */
    mode?: UseFormProps<TFieldValues>['mode'];
    /** Additional form props */
    formProps?: React.FormHTMLAttributes<HTMLFormElement>;
    /** CSS class for the form element */
    className?: string;
    /** Whether to reset form on successful submission */
    resetOnSuccess?: boolean;
    /** Timeout for auto-dismissing alerts (in ms). Set to 0 to disable auto-dismiss */
    alertTimeout?: number;
    /** Whether to show alerts (default: true) */
    showAlerts?: boolean;
}

/**
 * Form wrapper component that provides react-hook-form context and API integration.
 *
 * Features:
 * - Wraps children with FormProvider for useFormContext access
 * - Supports Yup validation schema
 * - Handles form submission via useAPICall
 * - Automatically merges API validation errors with form errors
 * - Displays success/error alerts inline (not notifications)
 *
 * @example
 * ```tsx
 * import * as Yup from 'yup';
 *
 * const schema = Yup.object({
 *   username: Yup.string().required('Username is required'),
 *   email: Yup.string().email('Invalid email').required('Email is required'),
 * });
 *
 * function CreateUserForm() {
 *   const api = useApi();
 *
 *   return (
 *     <Form
 *       schema={schema}
 *       onSubmit={(data) => api.createUser({ userRequest: data })}
 *       successMessage="User created successfully!"
 *       onSuccess={() => navigate('/users')}
 *     >
 *       <FormInput name="username" label="Username" required />
 *       <FormInput name="email" label="Email" type="email" required />
 *       <button type="submit">Create User</button>
 *     </Form>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With render prop for access to form methods
 * <Form schema={schema} onSubmit={handleSubmit}>
 *   {({ formState: { isSubmitting } }) => (
 *     <>
 *       <FormInput name="name" label="Name" />
 *       <button type="submit" disabled={isSubmitting}>
 *         {isSubmitting ? 'Saving...' : 'Save'}
 *       </button>
 *     </>
 *   )}
 * </Form>
 * ```
 */
export default function Form<TFieldValues extends FieldValues = FieldValues>({
    children,
    schema,
    onSubmit,
    successMessage,
    errorMessage,
    onSuccess,
    onError,
    defaultValues,
    mode = 'onSubmit',
    formProps,
    className = '',
    resetOnSuccess = false,
    alertTimeout = 5000,
    showAlerts = true,
}: FormProps<TFieldValues>): JSX.Element {
    const { execute } = useAPICall();
    const [alert, setAlert] = useState<FormAlertState>({ type: null, message: '' });

    const methods = useForm<TFieldValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: schema ? (yupResolver(schema) as any) : undefined,
        defaultValues,
        mode,
    });

    const { handleSubmit, setError, reset } = methods;

    /**
     * Clear the alert
     */
    const clearAlert = useCallback(() => {
        setAlert({ type: null, message: '' });
    }, []);

    /**
     * Apply API field errors to form fields
     */
    const applyFieldErrors = useCallback(
        (fieldErrors: Record<string, string[]>) => {
            Object.entries(fieldErrors).forEach(([fieldName, messages]) => {
                if (messages && messages.length > 0) {
                    setError(fieldName as Path<TFieldValues>, {
                        type: 'server',
                        message: messages.join(', '),
                    });
                }
            });
        },
        [setError],
    );

    /**
     * Handle form submission with API call
     */
    const onFormSubmit: SubmitHandler<TFieldValues> = useCallback(
        async (data) => {
            // Clear previous alert
            clearAlert();

            try {
                const result = await execute(
                    () => onSubmit(data),
                    {
                        suppressNotification: true, // We handle alerts ourselves
                        onError: (error) => {
                            // Apply field errors from API response
                            if (error.isValidationError && error.fieldErrors) {
                                applyFieldErrors(error.fieldErrors);
                            }
                        },
                    },
                );

                // Show success alert
                if (successMessage) {
                    setAlert({ type: 'success', message: successMessage });
                }

                // Reset form if configured
                if (resetOnSuccess) {
                    reset();
                }

                // Call success callback
                onSuccess?.(result);
            } catch (error) {
                const parsedError = error as ParsedAPIError;

                // Show error alert
                const message =
                    errorMessage ||
                    (parsedError.isValidationError
                        ? 'Please fix the validation errors below.'
                        : parsedError.detail || 'An error occurred');
                setAlert({ type: 'error', message });

                // Call error callback
                onError?.(parsedError);
            }
        },
        [
            execute,
            onSubmit,
            successMessage,
            errorMessage,
            onSuccess,
            onError,
            applyFieldErrors,
            resetOnSuccess,
            reset,
            clearAlert,
        ],
    );

    // Render children - support both ReactNode and render prop patterns
    const renderedChildren =
        typeof children === 'function' ? children(methods) : children;

    return (
        <FormProvider {...methods}>
            <form
                onSubmit={handleSubmit(onFormSubmit)}
                className={className}
                noValidate
                {...formProps}
            >
                {showAlerts && alert.type && (
                    <FormAlert
                        alert={alert}
                        onDismiss={clearAlert}
                        timeout={alertTimeout}
                    />
                )}
                {renderedChildren}
            </form>
        </FormProvider>
    );
}

/**
 * Re-export useFormContext for convenience
 */
export { useFormContext } from 'react-hook-form';
