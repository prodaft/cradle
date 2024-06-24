import Preview from '../Preview/Preview';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import { useNavigate } from 'react-router-dom';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useState, useEffect } from 'react';

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

    useEffect(() => {
        parseContent(note.content, note.files)
            .then((parsedContent) => setParsedContent(parsedContent))
            .catch(displayError(setAlert));
    }, [note.content, note.files]);

    return (
        <div
            className='bg-cradle3 bg-opacity-20 p-4 backdrop-blur-lg rounded-xl m-3 shadow-md'
            onClick={() => navigate(`/fleeting-editor/${note.id}`)}
        >
            <div className='flex flex-row justify-left'>
                <div className='text-zinc-500 text-xs w-full'>
                    Last edited: {new Date(note['last_edited']).toLocaleString()}
                </div>
            </div>
            <div className='bg-transparent h-fit p-2 backdrop-filter mb-4 overflow-hidden flex-grow flex space-y-2 flex-col cursor-pointer'>
                {note.content && <Preview htmlContent={parsedContent} />}
            </div>
        </div>
    );
}
