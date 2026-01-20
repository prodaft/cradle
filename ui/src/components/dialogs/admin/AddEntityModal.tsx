import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Entity } from '@services/cradle/models';
import AddEntityForm from '../../domain/admin/forms/AddEntityForm';

interface AddEntityModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd?: (result: Entity) => void;
}

export default function AddEntityModal({
    open,
    onOpenChange,
    onAdd,
}: AddEntityModalProps) {
    const handleAdd = (newEntity: Entity) => {
        if (onAdd) {
            onAdd(newEntity);
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Entity</DialogTitle>
                    <DialogDescription>Create new entity</DialogDescription>
                </DialogHeader>
                <AddEntityForm onAdd={handleAdd} />
            </DialogContent>
        </Dialog>
    );
}
