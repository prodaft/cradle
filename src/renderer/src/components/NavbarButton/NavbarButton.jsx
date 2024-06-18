/**
 * NavbarButton - a button in the navbar.
 * @param {*} icon - the icon to display in the button
 * @param {string} text - the tooltip text for the button
 * @param {() => void} onClick - the handler for the button
 * @returns {NavbarButton}
 * @constructor
 */
export default function NavbarButton({ onClick, text, icon, testid }) {
    return (
        <button
            className={`navbar-item hover:bg-gray-4 ${text ? 'tooltip tooltip-bottom tooltip-primary' : ''}`}
            onClick={onClick}
            data-tooltip={text}
            data-testid={testid || ''}
        >
            {icon}
        </button>
    );
}
