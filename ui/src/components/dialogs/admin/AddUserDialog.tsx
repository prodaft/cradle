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
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>Add User</DialogTitle>
                    <DialogDescription>Create a new user account</DialogDescription>
                </DialogHeader>
                <div className='no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4'>
                    <AddUserForm onAdd={handleAdd} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
