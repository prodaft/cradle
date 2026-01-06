import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { SearchableChild } from '@/hooks/search/useFrontendSearch';
import { createDashboardLink } from '@/utils/dashboard';
import {
    EnrichmentSubclass,
    Entity,
    EntryClass,
    MappingSubclass,
    UserRetrieve,
} from '@services/cradle/models';
import { uniqueId } from 'lodash';
import { ReactNode, useEffect, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLocation } from 'react-router-dom';
import { Tab, Tabs } from '../../layout/Tabs/Tabs';
import AccountSettings from '../user/AccountSettings';
import AdminPanelSection from './AdminPanelSection';
import AdminPanelCardEnrichment from './cards/AdminPanelCardEnrichment';
import AdminPanelCardEntity from './cards/AdminPanelCardEntity';
import AdminPanelCardEntryType from './cards/AdminPanelCardEntryType';
import AdminPanelCardManagement from './cards/AdminPanelCardManagement';
import AdminPanelCardTypeMapping from './cards/AdminPanelCardTypeMapping';
import AdminPanelCardUser from './cards/AdminPanelCardUser';
import EntityForm from './forms/EntityForm';
import EntriesSettingsForm from './forms/EntriesSettingsForm';
import EntryTypeForm from './forms/EntryTypeForm';
import FileSettingsForm from './forms/FileSettingsForm';
import GraphSettingsForm from './forms/GraphSettingsForm';
import NoteSettingsForm from './forms/NoteSettingsForm';
import UserSettingsForm from './forms/UserSettingsForm';

/**
 * AdminPanel component - This component is used to display the AdminPanel.
 * Displays the AdminPanel with tabs for:
 * - Entities
 * - Entry Types
 * - Users (admin only)
 *
 * Each tab contains a list of cards using the adjusted cards which encapsulate
 * the logic for deletion, editing, and activity navigation.
 */
export default function AdminPanel() {
    const [entities, setEntities] = useState<SearchableChild[] | null>(null);
    const [mappingTypes, setMappingTypes] = useState<SearchableChild[] | null>(null);
    const [enrichmentTypes, setEnrichmentTypes] = useState<SearchableChild[] | null>(null);
    const [users, setUsers] = useState<SearchableChild[] | null>(null);
    const { isAdmin } = useProfile();
    const [entryTypes, setEntryTypes] = useState<SearchableChild[] | null>(null);
    const [rightPane, setRightPane] = useState<ReactNode | null>(null);
    const location = useLocation();
    const { entriesApi, usersApi, queryApi, intelioApi } = useApi();
    const { execute } = useAPICall();

    const displayEntities = async () => {
        execute(() => queryApi.queryList({ type: 'entity' }))
            .then((response) => {
                const fetchedEntities = response.results;
                setEntities(
                    fetchedEntities.map((c) => {
                        const subtype = c.subtype || 'unknown';
                        return (
                            <AdminPanelCardEntity
                                id={c.id?.toString() || ''}
                                key={`${subtype}:${c.name}`}
                                name={c.name}
                                onDelete={displayEntities}
                                link={createDashboardLink(c)}
                                typename={subtype}
                                setRightPane={setRightPane}
                            />
                        );
                    }),
                );
            })
            .catch(() => { });
    };

    const displayEntryTypes = async () => {
        execute(() => entriesApi.entryClassesList({ showCount: true }))
            .then((fetchedEntryTypes) => {
                setEntryTypes(
                    (fetchedEntryTypes as any[]).map(
                        (
                            c, // TODO: Fix type when available in API, showCount might return a different type or it's EntryClass[]
                        ) => (
                            <AdminPanelCardEntryType
                                id={c.subtype}
                                key={c.subtype}
                                name={c.subtype}
                                count={c.count}
                                onDelete={displayEntryTypes}
                                setRightPane={setRightPane}
                            />
                        ),
                    ),
                );
            })
            .catch(() => { });
    };

    const displayUsers = async () => {
        execute(() => usersApi.usersList())
            .then((fetchedUsers) => {
                setUsers(
                    fetchedUsers.map((user: UserRetrieve) => (
                        <AdminPanelCardUser
                            id={user.id?.toString() || user.username}
                            key={user.username}
                            name={user.username}
                            onDelete={displayUsers}
                            setRightPane={setRightPane}
                        />
                    )),
                );
            })
            .catch(() => { });
    };

    const displayMappingTypes = async () => {
        execute(() => intelioApi.mappingsSubclassesList())
            .then((mappingTypes) => {
                if (mappingTypes) {
                    setMappingTypes(
                        mappingTypes.map((x: MappingSubclass) => {
                            return (
                                <AdminPanelCardTypeMapping
                                    id={x.className}
                                    key={x.className}
                                    name={x.name}
                                    setRightPane={setRightPane}
                                />
                            );
                        }),
                    );
                }
            })
            .catch(() => { });
    };

    const displayEnrichmentTypes = async () => {
        execute(() => intelioApi.enrichmentSubclassesList())
            .then((enrichmentTypes) => {
                if (enrichmentTypes) {
                    setEnrichmentTypes(
                        enrichmentTypes.map((x: EnrichmentSubclass) => {
                            return (
                                <AdminPanelCardEnrichment
                                    id={x.className}
                                    key={x.className}
                                    name={x.name}
                                    setRightPane={setRightPane}
                                />
                            );
                        }),
                    );
                }
            })
            .catch(() => { });
    };

    useEffect(() => {
        if (isAdmin()) {
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
            <div className='w-full h-full'>
                <PanelGroup direction='horizontal' className='h-full'>
                    <Panel defaultSize={30} minSize={20} maxSize={50}>
                        <div className='h-full overflow-y-auto'>
                            <Tabs defaultTab={0} queryParam={'tab'}>
                                <Tab title='Entities'>
                                    <AdminPanelSection
                                        title='Entities'
                                        addEnabled={isAdmin()}
                                        addTooltipText='Add Entity'
                                        handleAdd={(onAdd) =>
                                            setRightPane(
                                                <EntityForm
                                                    isEdit={false}
                                                    key={uniqueId('entity-form-')}
                                                    onAdd={(c: Entity) => {
                                                        const entity = c;
                                                        const subtype =
                                                            entity.subtype || 'unknown';
                                                        onAdd(
                                                            <AdminPanelCardEntity
                                                                id={
                                                                    entity.id?.toString() ||
                                                                    ''
                                                                }
                                                                key={`${subtype}:${entity.name}`}
                                                                name={entity.name}
                                                                onDelete={
                                                                    displayEntities
                                                                }
                                                                link={createDashboardLink(
                                                                    {
                                                                        name: entity.name,
                                                                        subtype,
                                                                        type: entity.type,
                                                                    },
                                                                )}
                                                                typename={subtype}
                                                                setRightPane={
                                                                    setRightPane
                                                                }
                                                            />,
                                                        );
                                                    }}
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
                                        title='Entry Types'
                                        addEnabled={isAdmin()}
                                        addTooltipText='Add Entry Class'
                                        handleAdd={(onAdd) =>
                                            setRightPane(
                                                <EntryTypeForm
                                                    isEdit={false}
                                                    key={uniqueId('entry-type-form-')}
                                                    onAdd={(c: EntryClass) =>
                                                        onAdd(
                                                            <AdminPanelCardEntryType
                                                                id={c.subtype}
                                                                key={c.subtype}
                                                                name={c.subtype}
                                                                // @ts-ignore - count might not be in EntryClass but in a subclass or extended type from list response
                                                                count={c.count}
                                                                onDelete={
                                                                    displayEntryTypes
                                                                }
                                                                setRightPane={
                                                                    setRightPane
                                                                }
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
                                        title='Type Mappings'
                                        addEnabled={false}
                                        addTooltipText=''
                                        handleAdd={() => { }}
                                        isLoading={mappingTypes === null}
                                    >
                                        {mappingTypes}
                                    </AdminPanelSection>
                                </Tab>
                                {isAdmin() && (
                                    <Tab title='Users'>
                                        <AdminPanelSection
                                            title='Users'
                                            addEnabled={true}
                                            addTooltipText='Add User'
                                            handleAdd={(onAdd) =>
                                                setRightPane(
                                                    <AccountSettings
                                                        isEdit={false}
                                                        key={uniqueId('user-form-')}
                                                        onAdd={(user: UserRetrieve) =>
                                                            onAdd(
                                                                <AdminPanelCardUser
                                                                    id={
                                                                        user.id?.toString() ||
                                                                        user.username
                                                                    }
                                                                    key={user.username}
                                                                    name={user.username}
                                                                    onDelete={
                                                                        displayUsers
                                                                    }
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
                                {isAdmin() && (
                                    <Tab title='Enrichment'>
                                        <AdminPanelSection
                                            title='Enrichment'
                                            addEnabled={false}
                                            addTooltipText=''
                                            handleAdd={() => { }}
                                            isLoading={enrichmentTypes === null}
                                        >
                                            {enrichmentTypes}
                                        </AdminPanelSection>
                                    </Tab>
                                )}
                                {isAdmin() && (
                                    <Tab title='Management'>
                                        <AdminPanelSection
                                            title='Management'
                                            addEnabled={false}
                                            addTooltipText=''
                                            handleAdd={() => { }}
                                            isLoading={false}
                                        >
                                            {[
                                                <AdminPanelCardManagement
                                                    key='note'
                                                    setRightPane={setRightPane}
                                                    name='Note Settings'
                                                    SettingComponent={NoteSettingsForm}
                                                />,

                                                <AdminPanelCardManagement
                                                    key='files'
                                                    setRightPane={setRightPane}
                                                    name='File Settings'
                                                    SettingComponent={FileSettingsForm}
                                                />,
                                                <AdminPanelCardManagement
                                                    key='graph'
                                                    setRightPane={setRightPane}
                                                    name='Graph Settings'
                                                    SettingComponent={GraphSettingsForm}
                                                />,
                                                <AdminPanelCardManagement
                                                    key='entries'
                                                    setRightPane={setRightPane}
                                                    name='Entry Settings'
                                                    SettingComponent={
                                                        EntriesSettingsForm
                                                    }
                                                />,
                                                <AdminPanelCardManagement
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
                        </div>
                    </Panel>
                    <PanelResizeHandle className='w-[2px] cradle-bg-elevated cradle-border-x hover:bg-[#FF8C00] hover:bg-opacity-50 transition-colors' />
                    <Panel defaultSize={70} minSize={50}>
                        <div className='max-h-[calc(100vh-5rem)] overflow-y-auto'>
                            {rightPane}
                        </div>
                    </Panel>
                </PanelGroup>
            </div>
        </>
    );
}
