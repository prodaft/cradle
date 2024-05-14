import NavbarItem from "../NavbarItem/NavbarItem";
import {Notes} from 'iconoir-react';

/**
 * Navbar component - the main navigation bar for the application.
 * @param props - contents and handlers for the navbar
 * @param props.contents - the contents of the navbar set by other components
 * @param props.handleFleetingNotes - handler for the Fleeting Notes action
 * @returns {JSX.Element}
 * @constructor
 */
export default function Navbar(props){

    return (
        <div className="navbar p-0.5 sticky top-0 rounded-md bg-gray-2 w-full h-fit -z-0" data-testid="navbar-test">
            <div className="w-fit h-fit navbar-start">
                <input className="input-sm input-block input-ghost-primary input focus:border-primary focus:ring-0 w-96"
                       placeholder={"Search"}/>
            </div>
            <div className="w-full justify-end h-fit navbar-center">
                {props.contents}
            </div>
            <div className="w-fit h-fit navbar-end">
                <NavbarItem text="Fleeting Notes" icon={<Notes/>} onClick={props.handleFleetingNotes}/>
            </div>
        </div>
    );
}