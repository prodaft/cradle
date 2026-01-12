/**
 * SettingsSelect - Select dropdown component for settings pages
 * Matches the AccountSettings design pattern with label/description on left, select on right
 */

import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError as FieldErrorComponent,
    FieldLabel,
} from '@/components/ui/field';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ReactElement } from 'react';
import { FieldError } from 'react-hook-form';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SettingsSelectProps {
    /** Label text for the select */
    label: string;
    /** Description text displayed below the label */
    description?: string;
    /** Name from react-hook-form registration */
    name?: string;
    /** Error object or message from react-hook-form */
    error?: FieldError | string;
    /** Whether the field is required (adds * to label) */
    required?: boolean;
    /** Options to display */
    options: SelectOption[];
    /** Current value */
    value?: string;
    /** Change handler */
    onValueChange?: (value: string) => void;
    /** Whether the select is disabled */
    disabled?: boolean;
    /** Placeholder text */
    placeholder?: string;
    /** Width of the select container (default: 'w-auto') */
    selectWidth?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Select dropdown component with horizontal layout for settings pages.
 * Compatible with react-hook-form.
 *
 * @example
 * ```tsx
 * const { watch, setValue, formState: { errors } } = useForm();
 *
 * <SettingsCard>
 *   <SettingsSelect
 *     label="Role"
 *     description="Controls feature access level"
 *     name="role"
 *     value={watch('role')}
 *     onValueChange={(value) => setValue('role', value)}
 *     error={errors.role}
 *     options={[
 *       { value: 'author', label: 'User' },
 *       { value: 'entrymanager', label: 'Entry Manager' },
 *       { value: 'admin', label: 'Admin' },
 *     ]}
 *   />
 * </SettingsCard>
 * ```
 */
export default function SettingsSelect({
    label,
    description,
    error,
    required = false,
    options,
    value,
    onValueChange,
    disabled = false,
    placeholder,
    selectWidth = 'w-auto',
    className,
    name,
}: SettingsSelectProps): ReactElement {
    const errorMessage = typeof error === 'string' ? error : error?.message;

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
            <div className={selectWidth}>
                <Select
                    value={value}
                    onValueChange={onValueChange}
                    disabled={disabled}
                    name={name}
                >
                    <SelectTrigger
                        className={`${errorMessage ? 'border-destructive' : ''} ${className || ''}`}
                        aria-invalid={Boolean(errorMessage)}
                        aria-describedby={errorMessage ? `${name}-error` : undefined}
                    >
                        <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((option) => (
                            <SelectItem
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                            >
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </Field>
    );
}
