import rippleUiAlertIcon from '../../assets/ripple-ui-alert-icon.svg';

/**
 * AlertBox component - a styled in-line alert box with an icon and text
 *
 * @function AlertBox
 * @param {Object} props - The props object
 * @param {Alert} props.alert - The alert object to display
 * @returns {AlertBox}
 * @constructor
 */
export default function AlertBox({ alert }) {
    const colorVariants = {
        green: 'alert-success',
        red: 'alert-error',
    };

    return (
        alert.show && (
            <div
                data-testid='auth-err-alert'
                className={`alert ${colorVariants[alert.color]}`}
            >
                <img src={rippleUiAlertIcon} alt='alert icon' className='w-6 h-6' />
                <div className='flex flex-col text-black dark:text-white'>
                    <span>{alert.message}</span>
                </div>
            </div>
        )
    );
}
