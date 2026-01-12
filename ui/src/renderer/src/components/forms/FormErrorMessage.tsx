/**
 * FormErrorMessage - Reusable error message component for form fields
 *
 * Displays validation errors with a consistent icon and styling.
 * Used across form components to maintain consistent error presentation.
 */

import React from 'react';

export interface FormErrorMessageProps {
    /** Optional ID for accessibility (aria-describedby) */
    id?: string;
    /** Error message text to display */
    children: React.ReactNode;
}

/**
 * FormErrorMessage component - displays form field validation errors
 *
 * @example
 * ```tsx
 * {errors.title && (
 *     <FormErrorMessage id="title-error">
 *         {errors.title}
 *     </FormErrorMessage>
 * )}
 * ```
 */
export function FormErrorMessage({
    id,
    children,
}: FormErrorMessageProps): React.JSX.Element {
    return (
        <p id={id} className='mt-1 text-xs text-destructive flex items-center'>
            <svg
                className='w-3 h-3 mr-1 flex-shrink-0'
                fill='currentColor'
                viewBox='0 0 20 20'
                aria-hidden='true'
            >
                <path
                    fillRule='evenodd'
                    d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                    clipRule='evenodd'
                />
            </svg>
            {children}
        </p>
    );
}
