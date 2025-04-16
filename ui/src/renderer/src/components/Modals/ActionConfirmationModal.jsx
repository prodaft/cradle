import React, { useState } from 'react';

const ActionConfirmationModal = ({
    onConfirm,
    text = 'Are you sure you want to proceed with this action?',
    confirmText,
    closeModal,
}) => {
    const [userInput, setUserInput] = useState('');

    // If confirmText is provided, enable confirm only when the input matches exactly.
    const isConfirmEnabled = confirmText ? userInput === confirmText : true;

    const handleConfirm = () => {
        if (isConfirmEnabled) {
            onConfirm();
            if (closeModal) closeModal();
        }
    };

    return (
        <div className=''>
            <h2 className='text-2xl font-bold mb-4'>Confirm Action</h2>
            <p className='mb-4'>{text}</p>
            {confirmText && (
                <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Please type "<span className='font-bold'>{confirmText}</span>"
                        to confirm:
                    </label>
                    <input
                        type='text'
                        className='input input-bordered w-full'
                        placeholder={`Type "${confirmText}" here`}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                    />
                </div>
            )}
            <div className='flex justify-end gap-2'>
                <button className='btn' onClick={closeModal}>
                    Cancel
                </button>
                <button
                    className='btn btn-primary'
                    onClick={handleConfirm}
                    disabled={!isConfirmEnabled}
                >
                    Confirm
                </button>
            </div>
        </div>
    );
};

export default ActionConfirmationModal;
