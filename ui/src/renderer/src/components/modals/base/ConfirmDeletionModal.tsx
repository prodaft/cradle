import { useState } from 'react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
        <>
            <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>{text}</DialogDescription>
            </DialogHeader>

            {/* Confirmation input */}
            {confirmText && (
                <div className='grid w-full items-center gap-3 mb-5'>
                    <Label htmlFor='confirm-input'>
                        Type "<span className='text-cradle-accent-primary'>{confirmText}</span>" to confirm
                    </Label>
                    <Input
                        id='confirm-input'
                        type='text'
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={confirmText}
                    />
                </div>
            )}

            {/* Action buttons */}
            <div className='flex justify-end gap-2 mt-4'>
                <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={closeModal}
                >
                    Cancel
                </Button>
                <Button
                    type='button'
                    variant='destructive'
                    size='sm'
                    onClick={handleConfirm}
                    disabled={!isConfirmEnabled}
                >
                    Delete
                </Button>
            </div>
        </>
    );
}
