import { Trash, Xmark } from 'iconoir-react';
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
            {/* Header with icon and close button */}
            <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-3'>
                    <div className='p-2 bg-cradle-accent-error/10 text-cradle-accent-error'>
                        <Trash className='w-5 h-5' />
                    </div>
                    <h2 className='text-lg font-semibold text-cradle-text-primary tracking-wide'>
                        Confirm Deletion
                    </h2>
                </div>
                <button
                    type='button'
                    className='cradle-btn p-2 rounded-full'
                    onClick={closeModal}
                    title='Close'
                >
                    <Xmark width={16} height={16} />
                </button>
            </div>

            {/* Body text */}
            <p className='text-sm text-cradle-text-secondary mb-5 leading-relaxed'>
                {text}
            </p>

            {/* Confirmation input */}
            {confirmText && (
                <div className='mb-5'>
                    <label className='cradle-label mb-2 block'>
                        Type "<span className='text-cradle-accent-primary'>{confirmText}</span>" to confirm
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

            {/* Action button */}
            <div className='pt-2'>
                <button
                    className='cradle-btn cradle-btn-danger w-full'
                    onClick={handleConfirm}
                    disabled={!isConfirmEnabled}
                >
                    Delete
                </button>
            </div>
        </div>
    );
}
