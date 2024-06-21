import { useNavigate } from 'react-router-dom';
import Preview from '../Preview/Preview';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import { useEffect, useState } from 'react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';

/**
 * This component is a card component that displays a list of notes.
 * Each note in the list is displayed as a clickable card.
 * When a note is clicked, the user is navigated to the corresponding note viewer.
 *
 * @param {Object} props - The props of the component.
 * @param {string} props.title - The title of the list.
 * @param {Object[]} props.notes - The list of notes to display.
 * @returns {NoteListCard}
 */
export default function NoteListCard({ title = '', notes = [] }) {
    const navigate = useNavigate();
    const [noteCards, setNoteCards] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    useEffect(() => {
        Promise.all(
            notes.map((note, index) => {
                return parseContent(note.content, note.files).then((parsedContent) => {
                    return (
                        <div
                            key={index}
                            className='opacity-90 hover:opacity-70 active:opacity-50 hover:cursor-pointer 
                                card p-2 bg-gray-4 hover:bg-gray-6 active:bg-gray-8 !max-w-none'
                            onClick={() => navigate(`/notes/${note.id}`)}
                        >
                            <Preview htmlContent={parsedContent} />
                        </div>
                    );
                });
            }),
        )
            .then((res) => setNoteCards(res))
            .catch(displayError(setAlert));
    }, [notes]);

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
