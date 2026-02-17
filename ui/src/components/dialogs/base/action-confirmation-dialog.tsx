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
import { useState } from 'react';

/**
 * ActionConfirmationDialog component props
 */
export interface ActionConfirmationDialogProps {
    /** Callback function to execute when the action is confirmed */
    onConfirm: () => void;
    /** Text to display in the modal body */
    text?: string;
    /** If provided, user must type this text exactly to enable the confirm button */
    confirmText?: string;
    /** Custom title for the dialog (defaults to "Confirm Action") */
    title?: string;
    /** Custom text for the confirm button (defaults to "Confirm") */
    confirmButtonText?: string;
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
}

/**
 * ActionConfirmationDialog component - displays a confirmation dialog for user actions
 *
 * Optionally requires the user to type a specific confirmation text before allowing confirmation.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <ActionConfirmationDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onConfirm={handleDelete}
 *   text="Are you sure you want to proceed?"
 *   confirmText="DELETE"
 * />
 * ```
 */
export default function ActionConfirmationDialog({
    onConfirm,
    text = 'Are you sure you want to proceed with this action? Please confirm to continue.',
    confirmText,
    title = 'Confirm Action',
    confirmButtonText = 'Confirm',
    open,
    onOpenChange,
}: ActionConfirmationDialogProps): React.JSX.Element {
    const [userInput, setUserInput] = useState('');

    // If confirmText is provided, enable confirm only when the input matches exactly.
    const isConfirmEnabled = confirmText ? userInput === confirmText : true;

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

                {confirmText && (
                    <FieldGroup className='gap-4'>
                        <Field>
                            <FieldLabel htmlFor='confirm-input'>
                                Type below to confirm
                            </FieldLabel>
                            <Input
                                id='confirm-input'
                                type='text'
                                placeholder={`Type "${confirmText}" to confirm`}
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
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
                        variant='default'
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
