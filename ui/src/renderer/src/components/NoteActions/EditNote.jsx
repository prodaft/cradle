import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';

import { EditPencil } from 'iconoir-react';

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
export default function EditNote({ note, classNames }) {
    const { navigateLink } = useCradleNavigate();

    return (
        <span className='pb-1 space-x-1 flex flex-row pl-2 text-blue-500 hover:text-blue-600'>
            <button className=''>
                <EditPencil
                    className={classNames}
                    onClick={navigateLink(`/notes/${note.id}/edit`)}
                />
            </button>
        </span>
    );
}
