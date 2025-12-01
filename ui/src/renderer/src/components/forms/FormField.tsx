import { forwardRef, InputHTMLAttributes } from 'react';
import { FieldError } from 'react-hook-form';

/**
 * FormField component props - designed for react-hook-form
 */
export interface FormFieldProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
    /** Label text for the field */
    label?: string;
    /** Name from react-hook-form registration (automatically provided by {...register()}) */
    name?: string;
    /** Error object or message from react-hook-form */
    error?: FieldError | string;
    /** Helper text displayed below the input */
    helperText?: string;
    /** Whether to display label and input in a row */
    row?: boolean;
    /** Whether the field is required (adds * to label) */
    required?: boolean;
}

/**
 * FormField component - Compatible with react-hook-form
 *
 * @example
 * ```tsx
 * const { register, formState: { errors } } = useForm();
 *
 * <FormField
 *   label="Username"
 *   {...register('username')}
 *   error={errors.username}
 *   placeholder="Enter username"
 *   required
 * />
 * ```
 */
const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
    {
        label,
        error,
        helperText,
        row = false,
        required = false,
        className,
        type = 'text',
        ...props
    },
    ref,
): JSX.Element {
    const errorMessage = typeof error === 'string' ? error : error?.message;
    const hasError = Boolean(errorMessage);

    // If no label, render just the input with error
    if (!label) {
        return (
            <div className='w-full'>
                <input
                    ref={ref}
                    type={type}
                    className={`cradle-search w-full disabled:opacity-50 disabled:cursor-not-allowed ${hasError ? 'border-red-500 focus:ring-red-500' : ''
                        } ${className || ''}`}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? `${props.name}-error` : undefined}
                    {...props}
                />
                {helperText && !hasError && (
                    <p className='text-xs cradle-text-muted mt-1'>{helperText}</p>
                )}
                {hasError && (
                    <p id={`${props.name}-error`} className='text-xs text-red-500 mt-1'>
                        {errorMessage}
                    </p>
                )}
            </div>
        );
    }

    // For checkbox/radio types, use different layout
    if (type === 'checkbox' || type === 'radio' || type === 'switch') {
        return (
            <div className='w-full'>
                <label className='flex items-center gap-2 cursor-pointer'>
                    <input
                        ref={ref}
                        type={type === 'radio' ? 'radio' : 'checkbox'}
                        className={`${hasError ? 'border-red-500' : ''
                            } ${className || ''}`}
                        aria-invalid={hasError}
                        aria-describedby={hasError ? `${props.name}-error` : undefined}
                        {...props}
                    />
                    <span className='cradle-label cradle-text-tertiary'>
                        {label}
                        {required && <span className='text-red-500 ml-1'>*</span>}
                    </span>
                </label>
                {helperText && !hasError && (
                    <p className='text-xs cradle-text-muted mt-1 ml-6'>{helperText}</p>
                )}
                {hasError && (
                    <p
                        id={`${props.name}-error`}
                        className='text-xs text-red-500 mt-1 ml-6'
                    >
                        {errorMessage}
                    </p>
                )}
            </div>
        );
    }

    // Standard layout with label
    return (
        <div className='w-full'>
            <label
                className={`flex ${row ? 'flex-row items-center' : 'flex-col'
                    } justify-between w-full gap-2`}
            >
                <span className='cradle-label cradle-text-tertiary'>
                    {label}
                    {required && <span className='text-red-500 ml-1'>*</span>}
                </span>
                <div className={`${row ? '' : 'w-full'}`}>
                    <input
                        ref={ref}
                        type={type}
                        className={`cradle-search w-full disabled:opacity-50 disabled:cursor-not-allowed ${hasError ? 'border-red-500 focus:ring-red-500' : ''
                            } ${className || ''}`}
                        aria-invalid={hasError}
                        aria-describedby={hasError ? `${props.name}-error` : undefined}
                        {...props}
                    />
                    {helperText && !hasError && (
                        <p className='text-xs cradle-text-muted mt-1'>{helperText}</p>
                    )}
                    {hasError && (
                        <p
                            id={`${props.name}-error`}
                            className='text-xs text-red-500 mt-1'
                        >
                            {errorMessage}
                        </p>
                    )}
                </div>
            </label>
        </div>
    );
});

export default FormField;
