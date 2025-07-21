import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import Preview from '../Preview/Preview';
import { setPublishable } from '../../services/notesService/notesService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useLocation } from 'react-router-dom';
import ReferenceTree from '../ReferenceTree/ReferenceTree';

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
export default function Publishable({ note, setAlert, compact }) {
    const [isPublishable, setIsPublishable] = useState(note.publishable);
    const navigate = useNavigate();

    const handleTogglePublishable = useCallback(
        (noteId) => {
            setPublishable(noteId, !isPublishable)
                .then((response) => {
                    if (response.status === 200) {
                        setIsPublishable(!isPublishable);
                    }
                })
                .catch(displayError(setAlert, navigate));
        },
        [isPublishable, setIsPublishable, setAlert, navigate],
    );

    useEffect(() => {
        note.publishable = isPublishable;
    }, [isPublishable, note]);

    return (
        <span className='pb-1 space-x-1 flex flex-row items-center'>
            <label
                htmlFor={`publishable-switch-${note.id}`}
                className='text-xs dark:text-zinc-300 hover:cursor-pointer'
            >
                Publishable
            </label>
            <input
                checked={isPublishable}
                id={`publishable-switch-${note.id}`}
                type='checkbox'
                className={compact ? '' : 'switch switch-ghost-primary'}
                onChange={() => handleTogglePublishable(note.id)}
            />
        </span>
    );
}
