import React, { useState, useEffect } from 'react';
import rippleUiAlertIcon from '../../assets/ripple-ui-alert-icon.svg';

/**
 * AlertBox component - a styled in-line alert box with an icon, text, and optional button.
 *
 * Now supports an optional timeout (in milliseconds) to auto-dismiss the alert.
 *
 * @function AlertBox
 * @param {Object} props - The props object.
 * @param {Alert} props.alert - The alert object to display.
 * @param {number} [props.timeout] - Optional timeout in ms after which the alert should auto-dismiss.
 * @returns {JSX.Element|null} The AlertBox component.
 */
export default function AlertBox({ alert, timeout }) {
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

    const colorVariants = {
        green: 'alert-success',
        red: 'alert-error',
        yellow: 'alert-warning',
    };

    const buttonColorVariants = {
        green: 'bg-green-200 hover:bg-green-300 dark:bg-green-700 dark:hover:bg-green-600',
        red: 'bg-red-200 hover:bg-red-300 dark:bg-red-700 dark:hover:bg-red-600',
        yellow: 'bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-700 dark:hover:bg-yellow-600',
    };

    const renderIcon = () => {
        switch (alert.color) {
            case 'green':
                return (
                    <svg
                        width='36'
                        height='36'
                        viewBox='0 0 48 48'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <path
                            fillRule='evenodd'
                            d='M24 4C12.96 4 4 12.96 4 24C4 35.04 12.96 44 24 44C35.04 44 44 35.04 44 24C44 12.96 35.04 4 24 4ZM18.58 32.58L11.4 25.4C10.62 24.62 10.62 23.36 11.4 22.58C12.18 21.8 13.44 21.8 14.22 22.58L20 28.34L33.76 14.58C34.54 13.8 35.8 13.8 36.58 14.58C37.36 15.36 37.36 16.62 36.58 17.4L21.4 32.58C20.64 33.36 19.36 33.36 18.58 32.58Z'
                            fill='#00BA34'
                        />
                    </svg>
                );
            case 'red':
                return (
                    <img src={rippleUiAlertIcon} alt='alert icon' className='w-6 h-6' />
                );
            case 'yellow':
                return (
                    <svg
                        width='36'
                        height='36'
                        viewBox='0 0 48 48'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <path
                            fillRule='evenodd'
                            clipRule='evenodd'
                            d='M2 42L24 6L46 42H2ZM24 35C22.9 35 22 34.1 22 33C22 31.9 22.9 31 24 31C25.1 31 26 31.9 26 33C26 34.1 25.1 35 24 35ZM24 29C22.9 29 22 28.1 22 27V19C22 17.9 22.9 17 24 17C25.1 17 26 17.9 26 19V27C26 28.1 25.1 29 24 29Z'
                            fill='#FFC107'
                        />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        visible && (
            <div
            
                data-testid='auth-err-alert'
                className={`alert ${colorVariants[alert.color]} flex items-center justify-between`}
            >
                <div className='flex items-center space-x-2'>
                    {renderIcon()}
                    <div className={`flex flex-col text-black dark:text-white ${alert.code ? 'items-center' : ''}`}>
                        <span>{alert.message}</span>
                        {alert.code && (
                        <code className="block bg-gray-800 bg-opacity-10 dark:bg-white dark:bg-opacity-10 p-1 px-2 mt-1 rounded text-center select-all">
                            {alert.code}
                            </code>
                        )}
                    </div>
                </div>
                {alert.button && (
                    <button
                        onClick={alert.button.onClick}
                        className={`ml-4 px-3 py-1 rounded transition-colors ${buttonColorVariants[alert.color]}`}
                    >
                        {alert.button.text}
                    </button>
                )}
                    </div>
        )
    );
}
