/**
 * Form - Main form wrapper component with react-hook-form and API integration
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { ParsedAPIError } from '@/utils/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle, InfoCircle, WarningCircle } from 'iconoir-react';
import React, { ReactNode, useCallback, useState } from 'react';
import {
    FieldValues,
    FormProvider,
    Path,
    SubmitHandler,
    useForm,
    UseFormProps,
    UseFormReturn,
} from 'react-hook-form';
import type { z } from 'zod';

/**
 * Props for the Form component
 */
export interface FormProps<TFieldValues extends FieldValues = FieldValues> {
    /** Form children (field components) */
    children: ReactNode | ((methods: UseFormReturn<TFieldValues>) => ReactNode);
    /** Zod validation schema */
    schema?: z.ZodType<TFieldValues>;
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
 * - Supports Zod validation schemas
 * - Handles form submission via useMutation from @tanstack/react-query
 * - Automatically merges API validation errors with form errors
 * - Displays success/error alerts inline (not notifications)
 *
 * @example
 * ```tsx
 * import { z } from 'zod';
 *
 * const schema = z.object({
 *   username: z.string().min(1, { error: 'Username is required' }),
 *   email: z.string().min(1, { error: 'Email is required' }).refine((val) => z.email().safeParse(val).success, { error: 'Invalid email' }),
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
}: FormProps<TFieldValues>): React.JSX.Element {
    const [alert, setAlert] = useState<{
        type: 'success' | 'error' | 'warning' | null;
        message: string;
    }>({ type: null, message: '' });

    const methods = useForm<TFieldValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: schema
            ? (zodResolver(schema as z.ZodType<any, any>) as any)
            : undefined,
        defaultValues,
        mode,
    });

    const { handleSubmit, setError, reset } = methods;

    const submitMutation = useMutation({
        mutationFn: onSubmit,
        meta: {
            suppressNotification: true, // We handle alerts ourselves
        },
        onSuccess: (result) => {
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
        },
        onError: (error) => {
            // Apply field errors from API response
            if (error.isValidationError && error.fieldErrors) {
                applyFieldErrors(error.fieldErrors);
            }

            // Show error alert
            const message =
                errorMessage ||
                (error.isValidationError
                    ? 'Please fix the validation errors below.'
                    : error.detail || 'An error occurred');
            setAlert({ type: 'error', message });

            // Call error callback
            onError?.(error);
        },
    });

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
        (data) => {
            // Clear previous alert
            clearAlert();
            // Submit via mutation
            submitMutation.mutate(data);
        },
        [submitMutation, clearAlert],
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
                    <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
                        {alert.type === 'success' && <CheckCircle />}
                        {alert.type === 'error' && <WarningCircle />}
                        {alert.type === 'warning' && <InfoCircle />}
                        <AlertDescription>{alert.message}</AlertDescription>
                    </Alert>
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
