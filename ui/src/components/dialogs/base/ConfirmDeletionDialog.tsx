import { JSX, useState } from 'react';
import { Button } from 'src/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from 'src/components/ui/dialog';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';

/**
 * ConfirmDeletionDialog component props
 */
export interface ConfirmDeletionDialogProps {
    /** Callback function to execute when deletion is confirmed */
    onConfirm: () => void;
    /** Text to display in the modal body */
    text?: string;
    /** If provided, user must type this text exactly to enable the delete button */
    confirmText?: string;
    /** Custom title for the dialog (defaults to "Confirm Deletion") */
    title?: string;
    /** Custom text for the confirm button (defaults to "Delete") */
    confirmButtonText?: string;
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
}

/**
 * ConfirmDeletionDialog component - displays a confirmation dialog for deletion actions
 *
 * Optionally requires the user to type a specific confirmation text before allowing deletion.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <ConfirmDeletionDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onConfirm={handleDelete}
 *   text="This will permanently delete all data."
 *   confirmText="DELETE"
 * />
 * ```
 */
export default function ConfirmDeletionDialog({
    onConfirm,
    text = 'Are you sure you want to delete? This action is irreversible.',
    confirmText,
    title = 'Confirm Deletion',
    confirmButtonText = 'Delete',
    open,
    onOpenChange,
}: ConfirmDeletionDialogProps): JSX.Element {
    const confirmTextStripped = confirmText?.trim();
    const [userInput, setUserInput] = useState('');

    // If confirmText is provided, enable confirm only when the input matches
    const isConfirmEnabled = confirmTextStripped
        ? userInput === confirmTextStripped
        : true;

    const handleConfirm = () => {
        if (isConfirmEnabled) {
            onConfirm();
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{text}</DialogDescription>
                </DialogHeader>

                {/* Confirmation input */}
                {confirmTextStripped && (
                    <div className='grid w-full items-center gap-3 mb-5'>
                        <Label htmlFor='confirm-input'>
                            Type{' '}
                            <span className='text-border-primary'>
                                "{confirmTextStripped}"
                            </span>
                            to confirm
                        </Label>
                        <Input
                            id='confirm-input'
                            type='text'
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder={confirmTextStripped}
                        />
                    </div>
                )}

                {/* Action buttons */}
                <div className='flex justify-end gap-2 mt-4'>
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => onOpenChange(false)}
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
                        {confirmButtonText}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
