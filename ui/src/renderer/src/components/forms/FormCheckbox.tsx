/**
 * FormCheckbox - Checkbox input component for react-hook-form
 */

import { FieldValues, Path, useFormContext } from 'react-hook-form';
import { CheckboxFieldProps } from './shared/types';

/**
 * Checkbox component that integrates with react-hook-form via useFormContext.
 *
 * @example
 * ```tsx
 * <Form schema={schema} onSubmit={handleSubmit}>
 *   <FormCheckbox name="terms" label="I agree to the terms" required />
 *   <FormCheckbox name="newsletter" label="Subscribe to newsletter" />
 * </Form>
 * ```
 */
export default function FormCheckbox<TFieldValues extends FieldValues = FieldValues>({
    name,
    label,
    helperText,
    description,
    required = false,
    disabled = false,
    className = '',
}: CheckboxFieldProps<TFieldValues>): JSX.Element {
    const {
        register,
        formState: { errors },
    } = useFormContext<TFieldValues>();

    // Get error message
    const error = errors[name];
    const errorMessage = error?.message as string | undefined;
    const hasError = Boolean(errorMessage);

    return (
        <div className={`w-full ${className}`}>
            <label className='flex items-start gap-3 cursor-pointer'>
                <input
                    id={name}
                    type='checkbox'
                    disabled={disabled}
                    className={`mt-0.5 ${hasError ? 'border-red-500' : ''}`}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? `${name}-error` : undefined}
                    {...register(name as Path<TFieldValues>)}
                />
                <div className='flex flex-col'>
                    <span className='cradle-label cradle-text-tertiary'>
                        {label}
                        {required && <span className='text-red-500 ml-1'>*</span>}
                    </span>
                    {description && (
                        <span className='text-xs cradle-text-muted mt-0.5'>
                            {description}
                        </span>
                    )}
                </div>
            </label>
            {helperText && !hasError && (
                <p className='text-xs cradle-text-muted mt-1 ml-6'>{helperText}</p>
            )}
            {hasError && (
                <p
                    id={`${name}-error`}
                    className='text-xs text-red-500 mt-1 ml-6'
                    role='alert'
                >
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
