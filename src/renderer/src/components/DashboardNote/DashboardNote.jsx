import { parseContent } from "../../utils/textEditorUtils/textEditorUtils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Preview from "../Preview/Preview";
import { setPublishable } from "../../services/dashboardService/dashboardService";
import { displayError } from "../../utils/responseUtils/responseUtils";
import AlertDismissible from "../AlertDismissible/AlertDismissible";
import { useAuth } from "../../hooks/useAuth/useAuth";

/**
 * DashboardNote component - This component is used to display a note on the dashboard.
 * It can be clicked to navigate to the note page.
 * @param index - Index of the note
 * @param note - Note object
 * @returns {DashboardNote}
 * @constructor
 */
export default function DashboardNote({ index, note, setAlert, setAlertColor }) {
    const [isPublishable, setIsPublishable] = useState(false); // todo note.publishable
    const navigate = useNavigate();
    const auth = useAuth();

    // Attempt to change the publishable status of a note.
    // If successful, update the switch to reflect this. Otherwise, display an error.
    const handleSetPublishable = (noteId) => {
        setPublishable(auth.access, noteId, !isPublishable)
            .then(response => {
                if (response.status === 200) {
                    setIsPublishable(!isPublishable);
                }
            })
            .catch(displayError(setAlert, setAlertColor));
        console.log(isPublishable);
    };

    return (
        <>
            <div className="bg-inherit p-1 my-2 backdrop-blur-lg rounded-xl mb-4 shadow-md">
                <div className="flex flex-row-reverse">
                    <span className="pb-1 space-x-1">
                        <label
                            htmlFor={`publishable-switch-${note.id}`}
                            className="text-xs text-zinc-200 hover:cursor-pointer">
                            Publishable
                        </label>
                        <input
                            checked={isPublishable}
                            id={`publishable-switch-${note.id}`}
                            type="checkbox"
                            className="switch switch-ghost-primary focus:ring-0"
                            onChange={() => handleSetPublishable(note.id)}
                        />
                    </span>
                </div>
                <div
                    key={index}
                    className="bg-cradle3 h-fit p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl mb-4 shadow-md overflow-hidden flex-grow flex space-y-2 flex-col cursor-pointer"
                    onClick={() => navigate(`/notes/${note.id}`)}>
                    <div className="text-zinc-500 text-xs w-full">{new Date(note.timestamp).toLocaleString()}</div>
                    <Preview
                        htmlContent={parseContent(note.content)}
                    />
                    <div className="text-zinc-500 text-xs w-full flex justify-between">
                        <div>References: {note.entities.map(entity => entity.name).join(', ')}</div>
                    </div>
                </div>
            </div>
        </>
    );
}
