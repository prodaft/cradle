/**
 * FormRadioGroup - Radio button group component for react-hook-form
 */

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Controller, FieldValues, Path, useFormContext } from 'react-hook-form';
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
        control,
        formState: { errors },
    } = useFormContext<TFieldValues>();

    // Get error message
    const error = errors[name];
    const errorMessage = error?.message as string | undefined;
    const hasError = Boolean(errorMessage);

    return (
        <div className={`w-full ${className}`}>
            {label && (
                <Label
                    id={`${name}-label`}
                    className='text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2 block'
                >
                    {label}
                    {required && <span className='text-destructive ml-1'>*</span>}
                </Label>
            )}
            <Controller
                name={name as Path<TFieldValues>}
                control={control}
                render={({ field }) => (
                    <RadioGroup
                        value={field.value ? String(field.value) : undefined}
                        onValueChange={(value) => field.onChange(value)}
                        disabled={disabled}
                        className={
                            direction === 'horizontal'
                                ? 'flex-row flex-wrap'
                                : 'flex-col'
                        }
                        aria-labelledby={label ? `${name}-label` : undefined}
                        aria-invalid={hasError}
                        aria-describedby={hasError ? `${name}-error` : undefined}
                    >
                        {options.map((option, index) => {
                            const optionId = `${name}-${index}`;
                            return (
                                <div
                                    key={index}
                                    className={`flex items-start gap-3 ${
                                        option.disabled || disabled
                                            ? 'opacity-50 cursor-not-allowed'
                                            : ''
                                    }`}
                                >
                                    <RadioGroupItem
                                        value={String(option.value)}
                                        id={optionId}
                                        disabled={disabled || option.disabled}
                                        className={`mt-0.5 ${hasError ? 'border-destructive' : ''}`}
                                    />
                                    <Label
                                        htmlFor={optionId}
                                        className='flex flex-col cursor-pointer'
                                    >
                                        <span className='text-foreground text-sm'>
                                            {option.label}
                                        </span>
                                        {option.description && (
                                            <span className='text-xs text-muted-foreground mt-0.5'>
                                                {option.description}
                                            </span>
                                        )}
                                    </Label>
                                </div>
                            );
                        })}
                    </RadioGroup>
                )}
            />
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
