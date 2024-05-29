import React from "react";

/**
 * This component is used to display a confirmation dialog.
 * The dialog will display a title and a description.
 * The dialog will have multiple buttons based on the `buttons` prop.
 * When a button is clicked, its corresponding handler function will be called.
 * 
 * @param {boolean} open - Whether the dialog should be open or not
 * @param {function} setOpen - A function to open an close the dialog
 * @param {object} buttons - An object with button labels as keys and handler functions as values
 * @param {string} title - The title of the dialog
 * @param {string} description - The description of the dialog
 * @returns {MultipleChoiceDialog}
 * @constructor
 */
export default function MultipleChoiceDialog({ open, setOpen, buttons, title, description }) {
    const handleOpen = () => {
        setOpen(!open);
    }

    return (
        <>
            {open && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-black bg-opacity-50 absolute inset-0" onClick={handleOpen}></div>
                    <div className="bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl relative z-10 w-full max-w-lg mx-auto">
                        <div className="mb-4 text-xl font-bold">{title}</div>
                        <div className="mb-6">{description}</div>
                        <div className="flex justify-end space-x-2">
                            <button className="btn btn-ghost" onClick={handleOpen}>
                                Cancel
                            </button>
                            {Object.entries(buttons).map(([label, handler], index) => (
                                <button
                                    key={index}
                                    className="btn btn-primary text-black dark:text-white"
                                    onClick={() => {
                                        handler();
                                        handleOpen();
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
