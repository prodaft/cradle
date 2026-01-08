/**
 * FormRadioGroup - Radio button group component for react-hook-form
 */

import { FieldValues, Path, useFormContext } from 'react-hook-form';
import { RadioGroupFieldProps } from './shared/types';

/**
 * Radio button group component that integrates with react-hook-form via useFormContext.
 *
 * @example
 * ```tsx
 * <Form schema={schema} onSubmit={handleSubmit}>
 *   <FormRadioGroup
 *     name="priority"
 *     label="Priority"
 *     options={[
 *       { value: 'low', label: 'Low' },
 *       { value: 'medium', label: 'Medium' },
 *       { value: 'high', label: 'High', description: 'Urgent items' },
 *     ]}
 *   />
 * </Form>
 * ```
 */
export default function FormRadioGroup<
    TFieldValues extends FieldValues = FieldValues,
    TValue = string,
>({
    name,
    label,
    helperText,
    required = false,
    disabled = false,
    className = '',
    options,
    direction = 'vertical',
}: RadioGroupFieldProps<TFieldValues, TValue>): JSX.Element {
    const {
        register,
        formState: { errors },
    } = useFormContext<TFieldValues>();

    // Get error message
    const error = errors[name];
    const errorMessage = error?.message as string | undefined;
    const hasError = Boolean(errorMessage);

    return (
        <div
            className={`w-full ${className}`}
            role='radiogroup'
            aria-labelledby={`${name}-label`}
        >
            {label && (
                <div
                    id={`${name}-label`}
                    className='cradle-label text-muted-foreground mb-2'
                >
                    {label}
                        {required && <span className='text-destructive ml-1'>*</span>}
                </div>
            )}
            <div
                className={`flex gap-3 ${
                    direction === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col'
                }`}
            >
                {options.map((option, index) => (
                    <label
                        key={index}
                        className={`flex items-start gap-3 cursor-pointer ${
                            option.disabled ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        <input
                            type='radio'
                            value={String(option.value)}
                            disabled={disabled || option.disabled}
                            className={`mt-0.5 ${hasError ? 'border-destructive' : ''}`}
                            aria-describedby={hasError ? `${name}-error` : undefined}
                            {...register(name as Path<TFieldValues>)}
                        />
                        <div className='flex flex-col'>
                            <span className='text-foreground text-sm'>
                                {option.label}
                            </span>
                            {option.description && (
                                <span className='text-xs text-muted-foreground mt-0.5'>
                                    {option.description}
                                </span>
                            )}
                        </div>
                    </label>
                ))}
            </div>
            {helperText && !hasError && (
                <p className='text-xs text-muted-foreground mt-2'>{helperText}</p>
            )}
            {hasError && (
                <p
                    id={`${name}-error`}
                    className='text-xs text-destructive mt-2'
                    role='alert'
                >
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
