import { WarningCircle, Xmark } from 'iconoir-react';
import { useState } from 'react';

/**
 * ActionConfirmationModal component props
 */
export interface ActionConfirmationModalProps {
    /** Callback function to execute when the action is confirmed */
    onConfirm: () => void;
    /** Text to display in the modal body */
    text?: string;
    /** If provided, user must type this text exactly to enable the confirm button */
    confirmText?: string;
    /** Function to close the modal */
    closeModal: () => void;
}

/**
 * ActionConfirmationModal component - displays a confirmation dialog for user actions
 *
 * Optionally requires the user to type a specific confirmation text before allowing confirmation.
 *
 * @example
 * ```tsx
 * <ActionConfirmationModal
 *   onConfirm={handleDelete}
 *   text="Are you sure you want to proceed?"
 *   confirmText="DELETE"
 *   closeModal={closeModal}
 * />
 * ```
 */
export default function ActionConfirmationModal({
    onConfirm,
    text = 'Are you sure you want to proceed with this action?',
    confirmText,
    closeModal,
}: ActionConfirmationModalProps): JSX.Element {
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
        <div className='min-w-[320px] max-w-md'>
            {/* Header with icon and close button */}
            <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-3'>
                    <div className='p-2 bg-cradle-accent-warning/10 text-cradle-accent-warning'>
                        <WarningCircle className='w-5 h-5' />
                    </div>
                    <h2 className='text-lg font-semibold text-cradle-text-primary tracking-wide'>
                        Confirm Action
                    </h2>
                </div>
                <button
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
                        placeholder={confirmText}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                    />
                </div>
            )}

            {/* Action buttons */}
            <div className='flex gap-3 pt-2'>
                <button
                    className='cradle-btn flex-1'
                    onClick={closeModal}
                >
                    Cancel
                </button>
                <button
                    className='cradle-btn cradle-btn-primary flex-1'
                    onClick={handleConfirm}
                    disabled={!isConfirmEnabled}
                >
                    Confirm
                </button>
            </div>
        </div>
    );
}
