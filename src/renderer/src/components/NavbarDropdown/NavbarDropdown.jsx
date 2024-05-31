/**
 * NavbarDropdown
 * A dropdown meny component for the navbar.
 * @param props - the contents of the dropdown and their handlers, icon for the dropdown
 * @param props.contents - the contents of the dropdown, need to be passed as an array of objects with label and handler fields
 * @param props.icon - the icon to display in the dropdown button
 * @returns {NavbarDropdown
 * @constructor
 */
export default function NavbarDropdown(props){
    return (
        <div className="dropdown">
            <button className="navbar-item hover:bg-gray-4 tooltip tooltip-bottom tooltip-primary" tabIndex="0" data-tooltip={props.text}>{props.icon}</button>
            <div className="dropdown-menu border border-gray-10">
                {props.contents.map((content, index) => (
                    <a key={index} className="dropdown-item text-sm" onClick={content.handler}>{content.label}</a>
                ))}
            </div>
        </div>
    );
}