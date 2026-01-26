import { useState } from 'react';
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{text}</DialogDescription>
                </DialogHeader>

                {/* Confirmation input */}
                {confirmText && (
                    <div className='grid w-full items-center gap-3 mb-5'>
                        <Label htmlFor='confirm-input'>
                            Type "
                            <span className='text-border-primary'>{confirmText}</span>"
                            to confirm
                        </Label>
                        <Input
                            id='confirm-input'
                            type='text'
                            placeholder={confirmText}
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
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
                        variant='default'
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
