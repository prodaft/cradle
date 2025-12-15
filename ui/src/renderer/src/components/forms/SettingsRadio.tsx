/**
 * SettingsRadio - Radio button group component for settings pages
 * Matches the AccountSettings design pattern with label/description on left, radio buttons on right
 */

import { forwardRef, InputHTMLAttributes } from 'react';
import { FieldError } from 'react-hook-form';

export interface RadioOption {
    value: string;
    label: string;
}

export interface SettingsRadioProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
    /** Label text for the radio group */
    label: string;
    /** Description text displayed below the label */
    description?: string;
    /** Name from react-hook-form registration */
    name: string;
    /** Error object or message from react-hook-form */
    error?: FieldError | string;
    /** Whether the field is required (adds * to label) */
    required?: boolean;
    /** Array of radio options */
    options: RadioOption[];
    /** Current selected value */
    value?: string;
    /** Change handler */
    onChange?: (value: string) => void;
    /** Layout mode: 'horizontal' (inline) or 'vertical' (stacked) */
    layout?: 'horizontal' | 'vertical';
}

/**
 * Radio button group component with horizontal layout for settings pages.
 *
 * @example
 * ```tsx
 * <SettingsCard>
 *   <SettingsRadio
 *     label="Access Level"
 *     description="Permission level for this entity"
 *     name="accessLevel"
 *     value={currentAccess}
 *     onChange={handleAccessChange}
 *     options={[
 *       { value: 'none', label: 'None' },
 *       { value: 'read', label: 'Read' },
 *       { value: 'read-write', label: 'Read-Write' }
 *     ]}
 *   />
 * </SettingsCard>
 * ```
 */
const SettingsRadio = forwardRef<HTMLInputElement, SettingsRadioProps>(
    function SettingsRadio(
        {
            label,
            description,
            error,
            required = false,
            options,
            value,
            onChange,
            name,
            layout = 'horizontal',
            ...props
        },
        ref,
    ): JSX.Element {
        const errorMessage = typeof error === 'string' ? error : error?.message;

        return (
            <div className='py-2'>
                <div className='flex items-center justify-between gap-4'>
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
                    <div className={`flex ${layout === 'horizontal' ? 'flex-row gap-3' : 'flex-col gap-2'}`}>
                        {options.map((option) => (
                            <label
                                key={option.value}
                                className='flex items-center gap-2 cursor-pointer'
                            >
                                <input
                                    ref={ref}
                                    type='radio'
                                    name={name}
                                    value={option.value}
                                    checked={value === option.value}
                                    onChange={(e) => {
                                        if (onChange && e.target.checked) {
                                            onChange(option.value);
                                        }
                                    }}
                                    className='w-4 h-4 text-cradle-accent-primary bg-transparent border-gray-600 focus:ring-cradle-accent-primary focus:ring-2'
                                    aria-invalid={Boolean(errorMessage)}
                                    {...props}
                                />
                                <span className='text-sm cradle-text-secondary'>
                                    {option.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        );
    },
);

export default SettingsRadio;
