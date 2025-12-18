import { useNotif } from '@/contexts/ui/NotificationContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { useTabContext } from '@/hooks/tabs/useTabContext';
import { EntryResponse } from '@services/cradle/models';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import NotFound from '../../feedback/NotFound';
import { Tab, Tabs } from '../../layout/Tabs/Tabs';
import { TabClasses } from '../../layout/Tabs/types';
import Files from './Files';
import Notes from './Notes';
import Relations from './Relations';

/**
 * Dashboard component
 * Fetches and displays the dashboard data for an entry
 * If the entry does not exist, displays a 404 page
 * The dashboard displays the entry's name, type, description, related actors, entities, artifacts, metadata, and notes
 * The dashboard only displays the fields provided by the server, different entries may have different fields
 * If the user is an admin, a delete button is displayed in the navbar
 * If the user is not in publish mode, a button to enter publish mode is displayed in the navbar
 * If the entry is linked to entities to which the user does not have access to, a button to request access to view them is displayed
 * If the entry is an artifact, a button to search the artifact name on VirusTotal is displayed
 *
 * @function Dashboard
 * @returns {Dashboard}
 * @constructor
 */
export default function Dashboard() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const location = useLocation();
    const { params } = useTabContext();
    const subtype = params.subtype;
    const name = params.name;
    const [entryMissing, setEntryMissing] = useState(false);
    const [contentObject, setContentObject] = useState<EntryResponse | null>(null);
    const { notify } = useNotif();
    const { queryApi, entriesApi } = useApi();
    const { navigate } = useCradleNavigate();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { profile, isAdmin } = useProfile();
    const dashboard = useRef<HTMLDivElement>(null);
    const { execute } = useAPICall();

    // On load, fetch the dashboard data for the entry
    useEffect(() => {
        setEntryMissing(false);
        setContentObject(null);

        if (!subtype || !name) {
            setEntryMissing(true);
            return;
        }

        queryApi
            .queryList({ subtype: [subtype], nameExact: [name] })
            .then((response) => {
                if (response.count !== 1) {
                    setEntryMissing(true);
                    return;
                }
                const obj = response.results[0];

                if (dashboard.current) {
                    dashboard.current.scrollTo(0, 0);
                }
                setContentObject(obj);
            });
    }, [subtype, name, setEntryMissing, setContentObject, queryApi]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleDelete = () => {
        if (!contentObject) return;
        // Only entities can be deleted (not artifacts)
        if (contentObject.type !== 'entity') {
            notify({
                type: 'error',
                text: 'Only entities can be deleted.',
            });
            return;
        }

        execute(() => entriesApi.entitiesDestroy({ entityId: contentObject.id! }), {
            successMessage: 'Entity deleted successfully.',
        })
            .then(() => {
                navigate('/');
            })
            .catch(() => { });
    };

    if (entryMissing) {
        return (
            <NotFound
                message={
                    'The entry you are looking for does not exist or you do not have access to it. If you believe the entry exists contact an administrator for access.'
                }
            />
        );
    }

    return (
        <>
            <div
                className='w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-hidden'
                ref={dashboard}
            >
                {contentObject == null ? (
                    <div className='flex items-center justify-center h-full'>
                        <div className='spinner-dot-pulse spinner-xl'>
                            <div className='spinner-pulse-dot'></div>
                        </div>
                    </div>
                ) : (
                    <div className='w-full h-full flex flex-col p-6 space-y-4'>
                        {contentObject.name && (
                            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4'>
                                <div>
                                    <h1 className='text-3xl font-medium break-all cradle-text-primary cradle-mono tracking-tight'>
                                        {contentObject.type && (
                                            <span className='cradle-text-tertiary text-2xl mr-2'>{`${contentObject.subtype ? contentObject.subtype : contentObject.type}:`}</span>
                                        )}
                                        {contentObject.name}
                                    </h1>
                                    {contentObject.description && (
                                        <p className='text-sm cradle-text-secondary mt-2 cradle-mono'>
                                            {contentObject.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                        {contentObject.id && (
                            <div className='cradle-card'>
                                <Tabs
                                    defaultTab={0}
                                    queryParam={'tab'}
                                    tabClass={TabClasses.UNDERLINE}
                                    perTabClass='w-[33%] justify-center'
                                >
                                    <Tab title='Notes' classes='pt-4'>
                                        <Notes obj={contentObject} />
                                    </Tab>
                                    <Tab title='Relations' classes='pt-4'>
                                        <Relations obj={contentObject} />
                                    </Tab>
                                    <Tab title='Files' classes='pt-4'>
                                        <Files obj={contentObject} />
                                    </Tab>
                                </Tabs>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className='w-full h-8' />
        </>
    );
}
