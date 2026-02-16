import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Entity } from '@services/cradle/models';
import AddEntityForm from './add-entity-form';

interface AddEntityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd?: (result: Entity) => void;
}

export default function AddEntityDialog({
    open,
    onOpenChange,
    onAdd,
}: AddEntityDialogProps) {
    const handleAdd = (newEntity: Entity) => {
        if (onAdd) {
            onAdd(newEntity);
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>New Entity</DialogTitle>
                    <DialogDescription>Create new entity</DialogDescription>
                </DialogHeader>
                <AddEntityForm onAdd={handleAdd} />
            </DialogContent>
        </Dialog>
    );
}
