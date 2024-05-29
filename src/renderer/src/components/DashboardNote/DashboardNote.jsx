import { parseContent } from "../../utils/textEditorUtils/textEditorUtils";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import Preview from "../Preview/Preview";

/**
 * DashboardNote component - This component is used to display a note on the dashboard.
 * It can be clicked to navigate to the note page.
 * @param index - Index of the note
 * @param note - Note object
 * @returns {DashboardNote}
 * @constructor
 */
export default function DashboardNote({ index, note }) {
    const navigate = useNavigate();

    const handleCheckboxClick = (event) => {
        event.stopPropagation();

    };

    return (
        <div
            key={index}
            className="bg-cradle3 h-fit p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl mb-4 shadow-md overflow-hidden flex-grow flex space-y-2 flex-col cursor-pointer"
            onClick={() => navigate(`/notes/${note.id}`)}
        >
            <div className="text-zinc-500 text-xs w-full">{new Date(note.timestamp).toLocaleString()}</div>
            <Preview
                htmlContent={parseContent(note.content)}
            />
            <div className="text-zinc-500 text-xs w-full flex justify-between">
                <div>References: {note.entities.map(entity => entity.name).join(', ')}</div>
                <div>Publishable <input
                                    type="checkbox"
                                    className="switch switch-ghost-primary focus:ring-0"
                                    onClick={handleCheckboxClick}/>
                </div>
            </div>
        </div>
    );
}
