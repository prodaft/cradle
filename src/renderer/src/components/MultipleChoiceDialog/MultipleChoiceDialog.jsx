import React from 'react';

/**
 * @typedef {Object} Button
 * @property {string} label - the text of the button
 * @property {Function} handler - the handler function of the button
 */

/**
 * This component is used to display a confirmation dialog.
 * The dialog will display a title and a description.
 * The dialog will have multiple buttons based on the `buttons` prop.
 * When a button is clicked, its corresponding handler function will be called.
 *
 * @function MultipleChoiceDialog
 * @param {Object} props - the props object
 * @param {boolean} props.open - Whether the dialog should be open or not
 * @param {StateSetter<boolean>} props.setOpen - A function to open an close the dialog
 * @param {Array<Button>} props.buttons - An array of objects with the keys `label` and `handler`
 * @param {string} props.title - The title of the dialog
 * @param {string} props.description - The description of the dialog
 * @returns {MultipleChoiceDialog}
 * @constructor
 */
export default function MultipleChoiceDialog({
    open,
    setOpen,
    buttons,
    title,
    description,
}) {
    const toggleOpen = () => {
        setOpen(!open);
    };

    return (
        <>
            {open && (
                <div className='fixed inset-0 flex items-center justify-center z-50'>
                    <div
                        className='bg-black bg-opacity-50 absolute inset-0'
                        onClick={toggleOpen}
                    ></div>
                    <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl relative z-10 w-full max-w-lg mx-auto'>
                        <div className='mb-4 text-xl font-bold'>{title}</div>
                        <div className='mb-6'>{description}</div>
                        <div className='flex justify-between space-x-2'>
                            <button className='btn btn-ghost' onClick={toggleOpen}>
                                Cancel
                            </button>
                            <span className='flex flex-row'>
                                {buttons.map((button, index) => (
                                    <button
                                        key={index}
                                        className='btn btn-primary text-black dark:text-white'
                                        onClick={() => {
                                            button.handler();
                                            toggleOpen();
                                        }}
                                    >
                                        {button.label}
                                    </button>
                                ))}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
