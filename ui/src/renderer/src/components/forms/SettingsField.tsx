/**
 * SettingsField - Horizontal layout form field for settings pages
 * Matches the AccountSettings design pattern with label/description on left, input on right
 */

import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { FieldError } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface SettingsFieldProps extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
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
    /** Custom input element to render instead of default input */
    children?: ReactNode;
    /** Width of the input container (default: 'w-auto') */
    inputWidth?: string;
}

/**
 * Settings field component with horizontal layout (label/description on left, input on right).
 * Compatible with react-hook-form.
 *
 * @example
 * ```tsx
 * const { register, formState: { errors } } = useForm();
 *
 * <SettingsCard>
 *   <SettingsField
 *     label="Username"
 *     description="Your display name across the platform"
 *     {...register('username')}
 *     error={errors.username}
 *   />
 *   <Separator />
 *   <SettingsField
 *     label="Email"
 *     description="Used for login and notifications"
 *     type="email"
 *     {...register('email')}
 *     error={errors.email}
 *   />
 * </SettingsCard>
 * ```
 */
const SettingsField = forwardRef<HTMLInputElement, SettingsFieldProps>(
    function SettingsField(
        {
            label,
            description,
            error,
            required = false,
            className,
            type = 'text',
            children,
            inputWidth = 'w-auto',
            ...props
        },
        ref,
    ): React.JSX.Element {
        const errorMessage = typeof error === 'string' ? error : error?.message;

        return (
            <div className='flex items-center justify-between gap-4 py-2'>
                <div className='flex-1'>
                    <Label htmlFor={props.id || props.name} className='text-sm text-muted-foreground block mb-0.5'>
                        {label}
                        {required && <span className='text-destructive ml-1'>*</span>}
                    </Label>
                    {description && (
                        <p className='text-sm text-muted-foreground'>{description}</p>
                    )}
                    {errorMessage && (
                        <p className='text-sm text-destructive mt-1'>{errorMessage}</p>
                    )}
                </div>
                <div className={inputWidth}>
                    {children || (
                        <Input
                            ref={ref}
                            type={type}
                            id={props.id || props.name}
                            className={className}
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
    },
);

export default SettingsField;
