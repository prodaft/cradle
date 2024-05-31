import {useId} from "react";

/**
 * NavbarSwitch
 * A switch component for the navbar.
 * @param props
 * @param props.label - the label for the switch
 * @param props.checked - the checked status of the switch
 * @param props.onChange - the handler for the switch
 * @returns {NavbarSwitch}
 * @constructor
 */
export default function NavbarSwitch(props){
    const id = useId();

    return (
        <button className="navbar-item hover:bg-gray-4">
            <div className="flex flex-row items-center w-fit h-fit">
                <label htmlFor={id} className="mr-2 text-cradle2">{props.label}</label>
                <input type="checkbox" id={id} className="switch focus:ring-0" checked={props.checked} onChange={props.onChange}/>
            </div>
        </button>
    );
}