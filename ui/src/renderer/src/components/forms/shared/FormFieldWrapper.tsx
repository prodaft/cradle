/**
 * FormFieldWrapper - Consistent wrapper for form fields with label and error display
 */

import { ReactNode } from 'react';

export interface FormFieldWrapperProps {
    /** Field name for accessibility */
    name: string;
    /** Label text */
    label?: string;
    /** Whether the field is required */
    required?: boolean;
    /** Helper text displayed below the field */
    helperText?: string;
    /** Error message to display */
    error?: string;
    /** Whether to display in row layout (label and field side by side) */
    row?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** The form field element */
    children: ReactNode;
}

/**
 * Wrapper component that provides consistent label, helper text, and error display
 * for all form field components.
 */
export default function FormFieldWrapper({
    name,
    label,
    required = false,
    helperText,
    error,
    row = false,
    className = '',
    children,
}: FormFieldWrapperProps): JSX.Element {
    const hasError = Boolean(error);

    // For fields without labels (just the input with optional error)
    if (!label) {
        return (
            <div className={`w-full ${className}`}>
                {children}
                {helperText && !hasError && (
                    <p className="text-xs cradle-text-muted mt-1">{helperText}</p>
                )}
                {hasError && (
                    <p
                        id={`${name}-error`}
                        className="text-xs text-red-500 mt-1"
                        role="alert"
                    >
                        {error}
                    </p>
                )}
            </div>
        );
    }

    // Row layout (label and field side by side)
    if (row) {
        return (
            <div className={`w-full ${className}`}>
                <div className="flex flex-row items-center justify-between w-full gap-4">
                    <label
                        htmlFor={name}
                        className="cradle-label cradle-text-tertiary whitespace-nowrap"
                    >
                        {label}
                        {required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="flex-1">
                        {children}
                    </div>
                </div>
                {helperText && !hasError && (
                    <p className="text-xs cradle-text-muted mt-1">{helperText}</p>
                )}
                {hasError && (
                    <p
                        id={`${name}-error`}
                        className="text-xs text-red-500 mt-1"
                        role="alert"
                    >
                        {error}
                    </p>
                )}
            </div>
        );
    }

    // Standard column layout
    return (
        <div className={`w-full ${className}`}>
            <label htmlFor={name} className="flex flex-col w-full gap-2">
                <span className="cradle-label cradle-text-tertiary">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </span>
                {children}
            </label>
            {helperText && !hasError && (
                <p className="text-xs cradle-text-muted mt-1">{helperText}</p>
            )}
            {hasError && (
                <p
                    id={`${name}-error`}
                    className="text-xs text-red-500 mt-1"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

