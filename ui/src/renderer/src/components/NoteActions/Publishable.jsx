import { useCallback, useEffect, useState } from 'react';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { setPublishable } from '../../services/notesService/notesService';
import { displayError } from '../../utils/responseUtils/responseUtils';

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
export default function Publishable({ note, setAlert }) {
    const [isPublishable, setIsPublishable] = useState(note.publishable);
    const { navigate, navigateLink } = useCradleNavigate();

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
                className='switch switch-ghost-primary'
                onChange={() => handleTogglePublishable(note.id)}
            />
        </span>
    );
}
