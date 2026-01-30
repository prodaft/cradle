import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { JSX, useState } from 'react';

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
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{text}</DialogDescription>
                </DialogHeader>

                {confirmTextStripped && (
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor='confirm-input'>
                                Type below to confirm
                            </FieldLabel>
                            <Input
                                id='confirm-input'
                                type='text'
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder={`Type "${confirmTextStripped}" to confirm`}
                            />
                        </Field>
                    </FieldGroup>
                )}

                <DialogFooter>
                    <DialogClose asChild>
                        <Button type='button' variant='outline' size='sm'>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type='button'
                        variant='destructive'
                        size='sm'
                        onClick={handleConfirm}
                        disabled={!isConfirmEnabled}
                    >
                        {confirmButtonText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
