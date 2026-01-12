/**
 * SettingsTextArea - Textarea field for settings pages
 * Can be used in either horizontal or vertical layout
 */

import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError as FieldErrorComponent,
    FieldLabel,
} from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { forwardRef, ReactElement, ReactNode, TextareaHTMLAttributes } from 'react';
import { FieldError } from 'react-hook-form';

export interface SettingsTextAreaProps extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    'name'
> {
    /** Label text for the field */
    label: string;
    /** Description text displayed below the label */
    description?: string;
    /** Name from react-hook-form registration (automatically provided by {...register()}) */
    name?: string;
    /** Error object or message from react-hook-form */
    error?: FieldError | string;
    /** Whether the field is required (adds * to label) */
    required?: boolean;
    /** Custom textarea element to render instead of default textarea */
    children?: ReactNode;
    /** Layout mode: 'horizontal' (label left, input right) or 'vertical' (stacked) */
    layout?: 'horizontal' | 'vertical';
}

/**
 * Settings textarea component for multi-line text input.
 * Compatible with react-hook-form.
 *
 * @example
 * ```tsx
 * const { register, formState: { errors } } = useForm();
 *
 * <SettingsCard>
 *   <SettingsTextArea
 *     label="Description"
 *     description="Enter a detailed description"
 *     rows={4}
 *     {...register('description')}
 *     error={errors.description}
 *   />
 * </SettingsCard>
 * ```
 */
const SettingsTextArea = forwardRef<HTMLTextAreaElement, SettingsTextAreaProps>(
    function SettingsTextArea(
        {
            label,
            description,
            error,
            required = false,
            className,
            children,
            layout = 'vertical',
            rows = 4,
            ...props
        },
        ref,
    ): ReactElement {
        const errorMessage = typeof error === 'string' ? error : error?.message;

        // Horizontal layout (like SettingsField)
        if (layout === 'horizontal') {
            return (
                <Field orientation='horizontal' className='py-2'>
                    <FieldContent className='flex-1'>
                        <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                            {label}
                            {required && (
                                <span className='text-destructive ml-1'>*</span>
                            )}
                        </FieldLabel>
                        {description && (
                            <FieldDescription className='text-sm'>
                                {description}
                            </FieldDescription>
                        )}
                        {errorMessage && (
                            <FieldErrorComponent className='text-sm mt-1'>
                                {errorMessage}
                            </FieldErrorComponent>
                        )}
                    </FieldContent>
                    <div className='w-auto flex-1'>
                        {children || (
                            <Textarea
                                ref={ref}
                                rows={rows}
                                className={`w-full text-sm ${className || ''}`}
                                aria-invalid={Boolean(errorMessage)}
                                aria-describedby={
                                    errorMessage ? `${props.name}-error` : undefined
                                }
                                {...props}
                            />
                        )}
                    </div>
                </Field>
            );
        }

        // Vertical layout (stacked)
        return (
            <Field orientation='vertical' className='py-2 w-full'>
                <FieldContent>
                    <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                        {label}
                        {required && <span className='text-destructive ml-1'>*</span>}
                    </FieldLabel>
                    {description && (
                        <FieldDescription className='text-sm mb-2'>
                            {description}
                        </FieldDescription>
                    )}
                </FieldContent>
                {children || (
                    <Textarea
                        ref={ref}
                        rows={rows}
                        className={`w-full text-sm ${className || ''}`}
                        aria-invalid={Boolean(errorMessage)}
                        aria-describedby={
                            errorMessage ? `${props.name}-error` : undefined
                        }
                        {...props}
                    />
                )}
                {errorMessage && (
                    <FieldErrorComponent className='text-sm mt-1'>
                        {errorMessage}
                    </FieldErrorComponent>
                )}
            </Field>
        );
    },
);

export default SettingsTextArea;
