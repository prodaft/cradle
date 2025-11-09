import { Trash } from 'iconoir-react/regular';
import { useNotif } from '../../contexts/NotificationContext/NotificationContext';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';

import { useModal } from '../../contexts/ModalContext/ModalContext';
import useApi from '../../hooks/useApi/useApi';
import { useAPICall } from '../../hooks/useAPICall';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal';

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
export default function DeleteNote({ note, setHidden, classNames }) {
    const { notify } = useNotif();
    const { navigate, navigateLink } = useCradleNavigate();
    const { setModal } = useModal();
    const { fleetingNotesApi, notesApi } = useApi();
    const { executor } = useAPICall();

    const handleDelete = executor(
        async () => {
            // Use the appropriate delete function based on whether the note is fleeting
            if (note.fleeting) {
                await fleetingNotesApi.fleetingNotesDestroy({ id: note.id });
            } else {
                await notesApi.notesDelete({ noteId: note.id });
            }
            setHidden(true);
        },
        { successMessage: 'Note deleted successfully' }
    );

    return (
        <span className='pb-1 space-x-1 flex flex-row pl-2 text-red-500 hover:text-red-600'>
            <button className=''>
                <Trash
                    className={classNames}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setModal(ConfirmDeletionModal, {
                            onConfirm: handleDelete,
                            text: 'Are you sure you want to delete this note? This action is irreversible.',
                        });
                    }}
                />
            </button>
        </span>
    );
}
