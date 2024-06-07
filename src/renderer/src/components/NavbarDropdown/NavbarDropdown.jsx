/**
 * NavbarDropdown
 * A dropdown menu component for the navbar.
 * @param contents - the contents of the dropdown, need to be passed as an array of objects with label and handler fields
 * @param icon - the icon to display in the dropdown button
 * @param text - the tooltip text for the dropdown button
 * @returns {NavbarDropdown}
 * @constructor
 */
export default function NavbarDropdown({ contents, icon, text, testid }) {
    return (
        <div className="dropdown">
            <button className={`navbar-item hover:bg-gray-4 ${text ? "tooltip tooltip-bottom tooltip-primary" : ""}`} tabIndex="0" data-tooltip={text} data-testid={testid || ''}>{icon}</button>
            <div className="dropdown-menu border border-gray-10" data-testid="dropdown-menu">
                {contents && contents.length > 0 && contents.map((content, index) => (
                    <a key={index} className="dropdown-item text-sm" onClick={content.handler}>{content.label}</a>
                ))}
            </div>
        </div>
    );
}