import { useEffect, useState } from 'react';

/**
 * Alert button configuration
 */
export interface AlertButton {
    /** Button text */
    text: string;
    /** Button click handler */
    onClick: () => void;
}

/**
 * Alert color variants
 * Accepts standard Tailwind color names and semantic color names
 */
export type AlertColor =
    | 'green'
    | 'red'
    | 'yellow'
    | 'success'
    | 'error'
    | 'warning'
    | 'info'
    | string;

/**
 * Alert object structure
 */
export interface Alert {
    /** Whether to show the alert */
    show: boolean;
    /** Alert message text */
    message: string;
    /** Alert color variant */
    color: AlertColor;
    /** Optional code to display below message */
    code?: string;
    /** Optional button configuration */
    button?: AlertButton;
}

/**
 * AlertBox component props
 */
export interface AlertBoxProps {
    /** Alert configuration object */
    alert: Alert;
    /** Optional timeout in ms for auto-dismiss */
    timeout?: number;
}

/**
 * Normalize semantic color names to Tailwind color names
 */
const normalizeColor = (color: string): string => {
    const colorMap: Record<string, string> = {
        success: 'green',
        error: 'red',
        warning: 'yellow',
        info: 'yellow',
    };
    return colorMap[color] || color;
};

/**
 * AlertBox component - a styled in-line alert box with an icon, text, and optional button.
 *
 * Supports an optional timeout (in milliseconds) to auto-dismiss the alert.
 * Accepts both Tailwind color names ('green', 'red', 'yellow') and semantic names ('success', 'error', 'warning', 'info').
 *
 * @example
 * ```tsx
 * <AlertBox
 *   alert={{
 *     show: true,
 *     message: 'Operation successful',
 *     color: 'green',  // or 'success'
 *     button: { text: 'OK', onClick: handleDismiss }
 *   }}
 *   timeout={5000}
 * />
 * ```
 */
export default function AlertBox({
    alert,
    timeout,
}: AlertBoxProps): JSX.Element | null {
    // Local state to manage visibility (initially based on alert.show)
    const [visible, setVisible] = useState(alert.show);

    // Keep local visible state in sync if alert.show changes externally.
    useEffect(() => {
        setVisible(alert.show);
    }, [alert.show]);

    // If a timeout is provided, hide the alert automatically after the specified delay.
    useEffect(() => {
        if (timeout && visible) {
            const timer = setTimeout(() => {
                setVisible(false);
            }, timeout);
            return () => clearTimeout(timer);
        }
    }, [timeout, visible]);

    // Normalize color to support semantic names
    const normalizedColor = normalizeColor(alert.color);

    const colorVariants: Record<string, string> = {
        green: 'cradle-status-success',
        red: 'cradle-status-error',
        yellow: 'cradle-status-warning',
    };

    const renderIcon = () => {
        const iconColor =
            normalizedColor === 'green'
                ? 'var(--cradle-accent-success)'
                : normalizedColor === 'red'
                  ? 'var(--cradle-accent-error)'
                  : normalizedColor === 'yellow'
                    ? 'var(--cradle-accent-warning)'
                    : 'var(--cradle-accent-primary)';

        switch (normalizedColor) {
            case 'green':
                return (
                    <svg
                        width='20'
                        height='20'
                        viewBox='0 0 48 48'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <path
                            fillRule='evenodd'
                            d='M24 4C12.96 4 4 12.96 4 24C4 35.04 12.96 44 24 44C35.04 44 44 35.04 44 24C44 12.96 35.04 4 24 4ZM18.58 32.58L11.4 25.4C10.62 24.62 10.62 23.36 11.4 22.58C12.18 21.8 13.44 21.8 14.22 22.58L20 28.34L33.76 14.58C34.54 13.8 35.8 13.8 36.58 14.58C37.36 15.36 37.36 16.62 36.58 17.4L21.4 32.58C20.64 33.36 19.36 33.36 18.58 32.58Z'
                            fill={iconColor}
                        />
                    </svg>
                );
            case 'red':
                return (
                    <svg
                        width='20'
                        height='20'
                        viewBox='0 0 24 24'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <path
                            d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'
                            fill={iconColor}
                        />
                    </svg>
                );
            case 'yellow':
                return (
                    <svg
                        width='20'
                        height='20'
                        viewBox='0 0 48 48'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <path
                            fillRule='evenodd'
                            clipRule='evenodd'
                            d='M2 42L24 6L46 42H2ZM24 35C22.9 35 22 34.1 22 33C22 31.9 22.9 31 24 31C25.1 31 26 31.9 26 33C26 34.1 25.1 35 24 35ZM24 29C22.9 29 22 28.1 22 27V19C22 17.9 22.9 17 24 17C25.1 17 26 17.9 26 19V27C26 28.1 25.1 29 24 29Z'
                            fill={iconColor}
                        />
                    </svg>
                );
            default:
                return null;
        }
    };

    return visible ? (
        <div
            data-testid='auth-err-alert'
            className={`${colorVariants[normalizedColor]} cradle-border p-3 flex items-center justify-between gap-3 cradle-bg-elevated`}
        >
            <div className='flex items-center gap-3'>
                {renderIcon()}
                <div
                    className={`flex flex-col cradle-text-primary ${alert.code ? 'items-center' : ''} whitespace-pre-line`}
                >
                    <span className='text-sm cradle-mono'>{alert.message.trim()}</span>
                    {alert.code && (
                        <code className='block cradle-bg-tertiary cradle-border mt-2 p-2 px-3 text-center select-all cradle-code text-xs'>
                            {alert.code}
                        </code>
                    )}
                </div>
            </div>
            {alert.button && (
                <button
                    onClick={alert.button.onClick}
                    className='cradle-btn cradle-btn-sm'
                >
                    {alert.button.text}
                </button>
            )}
        </div>
    ) : null;
}
