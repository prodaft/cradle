/**
 * FormFieldWrapper - Consistent wrapper for form fields with label and error display
 */

import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError as FieldErrorComponent,
    FieldLabel,
} from '@/components/ui/field';
import React, { ReactNode } from 'react';

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
}: FormFieldWrapperProps): React.JSX.Element {
    const hasError = Boolean(error);

    // For fields without labels (just the input with optional error)
    if (!label) {
        return (
            <div className={`w-full ${className}`}>
                {children}
                {helperText && !hasError && (
                    <FieldDescription className='text-xs mt-1'>
                        {helperText}
                    </FieldDescription>
                )}
                {hasError && (
                    <FieldErrorComponent id={`${name}-error`} className='text-xs mt-1'>
                        {error}
                    </FieldErrorComponent>
                )}
            </div>
        );
    }

    // Row layout (label and field side by side)
    if (row) {
        return (
            <Field orientation='horizontal' className={`w-full ${className}`}>
                <FieldLabel
                    htmlFor={name}
                    className='text-muted-foreground whitespace-nowrap'
                >
                    {label}
                    {required && <span className='text-destructive ml-1'>*</span>}
                </FieldLabel>
                <div className='flex-1'>{children}</div>
                {helperText && !hasError && (
                    <FieldDescription className='text-xs mt-1'>
                        {helperText}
                    </FieldDescription>
                )}
                {hasError && (
                    <FieldErrorComponent id={`${name}-error`} className='text-xs mt-1'>
                        {error}
                    </FieldErrorComponent>
                )}
            </Field>
        );
    }

    // Standard column layout
    return (
        <Field orientation='vertical' className={`w-full ${className}`}>
            <FieldContent>
                <FieldLabel htmlFor={name} className='text-muted-foreground'>
                    {label}
                    {required && <span className='text-destructive ml-1'>*</span>}
                </FieldLabel>
            </FieldContent>
            {children}
            {helperText && !hasError && (
                <FieldDescription className='text-xs mt-1'>
                    {helperText}
                </FieldDescription>
            )}
            {hasError && (
                <FieldErrorComponent id={`${name}-error`} className='text-xs mt-1'>
                    {error}
                </FieldErrorComponent>
            )}
        </Field>
    );
}
