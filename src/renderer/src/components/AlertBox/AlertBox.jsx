import rippleUiAlertIcon from '../../assets/ripple-ui-alert-icon.svg';

/**
 * AlertBox component - a styled alert box with an icon and text
 * @param title - title
 * @param text - optional information text
 * @returns {JSX.Element}
 * @constructor
 */
export default function AlertBox({ title = "Error", text = "", color = "red" }) {
    const colorVariants = {
        green: 'alert-success',
        red: 'alert-error',
    }

    return (
        <div data-testid="auth-err-alert" className={`alert ${colorVariants[color]}`}>
            <img src={rippleUiAlertIcon} alt="alert icon" className="w-6 h-6"/>
            <div className="flex flex-col text-white">
                <span>{title}</span>
                <span className="text-content2">{text}</span>
            </div>
        </div>
    );
}