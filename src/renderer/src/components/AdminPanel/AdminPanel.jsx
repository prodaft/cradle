import AdminPanelSection from '../AdminPanelSection/AdminPanelSection';
import { useNavigate } from 'react-router-dom';
import {
    getEntities,
    getEntryClasses,
    getUsers,
} from '../../services/adminService/adminService';
import AdminPanelCard from '../AdminPanelCard/AdminPanelCard';
import { useEffect, useState } from 'react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { createDashboardLink } from '../../utils/dashboardUtils/dashboardUtils';

/**
 * AdminPanel component - This component is used to display the AdminPanel.
 * Displays the AdminPanel with the following sections:
 * - Actors
 * - Entities
 * - Users
 * Each section contains a list of cards with the respective information and actions.
 * The actions are:
 * - Create new entry
 * - Delete entry
 * When deleting an entry a dialog will be displayed to confirm the deletion.
 *
 * @function AdminPanel
 * @returns {AdminPanel}
 * @constructor
 */
export default function AdminPanel() {
    const [entities, setEntities] = useState([]);
    const [users, setUsers] = useState([]);
    const [artifact_types, setArtifactTypes] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
    const handleError = displayError(setAlert, navigate);

    const displayEntities = async () => {
        getEntities()
            .then((response) => {
                if (response.status === 200) {
                    let entities = response.data;
                    setEntities(
                        entities.map((c) => {
                            return (
                                <AdminPanelCard
                                    id={c.id}
                                    key={c.id}
                                    name={c.name}
                                    searchKey={c.name}
                                    description={c.description}
                                    type={'entries/entities'}
                                    onDelete={displayEntities}
                                    link={createDashboardLink(c)}
                                    typename={c.subtype}
                                />
                            );
                        }),
                    );
                }
            })
            .catch(handleError);
    };

    const displayArtifactTypes = async () => {
        getEntryClasses()
            .then((response) => {
                if (response.status === 200) {
                    let entities = response.data;
                    setArtifactTypes(
                        entities
                        .filter((c) => c.type == "artifact")
                        .map((c) => {
                            return (
                                <AdminPanelCard
                                    id={c.subtype}
                                    key={c.subtype}
                                    name={c.subtype}
                                    searchKey={c.subtype}
                                    type={'entries/artifacts'}
                                    onDelete={displayArtifactTypes}
                                />
                            );
                        }),
                    );
                }
            })
            .catch(handleError);
    };

    const displayUsers = async () => {
        getUsers()
            .then((response) => {
                if (response.status === 200) {
                    let users = response.data;
                    setUsers(
                        users.map((user) => {
                            return (
                                <AdminPanelCard
                                    id={user.id}
                                    key={user.id}
                                    name={user.username}
                                    searchKey={user.username}
                                    type={'users'}
                                    onDelete={displayUsers}
                                    link={`/admin/user-permissions/${encodeURIComponent(user.username)}/${encodeURIComponent(user.id)}`}
                                />
                            );
                        }),
                    );
                }
            })
            .catch(handleError);
    };

    useEffect(() => {
        displayUsers();
        displayEntities();
        displayArtifactTypes();
    }, []);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='w-full h-full rounded-md flex flex-row p-1.5 gap-1.5 overflow-x-hidden overflow-y-scroll'>
                <AdminPanelSection
                    title={'Entities'}
                    addEnabled={true}
                    addTooltipText={'Add Entity'}
                    handleAdd={() => navigate('/admin/add-entity')}
                >
                    {entities}
                </AdminPanelSection>
                <AdminPanelSection
                    title={'Artifact Types'}
                    addEnabled={true}
                    addTooltipText={'Add Artifact Type'}
                    handleAdd={() => navigate('/admin/add-artifact-type')}
                >
                    {artifact_types}
                </AdminPanelSection>
                <AdminPanelSection title={'Users'} addEnabled={false}>
                    {users}
                </AdminPanelSection>
            </div>
        </>
    );
}
