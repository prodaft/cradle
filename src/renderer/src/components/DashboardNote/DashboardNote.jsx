import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import Preview from '../Preview/Preview';
import { setPublishable } from '../../services/notesService/notesService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import {
    createDashboardLink,
    LinkTreeFlattener,
    truncateText,
} from '../../utils/dashboardUtils/dashboardUtils';
import { useLocation } from 'react-router-dom';

/**
 * DashboardNote component - This component is used to display a note on the dashboard.
 * It can be clicked to navigate to the note page.
 *
 * If the dashboard is in publish mode, only publishable notes will be displayed.
 * While in publish mode, a user can delete a note. In this entity, the note will be removed from the list of notes to publish.
 *
 * @function DashboardNote
 * @param {Object} props - The props object
 * @param {Note} props.note - Note object
 * @param {StateSetter<Alert>} props.setAlert - Function to set an alert
 * @param {boolean} props.publishMode - determine if the dashboard is in publish mode
 * @param {Array<number>} props.selectedNoteIds - an array of note ids - used to keep track of notes to publish
 * @param {StateSetter<Array<number>>} props.setSelectedNoteIds - Function to set the note ids
 * @returns {DashboardNote}
 * @constructor
 */
export default function DashboardNote({
    note,
    setAlert,
    publishMode,
    selectedNoteIds,
    setSelectedNoteIds,
}) {
    const [isPublishable, setIsPublishable] = useState(note.publishable);
    const [isSelected, setIsSelected] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const [parsedContent, setParsedContent] = useState('');

    useEffect(() => {
        parseContent(note.content, note.files)
            .then((parsedContent) => setParsedContent(parsedContent))
            .catch(displayError(setAlert, navigate));
    }, [note.content, note.files, setAlert, navigate]);

    // Attempt to change the publishable status of a note.
    // If successful, update the switch to reflect this. Otherwise, display an error.
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
        [isPublishable, setIsPublishable, setAlert],
    );

    // If the note is to be included in the report and the button is clicked, remove it from the list of notes to publish.
    // If it's not selected and it is clicked, add it to the list of notes to publish.
    const handleSelectNote = () => {
        setSelectedNoteIds((prevNoteIds) => {
            const noteIdx = prevNoteIds.indexOf(note.id);
            if (noteIdx !== -1) {
                setIsSelected(false);
                return prevNoteIds.filter((id) => id !== note.id);
            } else {
                setIsSelected(true);
                return [...prevNoteIds, note.id];
            }
        });
    };

    useEffect(() => {
        note.publishable = isPublishable;
    }, [isPublishable]);

    useEffect(() => {
        if (selectedNoteIds) {
            setIsSelected(selectedNoteIds.includes(note.id));
        }
    }, [selectedNoteIds]);

    const referenceLinks = LinkTreeFlattener.flatten(note.entries).map((entry) => {
        const dashboardLink = createDashboardLink(entry);
        return (
            <Link
                key={`${entry.name}:${entry.subtype}`}
                to={dashboardLink}
                className='text-zinc-300 hover:underline hover:text-cradle2 backdrop-filter bg-cradle3 bg-opacity-60 backdrop-blur-lg h-6 px-2 py-1 rounded-md'
            >
                {truncateText(entry.name, 30)}
            </Link>
        );
    });

    return (
        <>
            {(!publishMode || (publishMode && isPublishable)) && (
                <div
                    className={`bg-cradle3 ${isSelected ? 'bg-opacity-30' : 'bg-opacity-10'} p-4 backdrop-blur-lg rounded-xl m-3 shadow-md`}
                >
                    <div className='flex flex-row justify-between'>
                        <div className='text-zinc-300 text-xs w-full'>
                            {new Date(note.timestamp).toLocaleString()}
                        </div>
                        {publishMode ? (
                            <input
                                data-testid='select-btn'
                                type='checkbox'
                                checked={isSelected}
                                className='form-checkbox checkbox checkbox-primary'
                                onClick={handleSelectNote}
                            />
                        ) : (
                            <span className='pb-1 space-x-1 flex flex-row'>
                                <label
                                    htmlFor={`publishable-switch-${note.id}`}
                                    className='text-xs text-zinc-300 hover:cursor-pointer'
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
                        )}
                    </div>
                    <div
                        className='bg-transparent h-fit p-2 backdrop-filter mb-4 overflow-hidden flex-grow flex space-y-2 flex-col cursor-pointer'
                        onClick={() =>
                            navigate(`/notes/${note.id}`, {
                                state: { from: location, state: location.state },
                            })
                        }
                    >
                        <Preview htmlContent={parsedContent} />
                    </div>
                    <div className='text-zinc-300 text-xs w-full break-all flex flex-row flex-wrap justify-start space-x-1 space-y-1 items-center'>
                        <div>References:</div>
                        {referenceLinks}
                    </div>
                </div>
            )}
        </>
    );
}
