/**
 * SettingsSelect - Select dropdown component for settings pages
 * Matches the AccountSettings design pattern with label/description on left, select on right
 */

import { forwardRef, ReactNode, SelectHTMLAttributes } from 'react';
import { FieldError } from 'react-hook-form';

export interface SettingsSelectProps extends Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    'name'
> {
    /** Label text for the select */
    label: string;
    /** Description text displayed below the label */
    description?: string;
    /** Name from react-hook-form registration (automatically provided by {...register()}) */
    name?: string;
    /** Error object or message from react-hook-form */
    error?: FieldError | string;
    /** Whether the field is required (adds * to label) */
    required?: boolean;
    /** Options to display */
    children: ReactNode;
    /** Width of the select container (default: 'w-auto') */
    selectWidth?: string;
}

/**
 * Select dropdown component with horizontal layout for settings pages.
 * Compatible with react-hook-form.
 *
 * @example
 * ```tsx
 * const { register, formState: { errors } } = useForm();
 *
 * <SettingsCard>
 *   <SettingsSelect
 *     label="Role"
 *     description="Controls feature access level"
 *     {...register('role')}
 *     error={errors.role}
 *   >
 *     <option value='author'>User</option>
 *     <option value='entrymanager'>Entry Manager</option>
 *     <option value='admin'>Admin</option>
 *   </SettingsSelect>
 * </SettingsCard>
 * ```
 */
const SettingsSelect = forwardRef<HTMLSelectElement, SettingsSelectProps>(
    function SettingsSelect(
        {
            label,
            description,
            error,
            required = false,
            className,
            children,
            selectWidth = 'w-auto',
            ...props
        },
        ref,
    ): JSX.Element {
        const errorMessage = typeof error === 'string' ? error : error?.message;

        return (
            <div className='flex items-center justify-between gap-4 py-2'>
                <div className='flex-1'>
                    <label className='text-sm text-muted-foreground block mb-0.5'>
                        {label}
                        {required && <span className='text-destructive ml-1'>*</span>}
                    </label>
                    {description && (
                        <p className='text-sm text-muted-foreground'>{description}</p>
                    )}
                    {errorMessage && (
                        <p className='text-sm text-destructive mt-1'>{errorMessage}</p>
                    )}
                </div>
                <div className={selectWidth}>
                    <select
                        ref={ref}
                        className={`cradle-input inline-block text-sm h-10 rounded-full ${
                            errorMessage ? 'border-destructive' : ''
                        } ${className || ''}`}
                        style={{ width: 'auto' }}
                        aria-invalid={Boolean(errorMessage)}
                        aria-describedby={
                            errorMessage ? `${props.name}-error` : undefined
                        }
                        {...props}
                    >
                        {children}
                    </select>
                </div>
            </div>
        );
    },
);

export default SettingsSelect;
