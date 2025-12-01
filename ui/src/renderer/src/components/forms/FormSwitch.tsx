/**
 * FormSwitch - Toggle switch component for react-hook-form
 */

import { FieldValues, Path, useFormContext } from 'react-hook-form';
import { SwitchFieldProps } from './shared/types';

/**
 * Toggle switch component that integrates with react-hook-form via useFormContext.
 * Uses the switch-ghost-primary style from the existing design system.
 *
 * @example
 * ```tsx
 * <Form schema={schema} onSubmit={handleSubmit}>
 *   <FormSwitch name="notifications" label="Enable notifications" />
 *   <FormSwitch name="darkMode" label="Dark mode" description="Use dark theme" />
 * </Form>
 * ```
 */
export default function FormSwitch<TFieldValues extends FieldValues = FieldValues>({
    name,
    label,
    helperText,
    description,
    required = false,
    disabled = false,
    className = '',
}: SwitchFieldProps<TFieldValues>): JSX.Element {
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
            <label className='flex items-center justify-between gap-4 cursor-pointer'>
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
                <input
                    id={name}
                    type='checkbox'
                    disabled={disabled}
                    className={`switch switch-ghost-primary ${hasError ? 'border-red-500' : ''}`}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? `${name}-error` : undefined}
                    {...register(name as Path<TFieldValues>)}
                />
            </label>
            {helperText && !hasError && (
                <p className='text-xs cradle-text-muted mt-1'>{helperText}</p>
            )}
            {hasError && (
                <p
                    id={`${name}-error`}
                    className='text-xs text-red-500 mt-1'
                    role='alert'
                >
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
