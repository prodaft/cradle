/**
 * FormTextArea - Multi-line text input component for react-hook-form
 */

import { Textarea } from '@/components/ui/textarea';
import { ReactElement } from 'react';
import { FieldValues, Path, useFormContext } from 'react-hook-form';
import FormFieldWrapper from './shared/FormFieldWrapper';
import { TextAreaFieldProps } from './shared/types';

/**
 * Textarea component that integrates with react-hook-form via useFormContext.
 *
 * @example
 * ```tsx
 * <Form schema={schema} onSubmit={handleSubmit}>
 *   <FormTextArea name="bio" label="Bio" rows={4} />
 *   <FormTextArea name="notes" label="Notes" resize="vertical" />
 * </Form>
 * ```
 */
export default function FormTextArea<TFieldValues extends FieldValues = FieldValues>({
    name,
    label,
    helperText,
    required = false,
    disabled = false,
    className = '',
    placeholder,
    rows = 3,
    resize = 'vertical',
}: TextAreaFieldProps<TFieldValues>): ReactElement {
    const {
        register,
        formState: { errors },
    } = useFormContext<TFieldValues>();

    // Get error message
    const error = errors[name];
    const errorMessage = error?.message as string | undefined;

    const resizeClass = {
        none: 'resize-none',
        vertical: 'resize-y',
        horizontal: 'resize-x',
        both: 'resize',
    }[resize];

    return (
        <FormFieldWrapper
            name={name}
            label={label}
            required={required}
            helperText={helperText}
            error={errorMessage}
            className={className}
        >
            <Textarea
                id={name}
                placeholder={placeholder}
                disabled={disabled}
                rows={rows}
                className={`w-full ${resizeClass} ${
                    errorMessage ? 'border-destructive focus:ring-destructive' : ''
                }`}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? `${name}-error` : undefined}
                {...register(name as Path<TFieldValues>)}
            />
        </FormFieldWrapper>
    );
}
