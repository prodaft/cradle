import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { EntryClass } from '@services/cradle/models';
import AddEntryForm from '../../domain/admin/forms/AddEntryForm';

interface AddEntryTypeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd?: (result: EntryClass) => void;
}

export default function AddEntryTypeDialog({
    open,
    onOpenChange,
    onAdd,
}: AddEntryTypeDialogProps) {
    const handleAdd = (newEntryType: EntryClass) => {
        if (onAdd) {
            onAdd(newEntryType);
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col'>
                <DialogHeader className='shrink-0'>
                    <DialogTitle>New Entry</DialogTitle>
                    <DialogDescription>Create new entry class</DialogDescription>
                </DialogHeader>
                <div className='overflow-y-auto flex-1 -mx-6 px-6'>
                    <AddEntryForm onAdd={handleAdd} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
