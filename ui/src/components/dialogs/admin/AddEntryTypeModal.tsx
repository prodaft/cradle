import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { EntryClass } from '@services/cradle/models';
import { XIcon } from 'lucide-react';
import AddEntryForm from '../../domain/admin/forms/AddEntryForm';

interface AddEntryTypeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd?: (result: EntryClass) => void;
}

export default function AddEntryTypeModal({
    open,
    onOpenChange,
    onAdd,
}: AddEntryTypeModalProps) {
    const handleAdd = (newEntryType: EntryClass) => {
        if (onAdd) {
            onAdd(newEntryType);
        }
        onOpenChange(false);
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    className={cn(
                        'fixed inset-0 z-50 bg-black/50',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        'grid place-items-center overflow-y-auto',
                    )}
                >
                    <DialogPrimitive.Content
                        className={cn(
                            'bg-background relative',
                            'data-[state=open]:animate-in data-[state=closed]:animate-out',
                            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                            'w-full max-w-lg gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none',
                            'my-8',
                        )}
                    >
                        <DialogHeader>
                            <DialogTitle>New Entry</DialogTitle>
                            <DialogDescription>
                                Create new entry class
                            </DialogDescription>
                        </DialogHeader>
                        <AddEntryForm onAdd={handleAdd} />
                        <DialogPrimitive.Close className='ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none'>
                            <XIcon className='h-4 w-4' />
                            <span className='sr-only'>Close</span>
                        </DialogPrimitive.Close>
                    </DialogPrimitive.Content>
                </DialogPrimitive.Overlay>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
