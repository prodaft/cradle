import { useEffect, useState } from 'react';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Preview from '../Preview/Preview';

/**
 * This component is a card component that displays a list of notes.
 * Each note in the list is displayed as a clickable card.
 * When a note is clicked, the user is navigated to the corresponding note viewer.
 *
 * @function NoteListCard
 * @param {Object} props - The props of the component.
 * @param {string} props.title - The title of the list.
 * @param {Array<Note>} props.notes - The list of notes to display.
 * @returns {NoteListCard}
 * @constructor
 */
export default function NoteListCard({ title = '', notes = [] }) {
    const { navigate, navigateLink } = useCradleNavigate();
    const [noteCards, setNoteCards] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    useEffect(() => {
        Promise.all(
            notes.map((note, index) => {
                return parseContent(note.content, note.files).then((result) => {
                    return (
                        <div
                            key={index}
                            className='opacity-90 hover:opacity-70 active:opacity-50 hover:cursor-pointer 
                                card p-2 bg-gray-4 hover:bg-gray-6 active:bg-gray-8 !max-w-none'
                            onClick={navigateLink(`/notes/${note.id}`)}
                        >
                            <Preview htmlContent={result.html} />
                        </div>
                    );
                });
            }),
        )
            .then((res) => setNoteCards(res))
            .catch(displayError(setAlert, navigate));
    }, [notes, navigate]);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='card bg-gray-2 overflow-auto !max-w-none'>
                <div className='card-body'>
                    <h2 className='card-header'>{title}</h2>
                    {noteCards}
                </div>
            </div>
        </>
    );
}
