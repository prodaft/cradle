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
                {alert.color == 'green' && (
                    <svg
                        width='36'
                        height='36'
                        viewBox='0 0 48 48'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <path
                            fill-rule='evenodd'
                            clip-rule='evenodd'
                            d='M24 4C12.96 4 4 12.96 4 24C4 35.04 12.96 44 24 44C35.04 44 44 35.04 44 24C44 12.96 35.04 4 24 4ZM18.58 32.58L11.4 25.4C10.62 24.62 10.62 23.36 11.4 22.58C12.18 21.8 13.44 21.8 14.22 22.58L20 28.34L33.76 14.58C34.54 13.8 35.8 13.8 36.58 14.58C37.36 15.36 37.36 16.62 36.58 17.4L21.4 32.58C20.64 33.36 19.36 33.36 18.58 32.58Z'
                            fill='#00BA34'
                        />
                    </svg>
                )}
                {alert.color == 'red' && (
                    <img src={rippleUiAlertIcon} alt='alert icon' className='w-6 h-6' />
                )}
                <div className='flex flex-col text-black dark:text-white'>
                    <span>{alert.message}</span>
                </div>
            </div>
        )
    );
}
