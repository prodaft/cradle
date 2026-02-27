import ConfirmDeletionDialog from '@/components/dialogs/base/confirm-deletion-dialog';
import { Button } from '@/components/ui/button';
import { TrashIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

interface Note {
    id: string;
    fleeting: boolean;
    [key: string]: any;
}

interface DeleteNoteProps {
    note: Note;
    setHidden: (hidden: boolean) => void;
    classNames?: string;
}

/**
 * Note component - This component is used to display a note on the dashboard.
 * @function Note
 * @param {Object} props - Component props
 * @param {string} props.id - The note ID
 * @param {Object} props.note - The note object
 * @param {boolean} props.publishMode - Whether the component is in publish mode
 * @param {Array} props.selectedNoteIds - Array of selected note IDs
 * @param {Function} props.setSelectedNoteIds - Function to set selected note IDs
 * @param {boolean} props.draggable - Whether the note is draggable
 * @param {React.ReactNode} props.customControls - Custom controls to display in the header
 * @param {boolean} props.hideDefaultControls - Whether to hide the default controls
 */
export default function DeleteNote({ note, setHidden, classNames }: DeleteNoteProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.DELETE('/notes/{note_id}/', {
                params: { path: { note_id: note.id } },
            });
            if (error) throw { response, error };
            setHidden(true);
        },
        meta: {
            successMessage: 'Note deleted successfully',
        },
    });

    const handleDelete = () => deleteMutation.mutate();

    return (
        <>
            <span className='pb-1 space-x-1 flex pl-2 text-destructive hover:text-destructive/80'>
                <Button
                    variant='ghost'
                    size='icon-sm'
                    className='text-destructive hover:text-destructive/80'
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDeleteDialogOpen(true);
                    }}
                >
                    <TrashIcon className={classNames} weight='bold' />
                </Button>
            </span>
            <ConfirmDeletionDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDelete}
                text='Are you sure you want to delete this note? This action is irreversible.'
            />
        </>
    );
}
