import React from "react";

export function ConfirmationDialog({ open, setOpen, handleConfirm, title, description }) {
    const handleOpen = () => setOpen(!open);

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
                            <button className="btn btn-success" onClick={() => {
                                handleConfirm();
                                handleOpen();
                            }}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
