import NavbarButton from "../NavbarButton/NavbarButton";
import { Notes } from 'iconoir-react';
import SearchDialog from "../SearchDialog/SearchDialog";
import { useState } from "react";
import NavbarSwitch from "../NavbarSwitch/NavbarSwitch";
import NavbarDropdown from "../NavbarDropdown/NavbarDropdown";

/**
 * Navbar component - the main navigation bar for the application.
 * @param props - contents and handlers for the navbar
 * @param props.contents - the contents of the navbar set by other components
 * @param props.handleFleetingNotes - handler for the Fleeting Notes action
 * @returns {Navbar}
 * @constructor
 */
export default function Navbar(props) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <div className="navbar p-0.5 sticky top-0 rounded-md bg-gray-2 w-full h-fit z-50 px-4" data-testid="navbar-test">
            <div className="h-fit navbar-start w-[40%] min-w-28">
                <input className="input-sm input-block input-ghost-primary input focus:border-primary focus:ring-0"
                    placeholder={"Search"} onClick={() => setIsDialogOpen(true)} />
                <SearchDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
            </div>
            <div className="w-full justify-end h-fit navbar-center">
                {props.contents}
            </div>
            <div className="w-fit h-fit navbar-end">
                <NavbarButton text="Fleeting Notes" icon={<Notes />} onClick={props.handleFleetingNotes} />
            </div>
        </div>
    );
}