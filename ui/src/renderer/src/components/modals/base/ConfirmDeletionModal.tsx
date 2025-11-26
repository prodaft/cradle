import { useState } from 'react';

/**
 * ConfirmDeletionModal component props
 */
export interface ConfirmDeletionModalProps {
    /** Callback function to execute when deletion is confirmed */
    onConfirm: () => void;
    /** Text to display in the modal body */
    text?: string;
    /** If provided, user must type this text exactly to enable the delete button */
    confirmText?: string;
    /** Function to close the modal */
    closeModal: () => void;
}

/**
 * ConfirmDeletionModal component - displays a confirmation dialog for deletion actions
 *
 * Optionally requires the user to type a specific confirmation text before allowing deletion.
 *
 * @example
 * ```tsx
 * <ConfirmDeletionModal
 *   onConfirm={handleDelete}
 *   text="This will permanently delete all data."
 *   confirmText="DELETE"
 *   closeModal={closeModal}
 * />
 * ```
 */
export default function ConfirmDeletionModal({
    onConfirm,
    text = 'Are you sure you want to delete? This action is irreversible.',
    confirmText,
    closeModal,
}: ConfirmDeletionModalProps): JSX.Element {
    const [userInput, setUserInput] = useState('');

    // If confirmText is provided, enable confirm only when the input matches
    const isConfirmEnabled = confirmText ? userInput === confirmText : true;

    const handleConfirm = () => {
        if (isConfirmEnabled) {
            onConfirm();
            // Optionally close the modal if a close function is provided
            if (closeModal) closeModal();
        }
    };

    return (
        <div className=''>
            <h2 className='text-2xl font-bold mb-4'>Confirm Deletion</h2>
            <p className='mb-4'>{text}</p>
            {confirmText && (
                <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-500 mb-1'>
                        Please type "<span className='font-bold'>{confirmText}</span>"
                        to confirm:
                    </label>
                    <input
                        type='text'
                        className='input input-block w-full'
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={`Type "${confirmText}" here`}
                    />
                </div>
            )}
            <div className='flex justify-center gap-2'>
                <button className='btn w-full' onClick={closeModal}>
                    Cancel
                </button>
                <button
                    className='btn btn-error w-full'
                    onClick={handleConfirm}
                    disabled={!isConfirmEnabled}
                >
                    Delete
                </button>
            </div>
        </div>
    );
}
