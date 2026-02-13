import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useApi from '@/hooks/api/use-api';
import { useAuthState } from '@/hooks/auth/use-auth';
import { SparkleIcon } from '@phosphor-icons/react';
import { useMutation } from '@tanstack/react-query';
import {
    useLoaderData,
    useRouter,
    useRouterState,
    useSearch,
} from '@tanstack/react-router';
import { FileText, FolderOpen, History, Share2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import ActivityList from '../activity/ActivityList';
import DashboardEnrichmentRequests from './DashboardEnrichmentRequests';
import Files from './Files';
import Notes from './Notes';
import Relations from './relations';

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
import type { EntryResponse } from 'src/services/cradle/models';

// ...

export default function Dashboard() {
    const loaderData = useLoaderData({
        from: '/_authenticated/dashboards/$subtype/$name',
    }) as { entry: EntryResponse };
    const contentObject = loaderData?.entry;
    const { entriesApi } = useApi();
    const { isAdmin } = useAuthState();
    const router = useRouter();
    const search = useSearch({ from: '/_authenticated/dashboards/$subtype/$name' });
    const location = useRouterState({
        select: (state) => state.location,
    });
    const dashboard = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState((search as any).tab || 'notes');

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        router.navigate({
            to: location.pathname as any,
            search: { ...search, tab } as any,
            replace: true,
        });
    };
    const tabs = useMemo(
        () => [
            { id: 'notes', label: 'Notes', icon: FileText },
            { id: 'relations', label: 'Relations', icon: Share2 },
            { id: 'files', label: 'Files', icon: FolderOpen },
            { id: 'enrichment', label: 'Enrichment', icon: SparkleIcon },
            ...(isAdmin ? [{ id: 'eventlog', label: 'Event Log', icon: History }] : []),
        ],
        [isAdmin],
    );
    const deleteEntityMutation = useMutation({
        mutationFn: async (entityId: number) => {
            await entriesApi.entitiesDestroy({ entityId });
        },
        meta: {
            successMessage: 'Entity deleted successfully.',
        },
        onSuccess: () => {
            router.navigate({ to: '/' });
        },
    });

    // Scroll to top on mount
    useEffect(() => {
        if (dashboard.current) {
            dashboard.current.scrollTo(0, 0);
        }
    }, [contentObject]);

    useEffect(() => {
        const tab = (search as any).tab;
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [search, activeTab]);

    useEffect(() => {
        // Only reset if no tab is specified in URL
        if (!(search as any).tab) {
            setActiveTab('notes');
        }
    }, [contentObject?.id]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleDelete = () => {
        if (!contentObject) return;
        // Only entities can be deleted (not artifacts)
        if (contentObject.type !== 'entity') {
            toast.error('Only entities can be deleted.');
            return;
        }
        if (contentObject.id) {
            deleteEntityMutation.mutate(contentObject.id);
        }
    };

    // Early return if no content object is available
    if (!contentObject) {
        return null;
    }

    return (
        <>
            <div
                className='w-full h-full flex justify-center items-start overflow-x-hidden overflow-y-auto'
                ref={dashboard}
            >
                <div className='w-full min-h-full flex flex-col p-6 space-y-4 overflow-hidden'>
                    {contentObject.name && (
                        <div className='flex justify-between items-center w-full border-b border-border pr-4 pb-4'>
                            <div className='flex flex-col'>
                                <h1 className='text-3xl font-medium break-all text-foreground tracking-tight'>
                                    {contentObject.type && (
                                        <span className='text-muted-foreground text-2xl mr-2'>{`${contentObject.subtype ? contentObject.subtype : contentObject.type}:`}</span>
                                    )}
                                    {contentObject.name}
                                </h1>
                                {contentObject.description && (
                                    <p className='text-sm text-foreground mt-2'>
                                        {contentObject.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    {contentObject.id && (
                        <div className='flex flex-1 flex-col space-y-4 overflow-hidden'>
                            <Tabs value={activeTab} onValueChange={handleTabChange}>
                                <TabsList className='flex-wrap h-auto'>
                                    {tabs.map((tab) => {
                                        const Icon = tab.icon;
                                        return (
                                            <TabsTrigger key={tab.id} value={tab.id}>
                                                <Icon />
                                                {tab.label}
                                            </TabsTrigger>
                                        );
                                    })}
                                </TabsList>
                            </Tabs>
                            <div className='faded-bottom h-full w-full overflow-x-auto overflow-y-auto scroll-smooth pb-12'>
                                {activeTab === 'notes' && <Notes obj={contentObject} />}
                                {activeTab === 'relations' && (
                                    <Relations obj={contentObject} />
                                )}
                                {activeTab === 'files' && <Files obj={contentObject} />}
                                {activeTab === 'enrichment' && (
                                    <DashboardEnrichmentRequests
                                        entryId={contentObject.id}
                                    />
                                )}
                                {activeTab === 'eventlog' && isAdmin && (
                                    <ActivityList
                                        name={contentObject.name}
                                        objectId={contentObject.id?.toString()}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className='w-full h-8' />
        </>
    );
}
