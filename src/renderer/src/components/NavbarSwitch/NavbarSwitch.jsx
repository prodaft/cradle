import {useId} from "react";

/**
 * NavbarSwitch
 * A switch component for the navbar.
 * @param label - the label for the switch
 * @param checked - the checked status of the switch
 * @param onChange - the handler for the switch
 * @returns {NavbarSwitch}
 * @constructor
 */
export default function NavbarSwitch({label,checked, onChange}){
    const id = useId();

    return (
        <button className="navbar-item hover:bg-gray-4">
            <div className="flex flex-row items-center w-fit h-fit">
                <label htmlFor={id} className="mr-2 text-cradle2">{label}</label>
                <input type="checkbox" id={id} className="switch focus:ring-0" checked={checked} onChange={onChange}/>
            </div>
        </button>
    );
}