import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/hooks/query/query-keys';
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
 * DeleteNote - Trash button with confirmation dialog for deleting a note.
 * @param note - The note to delete (must have id)
 * @param setHidden - Callback to hide the note from the UI after deletion
 * @param classNames - Optional class names for the icon
 */
export default function DeleteNote({ note, setHidden, classNames }: DeleteNoteProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.DELETE('/notes/{note_id}/', {
                params: { path: { note_id: String(note.id) } },
            });
            if (error) throw { response, error };
            setHidden(true);
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.notes.apiList() }],
            successMessage: 'Note deleted successfully',
        },
    });

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync();
            setDeleteDialogOpen(false);
        } catch {
            // Error toast handled by mutation cache
        }
    };

    return (
        <>
            <span className='pb-1 space-x-1 flex pl-2 text-destructive hover:text-destructive/80'>
                <Button
                    variant='ghost'
                    size='icon-sm'
                    className='text-destructive hover:text-destructive/80'
                    aria-label='Delete note'
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDeleteDialogOpen(true);
                    }}
                >
                    <TrashIcon className={classNames} weight='bold' />
                </Button>
            </span>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this note? This action is
                            irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            variant='outline'
                            size='sm'
                            disabled={deleteMutation.isPending}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <Button
                            variant='destructive'
                            size='sm'
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
