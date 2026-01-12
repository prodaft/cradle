/**
 * SettingsRadio - Radio button group component for settings pages
 * Matches the AccountSettings design pattern with label/description on left, radio buttons on right
 */

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { forwardRef, InputHTMLAttributes } from 'react';
import { FieldError } from 'react-hook-form';

export interface RadioOption {
    value: string;
    label: string;
}

export interface SettingsRadioProps extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'name' | 'type' | 'onChange'
> {
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
                        <Label className='text-sm text-muted-foreground block mb-0.5'>
                            {label}
                            {required && (
                                <span className='text-destructive ml-1'>*</span>
                            )}
                        </Label>
                        {description && (
                            <p className='text-sm text-muted-foreground'>
                                {description}
                            </p>
                        )}
                        {errorMessage && (
                            <p className='text-sm text-destructive mt-1'>
                                {errorMessage}
                            </p>
                        )}
                    </div>
                    <RadioGroup
                        value={value}
                        onValueChange={onChange}
                        name={name}
                        className={
                            layout === 'horizontal'
                                ? 'flex-row gap-3'
                                : 'flex-col gap-2'
                        }
                        aria-invalid={Boolean(errorMessage)}
                        {...props}
                    >
                        {options.map((option) => {
                            const optionId = `${name}-${option.value}`;
                            return (
                                <div
                                    key={option.value}
                                    className='flex items-center gap-2'
                                >
                                    <RadioGroupItem
                                        value={option.value}
                                        id={optionId}
                                        ref={ref}
                                    />
                                    <Label
                                        htmlFor={optionId}
                                        className='text-sm text-foreground cursor-pointer'
                                    >
                                        {option.label}
                                    </Label>
                                </div>
                            );
                        })}
                    </RadioGroup>
                </div>
            </div>
        );
    },
);

export default SettingsRadio;
