import { useModal } from '@/contexts/ui/ModalContext';
import { toast } from 'sonner';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import { Trash } from 'iconoir-react/regular';
import { Button } from '@/components/ui/button';

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
    const { navigate, navigateLink } = useCradleNavigate();
    const { setModal } = useModal();
    const { notesApi } = useApi();
    const { executor } = useAPICall();

    const handleDelete = executor(
        async () => {
            await notesApi.notesDelete({ noteId: note.id });
            setHidden(true);
        },
        { successMessage: 'Note deleted successfully' },
    );

    return (
        <span className='pb-1 space-x-1 flex flex-row pl-2 text-destructive hover:text-destructive/80'>
            <Button
                variant='ghost'
                size='icon-sm'
                className='text-destructive hover:text-destructive/80'
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setModal(ConfirmDeletionModal, {
                        onConfirm: handleDelete,
                        text: 'Are you sure you want to delete this note? This action is irreversible.',
                    });
                }}
            >
                <Trash className={classNames} />
            </Button>
        </span>
    );
}
