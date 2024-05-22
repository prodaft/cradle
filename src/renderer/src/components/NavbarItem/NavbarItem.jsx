/**
 * NavbarItem - a button in the navbar.
 * @param props
 * @param props.icon - the icon to display in the button
 * @param props.onClick - the handler for the button
<<<<<<< HEAD
 * @returns {NavbarItem}
=======
 * @returns {JSX.Element}
>>>>>>> main
 * @constructor
 */
export default function NavbarItem(props){
    return (
	        <button className="navbar-item" onClick={props.onClick}>
                {props.icon}
            </button>
    );
}