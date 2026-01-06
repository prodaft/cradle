/**
 * SettingsTextArea - Textarea field for settings pages
 * Can be used in either horizontal or vertical layout
 */

import { forwardRef, ReactNode, TextareaHTMLAttributes } from 'react';
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
    ): JSX.Element {
        const errorMessage = typeof error === 'string' ? error : error?.message;

        // Horizontal layout (like SettingsField)
        if (layout === 'horizontal') {
            return (
                <div className='flex items-start justify-between gap-4 py-2'>
                    <div className='flex-1'>
                        <label className='text-sm cradle-text-tertiary block mb-0.5'>
                            {label}
                            {required && <span className='text-red-500 ml-1'>*</span>}
                        </label>
                        {description && (
                            <p className='text-sm cradle-text-muted'>{description}</p>
                        )}
                        {errorMessage && (
                            <p className='text-sm text-red-500 mt-1'>{errorMessage}</p>
                        )}
                    </div>
                    <div className='w-auto flex-1'>
                        {children || (
                            <textarea
                                ref={ref}
                                rows={rows}
                                className={`cradle-input w-full text-sm rounded ${
                                    errorMessage ? 'border-red-500' : ''
                                } ${className || ''}`}
                                aria-invalid={Boolean(errorMessage)}
                                aria-describedby={
                                    errorMessage ? `${props.name}-error` : undefined
                                }
                                {...props}
                            />
                        )}
                    </div>
                </div>
            );
        }

        // Vertical layout (stacked)
        return (
            <div className='py-2 w-full'>
                <label className='text-sm cradle-text-tertiary block mb-0.5'>
                    {label}
                    {required && <span className='text-red-500 ml-1'>*</span>}
                </label>
                {description && (
                    <p className='text-sm cradle-text-muted mb-2'>{description}</p>
                )}
                {children || (
                    <textarea
                        ref={ref}
                        rows={rows}
                        className={`cradle-input w-full text-sm rounded ${
                            errorMessage ? 'border-red-500' : ''
                        } ${className || ''}`}
                        aria-invalid={Boolean(errorMessage)}
                        aria-describedby={
                            errorMessage ? `${props.name}-error` : undefined
                        }
                        {...props}
                    />
                )}
                {errorMessage && (
                    <p className='text-sm text-red-500 mt-1'>{errorMessage}</p>
                )}
            </div>
        );
    },
);

export default SettingsTextArea;
