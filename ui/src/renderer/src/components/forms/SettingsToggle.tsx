/**
 * SettingsToggle - Toggle switch component for settings pages
 * Matches the AccountSettings design pattern with custom toggle styling
 */

import { forwardRef, InputHTMLAttributes } from 'react';
import { FieldError, UseFormWatch } from 'react-hook-form';

export interface SettingsToggleProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
    /** Label text for the toggle */
    label: string;
    /** Description text displayed below the label */
    description?: string;
    /** Name from react-hook-form registration (automatically provided by {...register()}) */
    name?: string;
    /** Error object or message from react-hook-form */
    error?: FieldError | string;
    /** Whether the field is required (adds * to label) */
    required?: boolean;
    /** Watch function from react-hook-form to get current value */
    watch?: UseFormWatch<any>;
    /** Custom checked value (if not using watch) */
    checked?: boolean;
    /** Custom icon element to display next to label */
    icon?: React.ReactNode;
}

/**
 * Toggle switch component with horizontal layout for settings pages.
 * Compatible with react-hook-form.
 *
 * @example
 * ```tsx
 * const { register, watch, formState: { errors } } = useForm();
 *
 * <SettingsCard>
 *   <SettingsToggle
 *     label="Vim Mode"
 *     description="Use Vim keybindings in the markdown editor"
 *     {...register('vimMode')}
 *     watch={watch}
 *     error={errors.vimMode}
 *   />
 * </SettingsCard>
 * ```
 */
const SettingsToggle = forwardRef<HTMLInputElement, SettingsToggleProps>(
    function SettingsToggle(
        {
            label,
            description,
            error,
            required = false,
            watch,
            checked: checkedProp,
            icon,
            id,
            name,
            ...props
        },
        ref,
    ): JSX.Element {
        const errorMessage = typeof error === 'string' ? error : error?.message;

        // Determine if the toggle is checked
        const isChecked = watch && name ? watch(name) : checkedProp;

        // Generate ID for accessibility
        const toggleId = id || name || `toggle-${Math.random().toString(36).substr(2, 9)}`;

        return (
            <div className='py-2'>
                <div className='flex items-center justify-between gap-4'>
                    <div className='flex-1'>
                        <label className='text-sm cradle-text-tertiary block mb-0.5 flex items-center gap-2'>
                            {label}
                            {icon}
                            {required && <span className='text-red-500 ml-1'>*</span>}
                        </label>
                        {description && (
                            <p className='text-sm cradle-text-muted'>{description}</p>
                        )}
                        {errorMessage && (
                            <p className='text-sm text-red-500 mt-1'>{errorMessage}</p>
                        )}
                    </div>
                    <label
                        htmlFor={toggleId}
                        className='relative inline-flex items-center cursor-pointer'
                    >
                        <input
                            id={toggleId}
                            ref={ref}
                            type='checkbox'
                            name={name}
                            className='sr-only'
                            aria-invalid={Boolean(errorMessage)}
                            aria-describedby={
                                errorMessage ? `${name}-error` : undefined
                            }
                            {...props}
                        />
                        <div
                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                                isChecked ? 'bg-cradle-accent-primary' : 'bg-gray-600'
                            }`}
                        >
                            <div
                                className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform duration-200 ease-in-out ${
                                    isChecked ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            ></div>
                        </div>
                    </label>
                </div>
            </div>
        );
    },
);

export default SettingsToggle;
