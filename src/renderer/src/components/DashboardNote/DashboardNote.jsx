import { parseContent } from "../../utils/textEditorUtils/textEditorUtils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Preview from "../Preview/Preview";
import { setPublishable } from "../../services/dashboardService/dashboardService";
import { displayError } from "../../utils/responseUtils/responseUtils";
import { useAuth } from "../../hooks/useAuth/useAuth";
import { createDashboardLink } from "../../utils/dashboardUtils/dashboardUtils";
import { Link } from "react-router-dom";
import { Xmark } from "iconoir-react/regular";

/**
 * DashboardNote component - This component is used to display a note on the dashboard.
 * It can be clicked to navigate to the note page.
 * 
 * If the dashboard is in publish mode, only publishable notes will be displayed.
 * While in publish mode, a user can delete a note. In this case, the note will be removed from the list of notes to publish.
 * 
 * @param {number} index - Index of the note
 * @param note - Note object
 * @param setAlert - Function to set an alert
 * @param setAlertColor - Function to set the color of the alert
 * @param {boolean} publishMode - determine if the dashboard is in publish mode
 * @param {Set<number>} publishNoteIds - a set of note ids - used to keep track of notes to publish
 * @param setPublishNoteIds - Function to set the note ids
 * @returns {DashboardNote}
 * @constructor
 */
export default function DashboardNote({ index, note, setAlert, setAlertColor, publishMode, publishNoteIds, setPublishNoteIds }) {
    const [isPublishable, setIsPublishable] = useState(note.publishable);
    const navigate = useNavigate();
    const auth = useAuth();
    const [includeInPublish, setIncludeInPublish] = useState(true); // in the beginning, all publishable notes are included in the report

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
    };

    // If the note is checked to be included in the report and the button is clicked, remove it from the list of notes to publish.
    // If it's not checked and it is clicked, add it to the list of notes to publish.
    const handleIncludeInPublish = () => {
        if (includeInPublish) {
            setIncludeInPublish(false);
            publishNoteIds.delete(note.id);
            setPublishNoteIds(new Set(publishNoteIds));
        } else {
            setIncludeInPublish(true);
            publishNoteIds.add(note.id);
            setPublishNoteIds(new Set(publishNoteIds));
        }
    };

    // Create a link to the dashboard for each entity that is referenced in the note
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
            {(!publishMode || (publishMode && isPublishable)) && (
                <div className={`bg-cradle3 ${includeInPublish ? "bg-opacity-60" : "bg-opacity-10"} p-4 backdrop-blur-lg rounded-xl m-3 shadow-md`}>
                    <div className="flex flex-row justify-between">
                        <div className="text-zinc-500 text-xs w-full">{new Date(note.timestamp).toLocaleString()}</div>
                        {publishMode ? (
                            <input
                                type="checkbox"
                                checked={includeInPublish}
                                className="checkbox checkbox-primary"
                                onClick={handleIncludeInPublish}
                            />
                        ) : (
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
                        )}
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
            )}
        </>
    );
}
