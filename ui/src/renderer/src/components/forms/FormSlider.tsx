/**
 * FormSlider - Range slider component for react-hook-form
 */

import { useFormContext, Controller, FieldValues, Path } from 'react-hook-form';
import FormFieldWrapper from './shared/FormFieldWrapper';
import { SliderFieldProps } from './shared/types';

/**
 * Range slider component that integrates with react-hook-form via Controller.
 *
 * @example
 * ```tsx
 * <Form schema={schema} onSubmit={handleSubmit}>
 *   <FormSlider name="volume" label="Volume" min={0} max={100} showValue />
 *   <FormSlider
 *     name="price"
 *     label="Max Price"
 *     min={0}
 *     max={1000}
 *     step={10}
 *     formatValue={(v) => `$${v}`}
 *     showValue
 *   />
 * </Form>
 * ```
 */
export default function FormSlider<TFieldValues extends FieldValues = FieldValues>({
    name,
    label,
    helperText,
    required = false,
    disabled = false,
    className = '',
    min = 0,
    max = 100,
    step = 1,
    showValue = false,
    formatValue = (v) => String(v),
}: SliderFieldProps<TFieldValues>): JSX.Element {
    const {
        control,
        formState: { errors },
    } = useFormContext<TFieldValues>();

    // Get error message
    const error = errors[name];
    const errorMessage = error?.message as string | undefined;

    return (
        <FormFieldWrapper
            name={name}
            label={label}
            required={required}
            helperText={helperText}
            error={errorMessage}
            className={className}
        >
            <Controller
                name={name as Path<TFieldValues>}
                control={control}
                render={({ field }) => (
                    <div className="flex items-center gap-4">
                        <input
                            id={name}
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            disabled={disabled}
                            className={`w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                                errorMessage ? 'accent-red-500' : ''
                            }`}
                            aria-invalid={Boolean(errorMessage)}
                            aria-describedby={errorMessage ? `${name}-error` : undefined}
                            aria-valuemin={min}
                            aria-valuemax={max}
                            aria-valuenow={field.value ?? min}
                            {...field}
                            value={field.value ?? min}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                        {showValue && (
                            <span className="cradle-text-secondary text-sm min-w-[3rem] text-right">
                                {formatValue(field.value ?? min)}
                            </span>
                        )}
                    </div>
                )}
            />
        </FormFieldWrapper>
    );
}

