import {useAuth} from "../../hooks/useAuth/useAuth";
import AdminPanelSection from "../AdminPanelSection/AdminPanelSection";
import {useNavigate} from "react-router-dom";
import {getActors, getCases, getUsers} from "../../services/adminService/adminService";
import AdminPanelCard from "../AdminPanelCard/AdminPanelCard";
import {useEffect, useState} from "react";

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
 * @returns {JSX.Element}
 * @constructor
 */
export default function AdminPanel() {
    const auth = useAuth();
    const [agents, setAgents] = useState([]);
    const [cases, setCases] = useState([]);
    const [users, setUsers] = useState([]);
    const navigate = useNavigate();

    const displayAgents = async () => {
        getActors(auth.access).then((response) => {
            if(response.status === 200){
                let actors = response.data;
                setAgents(actors.map((actor) => {
                    return (
                        <AdminPanelCard id={actor.id} name={actor.name} description={actor.description} type={"entities/actors"} onDelete={displayAgents} link="/not-implemented"/>
                    );
                }));
            }
        }).catch((error) => {
            console.log(error);
        });
    }

    const displayCases = async () => {
        getCases(auth.access).then((response) => {
            if(response.status === 200){
                let cases = response.data;
                setCases(cases.map((aCase) => {
                    return (
                        <AdminPanelCard id={aCase.id} name={aCase.name} description={aCase.description} type={"entities/cases"} onDelete={displayCases} link="/not-implemented"/>
                    );
                }));
            }
        }).catch((error) => {
            console.log(error);
        });
    }

    const displayUsers = async () => {
        getUsers(auth.access).then((response) => {
            if(response.status === 200){
                let users = response.data;
                setUsers(users.map((user) => {
                    return (
                        <AdminPanelCard id={user.id} name={user.username} type={"users"} onDelete={displayUsers} link={`/admin/user-permissions/${user.username}/${user.id}`}/>
                    );
                }));
            }
        }).catch((error) => {
            console.log(error);
        });
    }

    useEffect(() => {
       displayAgents();
       displayUsers();
       displayCases();
    }, []);

    return (
        <div className="w-full h-full rounded-md flex flex-row p-1.5 gap-1.5 overflow-x-hidden overflow-y-scroll">
            <AdminPanelSection title={"Actors"} addEnabled={true} addTooltipText={"Add Actor"} handleAdd={() => navigate("/admin/add-actor")}>
                {agents}
            </AdminPanelSection>
            <AdminPanelSection title={"Cases"} addEnabled={true} addTooltipText={"Add Case"} handleAdd={() => navigate("/admin/add-case")}>
                {cases}
            </AdminPanelSection>
            <AdminPanelSection title={"Users"} addEnabled={false}>
                {users}
            </AdminPanelSection>
        </div>
    );
}