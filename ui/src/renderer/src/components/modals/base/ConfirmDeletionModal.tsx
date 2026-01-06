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
        <div className='min-w-[320px] max-w-md'>
            {/* Header with title and close button */}
            <div className='flex items-end justify-between mb-4'>
                <div className='flex items-center gap-3'>
                    <h2 className='text-xl font-semibold text-cradle-text-primary tracking-wide'>
                        Confirm Deletion
                    </h2>
                </div>
            </div>

            {/* Body text */}
            <p className='text-sm text-cradle-text-secondary mb-3 leading-relaxed'>
                {text}
            </p>

            {/* Confirmation input */}
            {confirmText && (
                <div className='mb-5'>
                    <label className='cradle-label mb-2 block'>
                        Type "
                        <span className='text-cradle-accent-primary'>
                            {confirmText}
                        </span>
                        " to confirm
                    </label>
                    <input
                        type='text'
                        className='cradle-input'
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={confirmText}
                    />
                </div>
            )}

            {/* Action buttons */}
            <div className='flex justify-end gap-2 mt-4 pt-3 cradle-border-t'>
                <button
                    type='button'
                    className='rounded-lg border border-cradle-border-accent bg-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors text-cradle-text-secondary text-sm px-3 py-1.5 flex items-center gap-1.5'
                    onClick={closeModal}
                >
                    <span>Cancel</span>
                </button>
                <button
                    type='button'
                    className='rounded-lg border border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/10 bg-transparent transition-colors text-sm px-3 py-1.5 flex items-center gap-1.5'
                    onClick={handleConfirm}
                    disabled={!isConfirmEnabled}
                >
                    <span>Delete</span>
                </button>
            </div>
        </div>
    );
}
