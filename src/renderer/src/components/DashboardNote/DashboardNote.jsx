import { parseContent } from "../../utils/textEditorUtils/textEditorUtils";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import Preview from "../Preview/Preview";
import { setPublishable } from "../../services/dashboardService/dashboardService";
import { displayError } from "../../utils/responseUtils/responseUtils";
import { useAuth } from "../../hooks/useAuth/useAuth";
import { createDashboardLink } from "../../utils/dashboardUtils/dashboardUtils";
import { Link } from "react-router-dom";

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
 * @param {Array<number>} selectedNoteIds - an array of note ids - used to keep track of notes to publish
 * @param setSelectedNoteIds - Function to set the note ids
 * @returns {DashboardNote}
 * @constructor
 */
export default function DashboardNote({ index, note, setAlert, setAlertColor, publishMode, selectedNoteIds, setSelectedNoteIds }) {
    const [isPublishable, setIsPublishable] = useState(note.publishable);
    const [isSelected, setIsSelected] = useState(true);
    const navigate = useNavigate();
    const auth = useAuth();

    // Attempt to change the publishable status of a note.
    // If successful, update the switch to reflect this. Otherwise, display an error.
    const handleTogglePublishable = useCallback((noteId) => {
        setPublishable(auth.access, noteId, !isPublishable)
            .then(response => {
                if (response.status === 200) {
                    setIsPublishable(!isPublishable);
                }
            })
            .catch(displayError(setAlert, setAlertColor));
    }, [auth.access, isPublishable, setIsPublishable, setAlert, setAlertColor]);

    // If the note is to be included in the report and the button is clicked, remove it from the list of notes to publish.
    // If it's not selected and it is clicked, add it to the list of notes to publish.
    const handleSelectNote = () => {
        setSelectedNoteIds(prevNoteIds => {
            const noteIdx = prevNoteIds.indexOf(note.id);
            if (noteIdx !== -1) {
                setIsSelected(false);
                return prevNoteIds.filter(id => id !== note.id);
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
                <div className={`bg-cradle3 ${isSelected ? "bg-opacity-60" : "bg-opacity-10"} p-4 backdrop-blur-lg rounded-xl m-3 shadow-md`}>
                    <div className="flex flex-row justify-between">
                        <div className="text-zinc-500 text-xs w-full">{new Date(note.timestamp).toLocaleString()}</div>
                        {publishMode ? (
                            <input
                                data-testid='select-btn'
                                type="checkbox"
                                defaultChecked={true}
                                checked={isSelected}
                                className="checkbox checkbox-primary"
                                onClick={handleSelectNote}
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
                                    onChange={() => handleTogglePublishable(note.id)}
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
