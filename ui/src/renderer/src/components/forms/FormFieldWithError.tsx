import { InputHTMLAttributes } from 'react';

interface FormFieldWithErrorProps extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'name' | 'type'
> {
    name: string;
    label?: string;
    type?: string;
    error?: string[] | null;
    required?: boolean;
    placeholder?: string;
    value?: any;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    className?: string;
}

/**
 * Form field component that displays validation errors.
 *
 * @deprecated Use FormInput from '@/components/forms' instead.
 * FormInput integrates with react-hook-form and automatically
 * displays both client-side and API validation errors.
 *
 * @example
 * // Instead of:
 * const { getFieldError } = useFormValidation();
 * <FormFieldWithError name="username" error={getFieldError('username')} />
 *
 * // Use:
 * import { Form, FormInput } from '@/components/forms';
 * <Form schema={schema} onSubmit={handleSubmit}>
 *   <FormInput name="username" label="Username" />
 * </Form>
 */
export default function FormFieldWithError({
    name,
    label,
    type = 'text',
    error = null,
    required = false,
    placeholder = '',
    value,
    onChange,
    onBlur,
    disabled = false,
    className = '',
    ...props
}: FormFieldWithErrorProps) {
    const hasError = error && error.length > 0;

    return (
        <div className={`form-field ${className}`}>
            {label && (
                <label
                    htmlFor={name}
                    className='block text-sm font-medium text-foreground mb-1'
                >
                    {label}
                    {required && <span className='text-destructive ml-1'>*</span>}
                </label>
            )}

            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                disabled={disabled}
                required={required}
                placeholder={placeholder}
                className={`
                    cradle-input w-full
                    ${hasError ? 'border-destructive focus:ring-destructive' : ''}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                {...props}
            />

            {hasError && (
                <div className='mt-1 space-y-1'>
                    {error.map((errorMsg, idx) => (
                        <p key={idx} className='text-sm text-destructive'>
                            {errorMsg}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}
