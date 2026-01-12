/**
 * SettingsToggle - Toggle/Switch component for settings pages
 * Matches the AccountSettings design pattern with label/description on left, switch on right
 */

import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError as FieldErrorComponent,
    FieldLabel,
} from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { ReactElement } from 'react';
import {
    Control,
    Controller,
    FieldError,
    UseFormRegisterReturn,
    UseFormWatch,
} from 'react-hook-form';

export interface SettingsToggleProps extends Partial<UseFormRegisterReturn> {
    /** Label text for the toggle */
    label: string;
    /** Description text displayed below the label */
    description?: string;
    /** Error object or message from react-hook-form */
    error?: FieldError | string;
    /** Whether the field is required (adds * to label) */
    required?: boolean;
    /** Whether the toggle is disabled */
    disabled?: boolean;
    /** Control from react-hook-form (when using Controller) */
    control?: Control<any>;
    /** Watch function from react-hook-form (when using register) */
    watch?: UseFormWatch<any>;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Toggle/Switch component with horizontal layout for settings pages.
 * Compatible with react-hook-form via either register() or Controller.
 *
 * @example
 * ```tsx
 * // Using register
 * const { register, watch, formState: { errors } } = useForm();
 *
 * <SettingsCard>
 *   <SettingsToggle
 *     label="Enable Feature"
 *     description="Turn this feature on or off"
 *     {...register('enabled')}
 *     watch={watch}
 *     error={errors.enabled}
 *   />
 * </SettingsCard>
 *
 * // Using Controller
 * const { control, formState: { errors } } = useForm();
 *
 * <SettingsCard>
 *   <SettingsToggle
 *     label="Enable Feature"
 *     description="Turn this feature on or off"
 *     name="enabled"
 *     control={control}
 *     error={errors.enabled}
 *   />
 * </SettingsCard>
 * ```
 */
export default function SettingsToggle({
    label,
    description,
    error,
    required = false,
    disabled = false,
    control,
    watch,
    name,
    className,
    onChange,
    onBlur,
    ref,
}: SettingsToggleProps): ReactElement {
    const errorMessage = typeof error === 'string' ? error : error?.message;

    // If control is provided, use Controller
    if (control && name) {
        return (
            <Field orientation='horizontal' className='py-2'>
                <FieldContent className='flex-1'>
                    <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                        {label}
                        {required && <span className='text-destructive ml-1'>*</span>}
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
                <Controller
                    name={name}
                    control={control}
                    render={({ field }) => (
                        <Switch
                            id={name}
                            name={field.name}
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            disabled={disabled}
                            className={className}
                            aria-invalid={Boolean(errorMessage)}
                            aria-describedby={
                                errorMessage ? `${name}-error` : undefined
                            }
                        />
                    )}
                />
            </Field>
        );
    }

    // Otherwise, use register pattern with watch
    // register returns onChange that expects an event, but Switch gives us a boolean
    // So we need to convert the boolean to an event-like object
    const currentValue = (watch && name ? watch(name) : false) ?? false;

    const handleCheckedChange = (checked: boolean) => {
        if (onChange) {
            // Create a synthetic event-like object for react-hook-form
            // register's onChange expects an event, but Switch gives us a boolean
            const syntheticEvent = {
                target: {
                    name: name || '',
                    value: checked,
                    checked: checked,
                    type: 'checkbox',
                },
                currentTarget: {
                    name: name || '',
                    value: checked,
                    checked: checked,
                    type: 'checkbox',
                },
            };
            onChange(syntheticEvent as unknown as React.ChangeEvent<HTMLInputElement>);
        }
    };

    return (
        <Field orientation='horizontal' className='py-2'>
            <FieldContent className='flex-1'>
                <FieldLabel
                    htmlFor={name}
                    className='text-sm text-muted-foreground block mb-0.5'
                >
                    {label}
                    {required && <span className='text-destructive ml-1'>*</span>}
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
            <Switch
                id={name}
                name={name}
                checked={currentValue}
                onCheckedChange={handleCheckedChange}
                disabled={disabled}
                className={className}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? `${name}-error` : undefined}
            />
        </Field>
    );
}
