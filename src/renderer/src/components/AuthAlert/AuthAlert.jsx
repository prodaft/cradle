import rippleUiAlertIcon from '../../assets/ripple-ui-alert-icon.svg';

export default function AuthAlert(props) {
    return (
        <div className="alert alert-error" data-testid="auth-err-alert">
            <img src={rippleUiAlertIcon} alt="alert icon" className="w-6 h-6"/>
            <div className="flex flex-col">
                <span>{props.title}</span>
                <span className="text-content2">{props.text}</span>
            </div>
        </div>
    );
}