import {useAuth} from "../../hooks/useAuth/useAuth";
import AdminPanelSection from "../AdminPanelSection/AdminPanelSection";
import {useNavigate} from "react-router-dom";
import {getActors, getCases, getUsers} from "../../services/adminService/adminService";
import AdminPanelCard from "../AdminPanelCard/AdminPanelCard";
import {useEffect, useState} from "react";
import {AlertDismissible} from "../AlertDismissible/AlertDismissible";
import { displayError } from "../../utils/responseUtils/responseUtils";

/**
 * AdminPanel component - This component is used to display the AdminPanel.
 * Displays the AdminPanel with the following sections:
 * - Actors
 * - Cases
 * - Users
 * Each section contains a list of cards with the respective information and actions.
 * The actions are:
 * - Create new entity
 * - Delete entity
 * When deleting an entity a dialog will be displayed to confirm the deletion.
 * @returns {AdminPanel}
 * @constructor
 */
export default function AdminPanel() {
    const auth = useAuth();
    const [actors, setActors] = useState([]);
    const [cases, setCases] = useState([]);
    const [users, setUsers] = useState([]);
    const [alert, setAlert] = useState("");
    const navigate = useNavigate();
    const [alertColor, setAlertColor] = useState("red");
    const handleError = displayError(setAlert, setAlertColor);

    //TODO -Implement encoding: qs.stringify({ name: c.name }, { encodeValuesOnly: true }).split('=')[1]


    const displayActors = async () => {
        getActors(auth.access).then((response) => {
            if(response.status === 200){
                let actors = response.data;
                setActors(actors.map((actor) => {
                    return (
                        <AdminPanelCard
                            id={actor.id}
                            name={actor.name}
                            searchKey={actor.name}
                            description={actor.description}
                            type={"entities/actors"}
                            onDelete={displayActors}
                            link={`/dashboards/actors/${encodeURIComponent(actor.name)}`}
                        />
                    );
                }));
            }
        }).catch(handleError);
    }

    const displayCases = async () => {
        getCases(auth.access).then((response) => {
            if(response.status === 200){
                let cases = response.data;
                setCases(cases.map((c) => {
                    return (
                        <AdminPanelCard
                            id={c.id}
                            name={c.name}
                            searchKey={c.name}
                            description={c.description}
                            type={"entities/cases"}
                            onDelete={displayCases}
                            link={`/dashboards/cases/${encodeURIComponent(c.name)}`}
                        />
                    );
                }));
            }
        }).catch(handleError);
    }

    const displayUsers = async () => {
        getUsers(auth.access).then((response) => {
            if(response.status === 200){
                let users = response.data;
                setUsers(users.map((user) => {
                    return (
                        <AdminPanelCard
                            id={user.id}
                            name={user.username}
                            searchKey={user.username}
                            type={"users"}
                            onDelete={displayUsers}
                            link={`/admin/user-permissions/${encodeURIComponent(user.username)}/${encodeURIComponent(user.id)}`}
                        />
                    );
                }));
            }
        }).catch(handleError);
    }

    useEffect(() => {
       displayActors();
       displayUsers();
       displayCases();
    }, []);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} color={alertColor} />
            <div className="w-full h-full rounded-md flex flex-row p-1.5 gap-1.5 overflow-x-hidden overflow-y-scroll">
                <AdminPanelSection title={"Actors"} addEnabled={true} addTooltipText={"Add Actor"} handleAdd={() => navigate("/admin/add-actor")}>
                    {actors}
                </AdminPanelSection>
                <AdminPanelSection title={"Cases"} addEnabled={true} addTooltipText={"Add Case"} handleAdd={() => navigate("/admin/add-case")}>
                    {cases}
                </AdminPanelSection>
                <AdminPanelSection title={"Users"} addEnabled={false}>
                    {users}
                </AdminPanelSection>
            </div>
        </>
    );
}