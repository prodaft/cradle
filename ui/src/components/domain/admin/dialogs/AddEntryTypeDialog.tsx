import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { EntryClass } from '@services/cradle/models';
import AddEntryForm from '../forms/AddEntryForm';

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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Entry</DialogTitle>
                    <DialogDescription>Create new entry class</DialogDescription>
                </DialogHeader>
                <div className='no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4'>
                    <AddEntryForm onAdd={handleAdd} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
