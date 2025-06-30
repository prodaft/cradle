import Preview from '../Preview/Preview';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import { useNavigate } from 'react-router-dom';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useState, useEffect } from 'react';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import { Trash } from 'iconoir-react/regular';
import { deleteFleetingNote } from '../../services/fleetingNotesService/fleetingNotesService';
import { useModal } from '../../contexts/ModalContext/ModalContext';

import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';

/**
 * FleetingNoteCard is a component that displays a single Fleeting Note. It is used in the FleetingNotesPanel component.
 *
 * @function FleetingNoteCard
 * @param {Object} props - The props object
 * @param {Note} props.note - the note to display
 * @param {StateSetter<Alert>} setAlert - the function to set the alert text
 * @returns {FleetingNoteCard}
 * @constructor
 */
export default function FleetingNoteCard({ note, setAlert }) {
    const navigate = useNavigate();
    const [parsedContent, setParsedContent] = useState('');
    const [deleted, setDeleted] = useState(false);
    const { setModal } = useModal();

    useEffect(() => {
        parseContent(note.content, note.files)
            .then((result) => setParsedContent(result.html))
            .catch(displayError(setAlert, navigate));
    }, [note.content, note.files, setAlert, navigate]);

    const handleDeleteNote = () => {
        deleteFleetingNote(note.id)
            .then((response) => {
                if (response.status === 200) {
                    setAlert({
                        show: true,
                        message: 'Note deleted successfully.',
                        color: 'green',
                    });
                    setDeleted(true); // Set deleted to true to hide the card
                }
            })
            .catch(displayError(setAlert, navigate));
    };

    if (deleted) {
        return null; // If the note is deleted, do not render the card
    }

    return (
        <div
            className='bg-cradle3 bg-opacity-20 p-4 backdrop-blur-lg rounded-xl m-3 shadow-md'
            onClick={() => navigate(`/editor/${note.id}`)}
        >
            <div className='flex flex-row justify-left'>
                <div className='text-zinc-500 text-xs w-full'>
                    Last edited: {formatDate(new Date(note['timestamp']))}
                </div>

                <div
                    className='text-zinc-500 text-xs'
                    onClick={(e) => {
                        console.log('AAAAAAAAA');
                        setModal(ConfirmDeletionModal, {
                            text: `Are you sure you want to delete this fleeting note?`,
                            onConfirm: handleDeleteNote,
                        });
                        e.stopPropagation();
                    }}
                >
                    <Trash className='w-4 h-4 cursor-pointer hover:text-red-500' />
                </div>
            </div>
            <div className='bg-transparent h-fit p-2 backdrop-filter mb-4 overflow-hidden flex-grow flex space-y-2 flex-col cursor-pointer'>
                {note.content && <Preview htmlContent={parsedContent} />}
            </div>
        </div>
    );
}
