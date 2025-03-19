import { useNavigate, useLocation } from 'react-router-dom';
import {
    getEntities,
    getEntryClasses,
    getUsers,
} from '../../services/adminService/adminService';
import AdminPanelCardTypeMapping from '../AdminPanelCard/AdminPanelCardTypeMapping';
import AdminPanelCardEntity from '../AdminPanelCard/AdminPanelCardEntity';
import AdminPanelCardUser from '../AdminPanelCard/AdminPanelCardUser';
import AdminPanelCardEntryType from '../AdminPanelCard/AdminPanelCardEntryType';
import AdminPanelSection from '../AdminPanelSection/AdminPanelSection';
import { useEffect, useState } from 'react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { createDashboardLink } from '../../utils/dashboardUtils/dashboardUtils';
import useAuth from '../../hooks/useAuth/useAuth';
import { Tabs, Tab } from '../Tabs/Tabs';
import ResizableSplitPane from '../ResizableSplitPane/ResizableSplitPane';
import EntityForm from '../AdminPanelForms/EntityForm';
import EntryTypeForm from '../AdminPanelForms/EntryTypeForm';
import AccountSettings from '../AccountSettings/AccountSettings';
import { getMappingTypes } from '../../services/intelioService/intelioService';

/**
 * AdminPanel component - This component is used to display the AdminPanel.
 * Displays the AdminPanel with tabs for:
 * - Entities
 * - Entry Types
 * - Users (admin only)
 *
 * Each tab contains a list of cards using the adjusted cards which encapsulate
 * the logic for deletion, editing, and activity navigation.
 *
 * @returns {JSX.Element} AdminPanel
 */
export default function AdminPanel() {
    const [entities, setEntities] = useState(null);
    const [mappingTypes, setMappingTypes] = useState(null);
    const [users, setUsers] = useState(null);
    const [entryTypes, setEntryTypes] = useState(null);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [rightPane, setRightPane] = useState(null);
    const auth = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const handleError = displayError(setAlert, navigate);

    const displayEntities = async () => {
        getEntities()
            .then((response) => {
                if (response.status === 200) {
                    const fetchedEntities = response.data;
                    setEntities(
                        fetchedEntities.map((c) => (
                            <AdminPanelCardEntity
                                id={c.id}
                                key={`${c.subtype}:${c.name}`}
                                name={c.name}
                                searchKey={c.name}
                                description={c.description}
                                onDelete={displayEntities}
                                link={createDashboardLink(c)}
                                typename={c.subtype}
                                setRightPane={setRightPane}
                            />
                        )),
                    );
                }
            })
            .catch(handleError);
    };

    const displayEntryTypes = async () => {
        getEntryClasses(true)
            .then((response) => {
                if (response.status === 200) {
                    const fetchedEntryTypes = response.data;
                    setEntryTypes(
                        fetchedEntryTypes.map((c) => (
                            <AdminPanelCardEntryType
                                id={c.subtype}
                                key={c.subtype}
                                name={c.subtype}
                                searchKey={c.subtype}
                                onDelete={displayEntryTypes}
                                link={`/admin/edit/entry-type/${c.subtype.replace('/', '--')}`}
                                setRightPane={setRightPane}
                            />
                        )),
                    );
                }
            })
            .catch(handleError);
    };

    const displayUsers = async () => {
        getUsers()
            .then((response) => {
                if (response.status === 200) {
                    const fetchedUsers = response.data;
                    setUsers(
                        fetchedUsers.map((user) => (
                            <AdminPanelCardUser
                                id={user.id}
                                key={user.username}
                                name={user.username}
                                searchKey={user.username}
                                type={'user'}
                                onDelete={displayUsers}
                                link={`/admin/user-permissions/${encodeURIComponent(
                                    user.username,
                                )}/${encodeURIComponent(user.id)}`}
                                setRightPane={setRightPane}
                            />
                        )),
                    );
                }
            })
            .catch(handleError);
    };

    const displayMappingTypes = async () => {
        getMappingTypes()
            .then((response) => {
                if (response.status === 200) {
                    const mappingTypes = response.data;
                    setMappingTypes(
                        mappingTypes.map((x) => (
                            <AdminPanelCardTypeMapping
                                id={x.class}
                                name={x.name}
                                setRightPane={setRightPane}
                            />
                        )),
                    );
                }
            })
            .catch(handleError);
    };

    useEffect(() => {
        if (auth?.isAdmin()) {
            displayUsers();
        }
        displayEntities();
        displayEntryTypes();
        displayMappingTypes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state]);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='w-full h-full'>
                <ResizableSplitPane
                    initialSplitPosition={30} // matches the original 2/5 width
                    leftClassName='m-3'
                    leftContent={
                        <Tabs defaultTab={0}>
                            <Tab title='Entities'>
                                <AdminPanelSection
                                    addEnabled={auth?.isAdmin()}
                                    addTooltipText='Add Entity'
                                    handleAdd={() =>
                                        setRightPane(<EntityForm isEdit={false} />)
                                    }
                                    isLoading={entities === null}
                                >
                                    {entities}
                                </AdminPanelSection>
                            </Tab>
                            <Tab title='Entry Types'>
                                <AdminPanelSection
                                    addEnabled={auth?.isAdmin()}
                                    addTooltipText='Add Entry Class'
                                    handleAdd={() =>
                                        setRightPane(<EntryTypeForm isEdit={false} />)
                                    }
                                    isLoading={entryTypes === null}
                                >
                                    {entryTypes}
                                </AdminPanelSection>
                            </Tab>
                            {auth?.isAdmin() && (
                                <Tab title='Users'>
                                    <AdminPanelSection
                                        addEnabled={true}
                                        addTooltipText='Add User'
                                        handleAdd={() =>
                                            setRightPane(
                                                <AccountSettings isEdit={false} />,
                                            )
                                        }
                                        isLoading={users === null}
                                    >
                                        {users}
                                    </AdminPanelSection>
                                </Tab>
                            )}
                            <Tab title='Type Mappings'>
                                <AdminPanelSection
                                    addEnabled={false}
                                    handleAdd={() =>
                                        setRightPane(<EntryTypeForm isEdit={false} />)
                                    }
                                    isLoading={mappingTypes === null}
                                >
                                    {mappingTypes}
                                </AdminPanelSection>
                            </Tab>
                        </Tabs>
                    }
                    rightContent={<div>{rightPane}</div>}
                />
            </div>
        </>
    );
}
