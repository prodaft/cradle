import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getDashboardData } from "../../services/dashboardService/dashboardService";
import { useAuth } from "../../hooks/useAuth/useAuth";
import AlertDismissible from "../AlertDismissible/AlertDismissible";
import DashboardHorizontalSection from "../DashboardHorizontalSection/DashboardHorizontalSection";
import DashboardCard from "../DashboardCard/DashboardCard";
import DashboardNote from "../DashboardNote/DashboardNote";
import { displayError } from "../../utils/responseUtils/responseUtils";
import useNavbarContents from "../../hooks/useNavbarContents/useNavbarContents";
import NavbarButton from "../NavbarButton/NavbarButton";
import { TaskList, Trash, Upload, Xmark } from "iconoir-react/regular";
import { ConfirmationDialog } from "../ConfirmationDialog/ConfirmationDialog";
import { deleteEntity } from "../../services/adminService/adminService";
import NotFound from "../NotFound/NotFound";
import pluralize from "pluralize";
import { createDashboardLink } from "../../utils/dashboardUtils/dashboardUtils";

/**
 * Dashboard component
 * Fetches and displays the dashboard data for an entity
 * @returns {Dashboard}
 * @constructor
 */
export default function Dashboard() {
    const location = useLocation();
    const path = location.pathname + location.search;
    const [entityMissing, setEntityMissing] = useState(false);
    const [contentObject, setContentObject] = useState({});
    const [alert, setAlert] = useState("");
    const [alertColor, setAlertColor] = useState("red");
    const [dialog, setDialog] = useState(false);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const auth = useAuth();
    const dashboard = useRef(null);
    const [publishMode, setPublishMode] = useState(false);
    const [publishNoteIds, setPublishNoteIds] = useState(new Set());

    // When the publish button is clicked, the user is sent to the publish preview page, 
    // where they can choose how to export the published report
    const handlePublish = () => {
        setPublishMode(false);
        setSearchParams({ noteIds: Array.from(publishNoteIds), entityName: contentObject.name });
        navigate(`/publish-preview`, searchParams);
    }

    const handleEnterPublishMode = () => {
        setPublishMode(true);
        setPublishNoteIds(new Set(contentObject.notes.filter(note => note.publishable).map(note => note.id)));
    }

    const handleCancelPublishMode = () => {
        setPublishMode(false);
        setPublishNoteIds(new Set(contentObject.notes.map(note => note.id)));
    }

    // On load, fetch the dashboard data for the entity
    useEffect(() => {
        setEntityMissing(false);
        setAlert("");

        // Populate dashboard
        getDashboardData(auth.access, path)
            .then(response => {
                setContentObject(response.data);
                // dashboard.current.scrollTo(0, 0); // TODO, breaks tests
            })
            .catch(err => {
                setContentObject({});
                if (err.response && err.response.status === 404) {
                    setEntityMissing(true);
                } else {
                    const errHandler = displayError(setAlert, setAlertColor);
                    errHandler(err);
                }
            });
    }, [location]);

    const handleDelete = async () => {
        deleteEntity(auth.access, `entities/${pluralize(contentObject.type)}`, contentObject.id).then((response) => {
            if (response.status === 200) {
                navigate('/');
            }
        }).catch(displayError(setAlert, setAlertColor));
    }

    const navbarContents = [
        // A button to enter publish mode. Here the user can choose which notes they want to view in the publish preview
        // This is only visible while the user is not in publish preview mode
        publishMode ? null : <NavbarButton
            icon={<TaskList />}
            text="Enter Publish Mode"
            data-testid="publish-mode-btn"
            onClick={handleEnterPublishMode}
        />,

        // If the dashboard is in publish preview mode, add a button to exit it and another to move to the publish preview
        publishMode ? [
            <NavbarButton
                icon={<Xmark />}
                text="Cancel"
                data-testid="cancel-publish-btn"
                onClick={handleCancelPublishMode}
            />,
            <NavbarButton
                icon={<Upload />}
                text="Publish"
                data-testid="publish-btn"
                onClick={handlePublish}
            />,
        ] : null,

        // If the user is an admin and the dashboard is not for an entry, add a delete button to the navbar
        (auth.isAdmin && contentObject.type !== 'entry') ?
            <NavbarButton
                icon={<Trash />}
                text="Delete"
                onClick={() => setDialog(true)}
                data-testid="delete-entity-btn"
            /> : null,
    ];
    useNavbarContents(navbarContents, [contentObject, location, publishMode]);

    if (entityMissing) {
        return (
            <NotFound message={"The entity you are looking for does not exist or you do not have access to it. If you believe the entity exists contact an administrator for access."} />
        );
    }

    return (
        <>
            <ConfirmationDialog open={dialog} setOpen={setDialog} title={"Confirm Deletion"} description={"This is permanent"} handleConfirm={handleDelete} />
            <AlertDismissible alert={alert} setAlert={setAlert} color={alertColor} />
            <div className="w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-scroll" ref={dashboard}>
                <div className="w-[95%] h-full flex flex-col p-6 space-y-3">
                    {contentObject.name && <h1 className="text-5xl font-bold">{contentObject.name}</h1>}
                    {contentObject.type && <p className="text-sm text-zinc-500">{`Type: ${contentObject.subtype ? contentObject.subtype : contentObject.type}`}</p>}
                    {contentObject.description && <p className="text-sm text-zinc-500">{`Description: ${contentObject.description}`}</p>}

                    {!publishMode && contentObject.actors && <DashboardHorizontalSection title={"Related Actors"}>
                        {contentObject.actors.map((actor, index) => (
                            <DashboardCard index={index} name={actor.name} link={createDashboardLink(actor)} />
                        ))}
                    </DashboardHorizontalSection>}

                    {!publishMode && contentObject.cases && <DashboardHorizontalSection title={"Related Cases"}>
                        {contentObject.cases.map((c, index) => (
                            <DashboardCard index={index} name={c.name} link={createDashboardLink(c)} />
                        ))}
                    </DashboardHorizontalSection>}

                    {!publishMode && contentObject.entries && <DashboardHorizontalSection title={"Related Entries"}>
                        {contentObject.entries.map((entry, index) => (
                            <DashboardCard index={index} name={entry.name} link={createDashboardLink(entry)} />
                        ))}
                    </DashboardHorizontalSection>}

                    {!publishMode && contentObject.metadata && <DashboardHorizontalSection title={"Metadata"}>
                        {contentObject.metadata.map((data, index) => (
                            <DashboardCard index={index} name={data.name} />
                        ))}
                    </DashboardHorizontalSection>}

                    {contentObject.notes && <div className="bg-cradle3 p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col flex-1">
                        <h2 className="text-xl font-semibold mb-2">Notes</h2>
                        {contentObject.notes.map((note, index) => (
                            <DashboardNote index={index} note={note} setAlert={setAlert} setAlertColor={setAlertColor} publishMode={publishMode} publishNoteIds={publishNoteIds} setPublishNoteIds={setPublishNoteIds} />
                        ))}
                    </div>}
                </div>
            </div>
        </>
    );
}
