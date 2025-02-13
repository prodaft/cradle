/**
 * NavbarButton - a button in the navbar.
 *
 * @function NavbarButton
 * @param {Object} props - the props object
 * @param {any} props.icon - the icon to display in the button
 * @param {string} props.text - the tooltip text for the button
 * @param {Function} props.onClick - the handler for the button
 * @returns {NavbarButton}
 * @constructor
 */
export default function NavbarButton({ onClick, text, icon, testid }) {
    return (
        <button
            className={`navbar-item text-cradle2 hover:bg-gray-4 ${text ? 'tooltip tooltip-bottom tooltip-primary' : ''}`}
            onClick={onClick}
            data-tooltip={text}
            data-testid={testid || ''}
        >
            {icon}
        </button>
    );
}
