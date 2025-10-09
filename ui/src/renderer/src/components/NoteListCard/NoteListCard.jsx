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
                            className='cradle-card cradle-card-hover cradle-card-brackets mb-3 cursor-pointer'
                            onClick={navigateLink(`/notes/${note.id}`)}
                        >
                            <div className='cradle-card-body'>
                                <Preview htmlContent={result.html} />
                            </div>
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
            <div className='cradle-card overflow-auto cradle-scrollbar'>
                <div className='cradle-card-header'>
                    <span>{title}</span>
                </div>
                <div className='cradle-card-body space-y-3'>
                    {noteCards}
                </div>
            </div>
        </>
    );
}
