import { parseContent } from "../../utils/textEditorUtils/textEditorUtils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Preview from "../Preview/Preview";
import { setPublishable } from "../../services/dashboardService/dashboardService";
import { displayError } from "../../utils/responseUtils/responseUtils";
import { useAuth } from "../../hooks/useAuth/useAuth";
import { createDashboardLink } from "../../utils/dashboardUtils/dashboardUtils";
import { Link } from "react-router-dom";

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

    const referenceLinks = note.entities.map(entity => {
        const dashboardLink = createDashboardLink(entity);
        return (
            <Link
                key={entity.id}
                to={dashboardLink}
                className="text-zinc-500 hover:underline hover:text-cradle2 mr-1"
            >
                {entity.name};
            </Link>
        )
    });

    return (
        <>
            <div className="bg-cradle3 bg-opacity-20 p-4 backdrop-blur-lg rounded-xl m-3 shadow-md">
                <div className="flex flex-row justify-between">
                    <div className="text-zinc-500 text-xs w-full">{new Date(note.timestamp).toLocaleString()}</div>
                    <span className="pb-1 space-x-1 flex flex-row">
                        <label
                            htmlFor={`publishable-switch-${note.id}`}
                            className="text-xs text-zinc-300 hover:cursor-pointer">
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
                    className="bg-transparent h-fit p-2 backdrop-filter mb-4 overflow-hidden flex-grow flex space-y-2 flex-col cursor-pointer"
                    onClick={() => navigate(`/notes/${note.id}`)}>
                    <Preview
                        htmlContent={parseContent(note.content)}
                    />
                </div>
                <div className="text-zinc-300 text-xs w-full flex justify-between">
                    <span className="break-all w-full">References: {referenceLinks}</span>
                </div>
            </div>
        </>
    );
}
