import { useNavigate } from "react-router-dom";
import Preview from "../Preview/Preview";
import { parseContent } from "../../utils/textEditorUtils/textEditorUtils";
import { useEffect, useState } from "react";

export default function NoteListCard({ title = "", notes = [] }) {
    const navigate = useNavigate();
    const [noteCards, setNoteCards] = useState([]);

    useEffect(() => {
        Promise.all(
            notes.map((note, index) => {
                return parseContent(note.content, note.files)
                    .then((parsedContent) => {
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
            }))
            .then((res) => setNoteCards(res))
            .catch((error) => console.error(error));
    }, [notes])



    return (
        <div className='card bg-gray-2 overflow-auto !max-w-none'>
            <div className='card-body'>
                <h2 className='card-header'>{title}</h2>
                {noteCards}
            </div>
        </div >
    );
}
