import {Link, useLocation, useNavigate} from "react-router-dom";
import {useEffect, useState} from "react";
import {getDashboardData} from "../../services/dashboardService/dashboardService";
import {useAuth} from "../../hooks/useAuth/useAuth";
import {AlertDismissible} from "../AlertDismissible/AlertDismissible";
import DashboardHorizontalSection from "../DashboardHorizontalSection/DashboardHorizontalSection";
import DashboardCard from "../DashboardCard/DashboardCard";
import {parseContent} from "../../utils/textEditorUtils/textEditorUtils";
import DashboardNote from "../DashboardNote/DashboardNote";
import {displayError} from "../../utils/responseUtils/responseUtils";
import useNavbarContents from "../../hooks/useNavbarContents/useNavbarContents";
import NavbarButton from "../NavbarButton/NavbarButton";
import {Trash} from "iconoir-react/regular";
import {ConfirmationDialog} from "../ConfirmationDialog/ConfirmationDialog";
import {deleteEntity} from "../../services/adminService/adminService";
import NotFound from "../NotFound/NotFound";
import pluralize from "pluralize";

/**
 * Dashboard component
 * Fetches and displays the dashboard data for an entity
 * @returns {Dashboard}
 * @constructor
 */
export default function Dashboard(){
    const location = useLocation();
    const path = location.pathname + location.search;
    const [entityMissing, setEntityMissing] = useState(false);
    const [contentObject, setContentObject] = useState({});
    const [alert, setAlert] = useState("");
    const [alertColor, setAlertColor] = useState("red");
    const [dialog, setDialog] = useState(false);
    const navigate = useNavigate();
    const auth = useAuth();

    const navbarContents = [
        <NavbarButton icon={<Trash />} name={"Delete"} onClick={() => setDialog(true)} />
    ];

    useNavbarContents(auth.isAdmin && contentObject.id && contentObject.type && contentObject.type !== 'entry' ? navbarContents : [], [contentObject, location]);

    useEffect(() => {
        setEntityMissing(false);
        setAlert("");
        getDashboardData(auth.access, path)
            .then(response => {
                setContentObject(response.data);
            })
            .catch(err => {
                setContentObject({});
                if(err.response && err.response.status === 404){
                    setEntityMissing(true);
                } else {
                    const errHandler = displayError(setAlert, setAlertColor);
                    errHandler(err);
                }
            });
    }, [location]);

    const handleDelete = async () => {
        deleteEntity(auth.access, `entities/${pluralize(contentObject.type)}`, contentObject.id).then((response) => {
            if(response.status === 200){
                navigate('/');
            }
        }).catch(displayError(setAlert, setAlertColor));
    }


    if(entityMissing){
        return (
            <NotFound message={"The entity you are looking for does not exist or you do not have access to it. If you believe the entity exists contact an administrator for access"}/>
        );
    }

    return (
        <>
            <ConfirmationDialog open={dialog} setOpen={setDialog} title={"Confirm Deletion"} description={"This is permanent"} handleConfirm={handleDelete} />
            <AlertDismissible alert={alert} setAlert={setAlert} color={alertColor}/>
            <div className="w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-scroll">
                <div className="w-[95%] h-full flex flex-col p-6 space-y-3">
                    {contentObject.name && <h1 className="text-5xl font-bold">{contentObject.name}</h1>}
                    {contentObject.type && <p className="text-sm text-zinc-500">{`Type: ${contentObject.type} ${contentObject.subtype ? contentObject.subtype : ''}`}</p>}
                    {contentObject.description && <p className="text-sm text-zinc-500">{`Description: ${contentObject.description}`}</p>}
                    {contentObject.actors && <DashboardHorizontalSection title={"Related Actors"}>
                        {contentObject.actors.map((actor, index) => (
                            <DashboardCard name={actor.name} link={`/dashboards/actors/${encodeURIComponent(actor.name)}`}/>
                        ))}
                    </DashboardHorizontalSection>}
                    {contentObject.cases && <DashboardHorizontalSection title={"Related Cases"}>
                        {contentObject.cases.map((c, index) => (
                            <DashboardCard index={index} name={c.name} link={`/dashboards/cases/${encodeURIComponent(c.name)}`}/>
                        ))}
                    </DashboardHorizontalSection>}
                    {contentObject.metadata && <DashboardHorizontalSection title={"Metadata"}>
                        {contentObject.metadata.map((data, index) => (
                            <DashboardCard index={index} name={data.name}/>
                        ))}
                    </DashboardHorizontalSection>}
                    {contentObject.notes && <div className="bg-cradle3 p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col flex-1">
                        <h2 className="text-xl font-semibold mb-2">Notes</h2>
                        {contentObject.notes.map((note, index) => (
                            <DashboardNote index={index} note={note}/>
                        ))}
                    </div>}
                </div>
            </div>
        </>
    );
}
