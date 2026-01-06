import { Xmark } from 'iconoir-react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

/**
 * Alert color variants for dismissible alerts
 */
export type DismissibleAlertColor = 'green' | 'red' | 'gray';

/**
 * Dismissible alert object structure
 */
export interface DismissibleAlert {
    /** Whether to show the alert */
    show: boolean;
    /** Alert message text */
    message: string;
    /** Alert color variant */
    color: DismissibleAlertColor;
}

/**
 * AlertDismissible component props
 */
export interface AlertDismissibleProps {
    /** Alert configuration object */
    alert: DismissibleAlert | null;
    /** Alert state setter function */
    setAlert: Dispatch<SetStateAction<DismissibleAlert | null | string>>;
    /** Duration in milliseconds for which the alert should be displayed */
    duration?: number;
}

/**
 * AlertDismissible component - This component is used to display an alert that can be dismissed.
 * The component has an absolute position at the bottom right of the screen.
 * It has a progress bar that indicates the time left before the alert is dismissed.
 *
 * @example
 * ```tsx
 * const [alert, setAlert] = useState<DismissibleAlert>({
 *   show: true,
 *   message: 'Operation completed',
 *   color: 'green'
 * });
 *
 * <AlertDismissible
 *   alert={alert}
 *   setAlert={setAlert}
 *   duration={5000}
 * />
 * ```
 */
export default function AlertDismissible({
    alert,
    setAlert,
    duration = 3500.0,
}: AlertDismissibleProps): JSX.Element {
    const colorVariants: Record<DismissibleAlertColor, string> = {
        green: 'bg-success',
        red: 'bg-error',
        gray: 'bg-zinc-600',
    };

    const [timeLeft, setTimeLeft] = useState(duration);

    useEffect(() => {
        if (alert && alert.show) {
            setTimeLeft(duration);
            const timer = setTimeout(() => {
                setAlert({ ...alert, show: false });
            }, duration);

            // Update at 120Hz
            const secondInMiliseconds = 1000.0;
            const refreshRate = 120.0;
            const updateInterval = secondInMiliseconds / refreshRate;
            const interval = setInterval(() => {
                setTimeLeft((prevTimeLeft) => prevTimeLeft - updateInterval);
            }, updateInterval);

            return () => {
                clearTimeout(timer);
                clearInterval(interval);
            };
        }
    }, [alert, setAlert, duration]);

    return (
        <>
            {alert && alert.show && (
                <div
                    className={`${colorVariants[alert.color]} fixed z-50 bottom-2 right-6 text-white h-fit py-6 w-fit
            rounded-md shadow-lg flex flex-col items-center space-y-4 break-all max-w-[40%] max-h-full`}
                    data-testid='dismissable-alert'
                >
                    <div className='flex flex-row items-center justify-between px-4'>
                        <p>{alert.message}</p>
                        <button
                            className={`${colorVariants[alert.color]} hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors text-white font-bold py-2 pl-4 alert-dismiss-button`}
                            onClick={() => setAlert('')}
                        >
                            <Xmark strokeWidth='2' stroke='white' fill='none' />
                        </button>
                    </div>
                    <div
                        className={`${colorVariants[alert.color]} w-full rounded-md absolute bottom-0 px-2`}
                    >
                        <progress
                            value={timeLeft}
                            max={duration}
                            className='h-[0.3em] progress w-full !rounded-md opacity-75 bg-white [&::-webkit-progress-value]:bg-gray-300 [&::-moz-progress-bar]:bg-gray-300'
                        />
                    </div>
                </div>
            )}
        </>
    );
}
