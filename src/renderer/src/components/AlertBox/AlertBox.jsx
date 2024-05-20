import rippleUiAlertIcon from '../../assets/ripple-ui-alert-icon.svg';

/**
 * AlertBox component - a styled alert box with an icon and text
 * @param title - title
 * @param text - optional information text
 * @returns {JSX.Element}
 * @constructor
 */
export default function AlertBox({title,text}) {
    return (
        <div className="alert alert-error" data-testid="auth-err-alert">
            <img src={rippleUiAlertIcon} alt="alert icon" className="w-6 h-6"/>
            <div className="flex flex-col">
                <span>{title}</span>
                <span className="text-content2">{text}</span>
            </div>
        </div>
    );
}