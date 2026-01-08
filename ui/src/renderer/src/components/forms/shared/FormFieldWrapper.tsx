/**
 * FormFieldWrapper - Consistent wrapper for form fields with label and error display
 */

import React, { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

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
                    <p className='text-xs text-muted-foreground mt-1'>{helperText}</p>
                )}
                {hasError && (
                    <p
                        id={`${name}-error`}
                        className='text-xs text-destructive mt-1'
                        role='alert'
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
                <div className='flex flex-row items-center justify-between w-full gap-4'>
                    <Label
                        htmlFor={name}
                        className='text-muted-foreground whitespace-nowrap'
                    >
                        {label}
                        {required && <span className='text-destructive ml-1'>*</span>}
                    </Label>
                    <div className='flex-1'>{children}</div>
                </div>
                {helperText && !hasError && (
                    <p className='text-xs text-muted-foreground mt-1'>{helperText}</p>
                )}
                {hasError && (
                    <p
                        id={`${name}-error`}
                        className='text-xs text-destructive mt-1'
                        role='alert'
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
            <div className='flex flex-col w-full gap-2'>
                <Label htmlFor={name} className='text-muted-foreground'>
                    {label}
                    {required && <span className='text-destructive ml-1'>*</span>}
                </Label>
                {children}
            </div>
            {helperText && !hasError && (
                <p className='text-xs text-muted-foreground mt-1'>{helperText}</p>
            )}
            {hasError && (
                <p
                    id={`${name}-error`}
                    className='text-xs text-destructive mt-1'
                    role='alert'
                >
                    {error}
                </p>
            )}
        </div>
    );
}
