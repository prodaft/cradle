/**
 * FormCheckbox - Checkbox input component for react-hook-form
 */

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Controller, FieldValues, Path, useFormContext } from 'react-hook-form';
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
        control,
        formState: { errors },
    } = useFormContext<TFieldValues>();

    // Get error message
    const error = errors[name];
    const errorMessage = error?.message as string | undefined;
    const hasError = Boolean(errorMessage);

    return (
        <div className={`w-full ${className}`}>
            <Controller
                name={name as Path<TFieldValues>}
                control={control}
                render={({ field }) => (
                    <div className='flex items-start gap-3'>
                        <Checkbox
                            id={name}
                            disabled={disabled}
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            className={`mt-0.5 ${hasError ? 'border-destructive' : ''}`}
                            aria-invalid={hasError}
                            aria-describedby={hasError ? `${name}-error` : undefined}
                        />
                        <Label htmlFor={name} className='flex flex-col cursor-pointer'>
                            <span className='text-xs uppercase tracking-widest font-semibold text-muted-foreground'>
                                {label}
                                {required && (
                                    <span className='text-destructive ml-1'>*</span>
                                )}
                            </span>
                            {description && (
                                <span className='text-xs text-muted-foreground mt-0.5'>
                                    {description}
                                </span>
                            )}
                        </Label>
                    </div>
                )}
            />
            {helperText && !hasError && (
                <p className='text-xs text-muted-foreground mt-1 ml-6'>{helperText}</p>
            )}
            {hasError && (
                <p
                    id={`${name}-error`}
                    className='text-xs text-destructive mt-1 ml-6'
                    role='alert'
                >
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
