import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import { Link, useNavigate } from 'react-router-dom';
import { forwardRef, useCallback, useEffect, useState } from 'react';
import Preview from '../Preview/Preview';
import { setPublishable } from '../../services/notesService/notesService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useLocation } from 'react-router-dom';
import ReferenceTree from '../ReferenceTree/ReferenceTree';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';

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
const Note = forwardRef(function({id, note, setAlert, actions = [], ghost = false, ...props}, ref) {
    const navigate = useNavigate();
    const location = useLocation();
    const [parsedContent, setParsedContent] = useState('');

    useEffect(() => {
        parseContent(note.content, note.files)
            .then((parsedContent) => setParsedContent(parsedContent))
            .catch(displayError(setAlert, navigate));
    }, [note.content, note.files, setAlert, navigate]);


    const style = {
      opacity: ghost ? 0.5 : 1,
    };

    return (
        <div ref={ref} {...props}>
            <div
                style={style} className='bg-cradle3 bg-opacity-10 z-10 p-4 backdrop-blur-lg rounded-xl m-3 shadow-md'
            >
                {/* Header row with timestamp and configurable controls */}
                <div className='flex flex-row justify-between'>
                    <div className='dark:text-zinc-300 text-xs w-full'>
                        {new Date(note.timestamp).toLocaleString()}
                    </div>
                    <div className='flex items-center'>
                        {actions.map(({ Component, props }, index) => (
                            <Component key={index} {...props} note={note} />
                        ))}
                    </div>
                </div>

                {!parsedContent && (
                    <div className='flex items-center justify-center min-h-screen'>
                        <div className='spinner-dot-pulse'>
                            <div className='spinner-pulse-dot'></div>
                        </div>
                    </div>
                )}
                {/* Main content preview */}
                <div
                    className='bg-transparent h-fit p-2 backdrop-filter overflow-hidden flex-grow flex space-y-2 flex-col cursor-pointer'
                    onClick={() =>
                        navigate(`/notes/${note.id}`, {
                            state: { from: location, state: location.state },
                        })
                    }
                >
                    <div className='max-h-[36rem] overflow-y-auto opacity-100'>
                        <Preview htmlContent={parsedContent} />
                    </div>
                </div>

                {note.entry_classes && parsedContent && (
                    <ReferenceTree note={note} setAlert={setAlert} />
                )}
            </div>
        </div>
    );
})

export default Note;
