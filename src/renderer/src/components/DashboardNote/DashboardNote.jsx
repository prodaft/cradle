import { parseContent } from "../../utils/textEditorUtils/textEditorUtils";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import Preview from "../Preview/Preview";
import { setPublishable } from "../../services/dashboardService/dashboardService";
import { displayError } from "../../utils/responseUtils/responseUtils";
import AlertDismissible from "../AlertDismissible/AlertDismissible";

/**
 * DashboardNote component - This component is used to display a note on the dashboard.
 * It can be clicked to navigate to the note page.
 * @param index - Index of the note
 * @param note - Note object
 * @returns {DashboardNote}
 * @constructor
 */
export default function DashboardNote({ index, note }) {
    const [isPublishable, setIsPublishable] = useState(note.publishable);
    const [alert, setAlert] = useState("");
    const [alertColor, setAlertColor] = useState("red");
    const navigate = useNavigate();

    // Attempt to change the publishable status of a note.
    // If successful, update the switch to reflect this. Otherwise, display an error.
    const handleSetPublishable = (noteId) => {
        return async () => {
            setPublishable(noteId, !isPublishable)
                .then(response => {
                    if (response.status === 200) {
                        setIsPublishable(!isPublishable);
                    }
                })
                .catch(displayError(setAlert, setAlertColor));
        };
    };

    return (
        <div className="bg-inherit">
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <span>
                <label htmlFor="publishable-switch">Publishable</label>
                <input
                    checked={isPublishable}
                    name="publishable-switch"
                    type="checkbox"
                    className="switch switch-ghost-primary focus:ring-0"
                    onClick={handleSetPublishable(note.id)}
                />
            </span>
            <div
                key={index}
                className="bg-cradle3 h-fit p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl mb-4 shadow-md overflow-hidden flex-grow flex space-y-2 flex-col cursor-pointer"
                onClick={() => navigate(`/notes/${note.id}`)}>
                <div className="text-zinc-500 text-xs w-full">{note.timestamp}</div>
                <Preview
                    htmlContent={parseContent(note.content)}
                />
                <div className="text-zinc-500 text-xs w-full flex justify-between">
                    <div>References: {note.entities.map(entity => entity.name).join(', ')}</div>
                </div>
            </div>
        </div>
    );
}
