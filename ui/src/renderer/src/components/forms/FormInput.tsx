/**
 * FormInput - Text input component for react-hook-form
 */

import { FieldValues, Path, useFormContext } from 'react-hook-form';
import FormFieldWrapper from './shared/FormFieldWrapper';
import { TextFieldProps } from './shared/types';
import { Input } from '@/components/ui/input';

/**
 * Text input component that integrates with react-hook-form via useFormContext.
 * Supports text, email, password, number, url, tel, and search types.
 *
 * @example
 * ```tsx
 * <Form schema={schema} onSubmit={handleSubmit}>
 *   <FormInput name="email" label="Email" type="email" required />
 *   <FormInput name="password" label="Password" type="password" />
 *   <FormInput name="age" label="Age" type="number" min={0} max={120} />
 * </Form>
 * ```
 */
export default function FormInput<TFieldValues extends FieldValues = FieldValues>({
    name,
    label,
    helperText,
    required = false,
    disabled = false,
    className = '',
    type = 'text',
    placeholder,
    autoComplete,
    min,
    max,
    step,
    row = false,
}: TextFieldProps<TFieldValues>): React.JSX.Element {
    const {
        register,
        formState: { errors },
    } = useFormContext<TFieldValues>();

    // Get nested error message
    const error = errors[name];
    const errorMessage = error?.message as string | undefined;

    return (
        <FormFieldWrapper
            name={name}
            label={label}
            required={required}
            helperText={helperText}
            error={errorMessage}
            row={row}
            className={className}
        >
            <Input
                id={name}
                type={type}
                placeholder={placeholder}
                autoComplete={autoComplete}
                disabled={disabled}
                min={min}
                max={max}
                step={step}
                className={className}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? `${name}-error` : undefined}
                {...register(name as Path<TFieldValues>, {
                    valueAsNumber: type === 'number',
                })}
            />
        </FormFieldWrapper>
    );
}
