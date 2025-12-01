/**
 * FormAlert - Inline alert component for form success/error states
 */

import { useEffect } from 'react';

/**
 * Alert state for form
 */
export interface FormAlertState {
    type: 'success' | 'error' | 'warning' | null;
    message: string;
}

/**
 * Props for the FormAlert component
 */
export interface FormAlertProps {
    /** Alert state */
    alert: FormAlertState;
    /** Callback when alert is dismissed */
    onDismiss?: () => void;
    /** Auto-dismiss timeout in ms (0 to disable) */
    timeout?: number;
}

/**
 * Inline alert component for displaying form submission results.
 *
 * @example
 * ```tsx
 * <FormAlert
 *   alert={{ type: 'success', message: 'Form submitted successfully!' }}
 *   onDismiss={() => setAlert({ type: null, message: '' })}
 *   timeout={5000}
 * />
 * ```
 */
export default function FormAlert({
    alert,
    onDismiss,
    timeout = 5000,
}: FormAlertProps): JSX.Element | null {
    // Auto-dismiss after timeout
    useEffect(() => {
        if (alert.type && timeout > 0 && onDismiss) {
            const timer = setTimeout(onDismiss, timeout);
            return () => clearTimeout(timer);
        }
    }, [alert.type, timeout, onDismiss]);

    if (!alert.type) {
        return null;
    }

    const colorClasses = {
        success: 'cradle-status-success',
        error: 'cradle-status-error',
        warning: 'cradle-status-warning',
    };

    const iconColors = {
        success: 'var(--cradle-accent-success)',
        error: 'var(--cradle-accent-error)',
        warning: 'var(--cradle-accent-warning)',
    };

    const renderIcon = () => {
        const iconColor = iconColors[alert.type!];

        switch (alert.type) {
            case 'success':
                return (
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 48 48"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="flex-shrink-0"
                    >
                        <path
                            fillRule="evenodd"
                            d="M24 4C12.96 4 4 12.96 4 24C4 35.04 12.96 44 24 44C35.04 44 44 35.04 44 24C44 12.96 35.04 4 24 4ZM18.58 32.58L11.4 25.4C10.62 24.62 10.62 23.36 11.4 22.58C12.18 21.8 13.44 21.8 14.22 22.58L20 28.34L33.76 14.58C34.54 13.8 35.8 13.8 36.58 14.58C37.36 15.36 37.36 16.62 36.58 17.4L21.4 32.58C20.64 33.36 19.36 33.36 18.58 32.58Z"
                            fill={iconColor}
                        />
                    </svg>
                );
            case 'error':
                return (
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="flex-shrink-0"
                    >
                        <path
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                            fill={iconColor}
                        />
                    </svg>
                );
            case 'warning':
                return (
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 48 48"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="flex-shrink-0"
                    >
                        <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M2 42L24 6L46 42H2ZM24 35C22.9 35 22 34.1 22 33C22 31.9 22.9 31 24 31C25.1 31 26 31.9 26 33C26 34.1 25.1 35 24 35ZM24 29C22.9 29 22 28.1 22 27V19C22 17.9 22.9 17 24 17C25.1 17 26 17.9 26 19V27C26 28.1 25.1 29 24 29Z"
                            fill={iconColor}
                        />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div
            className={`${colorClasses[alert.type]} cradle-border p-3 mb-4 flex items-center justify-between gap-3 cradle-bg-elevated rounded-md`}
            role="alert"
        >
            <div className="flex items-center gap-3">
                {renderIcon()}
                <span className="text-sm cradle-mono cradle-text-primary">
                    {alert.message}
                </span>
            </div>
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    className="cradle-text-muted hover:cradle-text-primary transition-colors p-1"
                    aria-label="Dismiss alert"
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M18 6L6 18M6 6l12 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            )}
        </div>
    );
}

