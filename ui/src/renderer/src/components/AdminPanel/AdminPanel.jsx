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
import {
    getEnrichmentTypes,
    getMappingTypes,
} from '../../services/intelioService/intelioService';
import AdminPanelCardEnrichment from '../AdminPanelCard/AdminPanelCardEnrichment';
import AdminPanelCardManagement from '../AdminPanelCard/AdminPanelCardManagement';
import NoteSettingsForm from '../AdminPanelForms/NoteSettingsForm';
import GraphSettingsForm from '../AdminPanelForms/GraphSettingsForm';
import EntriesSettingsForm from '../AdminPanelForms/EntriesSettingsForm';
import UserSettingsForm from '../AdminPanelForms/UserSettingsForm';
import FileSettingsForm from '../AdminPanelForms/FileSettingsForm';

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
    const [enrichmentTypes, setEnrichmentTypes] = useState(null);
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
                        fetchedEntities.map((c) => {
                            return (
                                <AdminPanelCardEntity
                                    id={c.id}
                                    key={`${c.subtype}:${c.name}`}
                                    name={c.name}
                                    searchKey={`${c.subtype}:${c.name} ${c.description}`}
                                    onDelete={displayEntities}
                                    link={createDashboardLink(c)}
                                    typename={c.subtype}
                                    setRightPane={setRightPane}
                                />
                            );
                        }),
                    );
                }
            })
            .catch(handleError);
    };

    const displayEntryTypes = async () => {
        getEntryClasses(true, true)
            .then((response) => {
                if (response.status === 200) {
                    const fetchedEntryTypes = response.data;
                    setEntryTypes(
                        fetchedEntryTypes.map((c) => (
                            <AdminPanelCardEntryType
                                searchKey={c.subtype}
                                id={c.subtype}
                                key={c.subtype}
                                name={c.subtype}
                                count={c.count}
                                onDelete={displayEntryTypes}
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
                                searchKey={user.username}
                                key={user.username}
                                name={user.username}
                                onDelete={displayUsers}
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
                        mappingTypes.map((x) => {
                            console.log(x);
                            return (
                                <AdminPanelCardTypeMapping
                                    id={x.class_name}
                                    key={x.class_name}
                                    searchKey={x.name}
                                    name={x.name}
                                    setRightPane={setRightPane}
                                />
                            );
                        }),
                    );
                }
            })
            .catch(handleError);
    };

    const displayEnrichmentTypes = async () => {
        getEnrichmentTypes()
            .then((response) => {
                if (response.status === 200) {
                    const enrichmentTypes = response.data;
                    setEnrichmentTypes(
                        enrichmentTypes.map((x) => (
                            <AdminPanelCardEnrichment
                                id={x.class}
                                key={x.class}
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
            displayEnrichmentTypes();
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
                        <Tabs defaultTab={0} queryParam={'tab'}>
                            <Tab title='Entities'>
                                <AdminPanelSection
                                    addEnabled={auth?.isAdmin()}
                                    addTooltipText='Add Entity'
                                    handleAdd={(onAdd) =>
                                        setRightPane(
                                            <EntityForm
                                                isEdit={false}
                                                onAdd={(c) =>
                                                    onAdd(
                                                        <AdminPanelCardEntity
                                                            id={c.id}
                                                            key={`${c.subtype}:${c.name}`}
                                                            name={c.name}
                                                            searchKey={c.name}
                                                            onDelete={displayEntities}
                                                            link={createDashboardLink(
                                                                c,
                                                            )}
                                                            typename={c.subtype}
                                                            setRightPane={setRightPane}
                                                        />,
                                                    )
                                                }
                                            />,
                                        )
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
                                    handleAdd={(onAdd) =>
                                        setRightPane(
                                            <EntryTypeForm
                                                isEdit={false}
                                                onAdd={(c) =>
                                                    onAdd(
                                                        <AdminPanelCardEntryType
                                                            searchKey={c.subtype}
                                                            id={c.subtype}
                                                            key={c.subtype}
                                                            name={c.subtype}
                                                            count={c.count}
                                                            onDelete={displayEntryTypes}
                                                            setRightPane={setRightPane}
                                                        />,
                                                    )
                                                }
                                            />,
                                        )
                                    }
                                    isLoading={entryTypes === null}
                                >
                                    {entryTypes}
                                </AdminPanelSection>
                            </Tab>
                            <Tab title='Type Mappings'>
                                <AdminPanelSection
                                    addEnabled={false}
                                    isLoading={mappingTypes === null}
                                >
                                    {mappingTypes}
                                </AdminPanelSection>
                            </Tab>
                            {auth?.isAdmin() && (
                                <Tab title='Users'>
                                    <AdminPanelSection
                                        addEnabled={true}
                                        addTooltipText='Add User'
                                        handleAdd={(onAdd) =>
                                            setRightPane(
                                                <AccountSettings
                                                    isEdit={false}
                                                    onAdd={(user) =>
                                                        onAdd(
                                                            <AdminPanelCardUser
                                                                id={user.id}
                                                                searchKey={
                                                                    user.username
                                                                }
                                                                key={user.username}
                                                                name={user.username}
                                                                onDelete={displayUsers}
                                                                setRightPane={
                                                                    setRightPane
                                                                }
                                                            />,
                                                        )
                                                    }
                                                />,
                                            )
                                        }
                                        isLoading={users === null}
                                    >
                                        {users}
                                    </AdminPanelSection>
                                </Tab>
                            )}
                            {auth?.isAdmin() && (
                                <Tab title='Enrichment'>
                                    <AdminPanelSection
                                        addEnabled={false}
                                        isLoading={enrichmentTypes === null}
                                    >
                                        {enrichmentTypes}
                                    </AdminPanelSection>
                                </Tab>
                            )}
                            {auth?.isAdmin() && (
                                <Tab title='Management'>
                                    <AdminPanelSection
                                        addEnabled={false}
                                        isLoading={false}
                                    >
                                        {[
                                            <AdminPanelCardManagement
                                                id='note'
                                                key='note'
                                                setRightPane={setRightPane}
                                                name='Note Settings'
                                                SettingComponent={NoteSettingsForm}
                                            />,

                                            <AdminPanelCardManagement
                                                id='files'
                                                key='files'
                                                setRightPane={setRightPane}
                                                name='File Settings'
                                                SettingComponent={FileSettingsForm}
                                            />,
                                            <AdminPanelCardManagement
                                                id='graph'
                                                key='graph'
                                                setRightPane={setRightPane}
                                                name='Graph Settings'
                                                SettingComponent={GraphSettingsForm}
                                            />,
                                            <AdminPanelCardManagement
                                                id='entries'
                                                key='entries'
                                                setRightPane={setRightPane}
                                                name='Entry Settings'
                                                SettingComponent={EntriesSettingsForm}
                                            />,
                                            <AdminPanelCardManagement
                                                id='users'
                                                key='users'
                                                setRightPane={setRightPane}
                                                name='New User Settings'
                                                SettingComponent={UserSettingsForm}
                                            />,
                                        ]}
                                    </AdminPanelSection>
                                </Tab>
                            )}
                        </Tabs>
                    }
                    rightContent={<div>{rightPane}</div>}
                />
            </div>
        </>
    );
}
