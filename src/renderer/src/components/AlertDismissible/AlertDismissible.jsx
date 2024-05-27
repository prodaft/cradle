import React from "react";
import { Xmark } from "iconoir-react";

/**
 * AlertDismissible component - This component is used to display an alert that can be dismissed.
 * The component has an absolute position at the bottom right of the screen.
 * @param alert
 * @param setAlert
 * @param content
 * @param color - The background color of the alert. Use colorVariants to define classes for different colors.
 * @returns {AlertDismissible}
 * @constructor
 */
export function AlertDismissible({ alert, setAlert, color = "red" }) {
    const colorVariants = {
        green: 'bg-success',
        red: 'bg-error',
    }

    return (
        <>
            {alert && (
                <div className={`${colorVariants[color]} absolute bottom-2 right-6  text-white h-fit py-6 px-4 w-fit
                 rounded-md shadow-lg flex items-center space-x-4 break-all max-w-[40%] max-h-full`}>
                    <div>{alert}</div>
                    <button
                        className={`${colorVariants[color]} hover:opacity-90 text-white font-bold py-2 px-4 rounded-xl`}
                        onClick={() => setAlert("")}
                    >
                        <Xmark color="gray-12" strokeWidth="2" />
                    </button>
                </div>
            )}
        </>
    );
}
