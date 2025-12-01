/**
 * Shared types for form components
 */

import { FieldError, FieldValues, Path } from 'react-hook-form';

/**
 * Base props shared by all form field components
 */
export interface BaseFieldProps<TFieldValues extends FieldValues = FieldValues> {
    /** Field name - must match a key in your form schema */
    name: Path<TFieldValues>;
    /** Label text displayed above the field */
    label?: string;
    /** Helper text displayed below the field */
    helperText?: string;
    /** Whether the field is required (adds * to label) */
    required?: boolean;
    /** Whether the field is disabled */
    disabled?: boolean;
    /** Additional CSS classes for the wrapper */
    className?: string;
}

/**
 * Props for text-based input fields
 */
export interface TextFieldProps<TFieldValues extends FieldValues = FieldValues>
    extends BaseFieldProps<TFieldValues> {
    /** Input type */
    type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel' | 'search';
    /** Placeholder text */
    placeholder?: string;
    /** Auto-complete attribute */
    autoComplete?: string;
    /** Minimum value (for number type) */
    min?: number;
    /** Maximum value (for number type) */
    max?: number;
    /** Step value (for number type) */
    step?: number;
    /** Whether to display label and input in a row */
    row?: boolean;
}

/**
 * Props for textarea fields
 */
export interface TextAreaFieldProps<TFieldValues extends FieldValues = FieldValues>
    extends BaseFieldProps<TFieldValues> {
    /** Placeholder text */
    placeholder?: string;
    /** Number of visible rows */
    rows?: number;
    /** Whether the textarea can be resized */
    resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

/**
 * Props for checkbox fields
 */
export interface CheckboxFieldProps<TFieldValues extends FieldValues = FieldValues>
    extends BaseFieldProps<TFieldValues> {
    /** Description text next to the checkbox */
    description?: string;
}

/**
 * Props for switch/toggle fields
 */
export interface SwitchFieldProps<TFieldValues extends FieldValues = FieldValues>
    extends BaseFieldProps<TFieldValues> {
    /** Description text next to the switch */
    description?: string;
}

/**
 * Radio option type
 */
export interface RadioOption<T = string> {
    value: T;
    label: string;
    description?: string;
    disabled?: boolean;
}

/**
 * Props for radio group fields
 */
export interface RadioGroupFieldProps<
    TFieldValues extends FieldValues = FieldValues,
    TValue = string,
> extends BaseFieldProps<TFieldValues> {
    /** Available options */
    options: RadioOption<TValue>[];
    /** Layout direction */
    direction?: 'horizontal' | 'vertical';
}

/**
 * Props for slider/range fields
 */
export interface SliderFieldProps<TFieldValues extends FieldValues = FieldValues>
    extends BaseFieldProps<TFieldValues> {
    /** Minimum value */
    min?: number;
    /** Maximum value */
    max?: number;
    /** Step increment */
    step?: number;
    /** Whether to show the current value */
    showValue?: boolean;
    /** Format function for displayed value */
    formatValue?: (value: number) => string;
}

/**
 * Select option type (matches existing Selector)
 */
export interface SelectOption<T = string | number> {
    value: T;
    label: string;
    [key: string]: any;
}

/**
 * Props for select fields
 */
export interface SelectFieldProps<
    TFieldValues extends FieldValues = FieldValues,
    TOption = SelectOption,
    IsMulti extends boolean = false,
> extends BaseFieldProps<TFieldValues> {
    /** Available options (for static options) */
    options?: TOption[];
    /** Async function to fetch options */
    fetchOptions?: (inputValue: string) => Promise<TOption[]>;
    /** Whether multiple options can be selected */
    isMulti?: IsMulti;
    /** Placeholder text */
    placeholder?: string;
    /** Whether the select is searchable */
    isSearchable?: boolean;
    /** Whether the select is clearable */
    isClearable?: boolean;
    /** Whether the select is disabled (alias for disabled) */
    isDisabled?: boolean;
    /** Custom onChange handler (called in addition to form field update) */
    onChange?: (value: IsMulti extends true ? TOption[] : TOption | null) => void;
}

/**
 * Helper type to get error message from FieldError
 */
export function getErrorMessage(error: FieldError | undefined): string | undefined {
    return error?.message;
}

/**
 * Helper type for nested error paths (for arrays and objects)
 */
export type NestedError = FieldError | { [key: string]: NestedError } | undefined;

