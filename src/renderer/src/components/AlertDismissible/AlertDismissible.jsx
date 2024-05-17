import React from "react";
import {Xmark} from "iconoir-react";

/**
 * AlertDismissible component - This component is used to display an alert that can be dismissed.
 * The component has an absolute position at the bottom right of the screen.
 * @param open
 * @param setOpen
 * @param content
 * @returns {Element}
 * @constructor
 */
export function AlertDismissible({ open, setOpen, content }) {
    return (
        <>
            {open && (
                <div className="absolute bottom-2 right-6 bg-error text-white h-fit py-6 px-4 w-fit rounded-md shadow-lg flex items-center space-x-4">
                    <div>{content}</div>
                    <button
                        className="bg-error hover:opacity-90 text-white font-bold py-2 px-4 rounded-xl"
                        onClick={() => setOpen(false)}
                    >
                        <Xmark />
                    </button>
                </div>
            )}
        </>
    );
}
