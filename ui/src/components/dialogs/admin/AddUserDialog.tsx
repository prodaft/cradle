import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { UserRetrieve } from '@services/cradle/models';
import AddUserForm from '../../domain/admin/forms/AddUserForm';

interface AddUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd?: (result: UserRetrieve) => void;
}

export default function AddUserDialog({
    open,
    onOpenChange,
    onAdd,
}: AddUserDialogProps) {
    const handleAdd = (newUser: UserRetrieve) => {
        if (onAdd) {
            onAdd(newUser);
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add User</DialogTitle>
                    <DialogDescription>Create a new user account</DialogDescription>
                </DialogHeader>
                <AddUserForm onAdd={handleAdd} />
            </DialogContent>
        </Dialog>
    );
}
