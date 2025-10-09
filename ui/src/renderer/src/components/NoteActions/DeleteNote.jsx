import { Trash } from 'iconoir-react/regular';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';

import { useModal } from '../../contexts/ModalContext/ModalContext';
import { deleteNote } from '../../services/notesService/notesService';
import { deleteFleetingNote } from '../../services/fleetingNotesService/fleetingNotesService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal';

/**
 * Note component - This component is used to display a note on the dashboard.
 * @function Note
 * @param {Object} props - Component props
 * @param {string} props.id - The note ID
 * @param {Object} props.note - The note object
 * @param {Function} props.setAlert - Function to set alerts
 * @param {boolean} props.publishMode - Whether the component is in publish mode
 * @param {Array} props.selectedNoteIds - Array of selected note IDs
 * @param {Function} props.setSelectedNoteIds - Function to set selected note IDs
 * @param {boolean} props.draggable - Whether the note is draggable
 * @param {React.ReactNode} props.customControls - Custom controls to display in the header
 * @param {boolean} props.hideDefaultControls - Whether to hide the default controls
 */
export default function DeleteNote({ note, setAlert, setHidden, classNames }) {
    const { navigate, navigateLink } = useCradleNavigate();
    const { setModal } = useModal();

    const handleDelete = () => {
        // Use the appropriate delete function based on whether the note is fleeting
        const deleteFunction = note.fleeting ? deleteFleetingNote : deleteNote;
        deleteFunction(note.id)
            .then((response) => {
                if (response.status === 200) {
                    setAlert({
                        show: true,
                        color: 'green',
                        message: 'Note deleted successfully',
                    });
                    setHidden(true);
                }
            })
            .catch(displayError(setAlert, navigate));
    };

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
