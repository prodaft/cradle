import {PlusCircle} from "iconoir-react";

export default function AdminPanelSection(props) {
    return (
            <div className="w-full h-full bg-gray-2 rounded-md p-3">
                <div className="w-full h-fit flex flex-row">
                    <h1 className="text-xl font-bold">{props.title}</h1>
                    <div className="h-fit w-full"></div>
                    {props.addEnabled && <span className="tooltip tooltip-bottom" data-tooltip={props.addTooltipText}>
                        <button className="w-fit h-fit m-1" onClick={props.handleAdd}>
                            <PlusCircle></PlusCircle>
                        </button>
                    </span>}
                </div>
                {props.children}
            </div>
    );
}