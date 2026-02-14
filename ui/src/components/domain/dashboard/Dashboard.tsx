import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthState } from '@/hooks/auth/use-auth';
import { SparkleIcon } from '@phosphor-icons/react';
import {
    useLoaderData,
    useRouter,
    useRouterState,
    useSearch,
} from '@tanstack/react-router';
import { FileText, FolderOpen, History, Share2 } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import type { EntryResponse } from 'src/services/cradle/models';
import ActivityList from '../activity/ActivityList';
import DashboardEnrichmentRequests from './DashboardEnrichmentRequests';
import Files from './Files';
import Notes from './Notes';
import Relations from './relations';

export default function Dashboard() {
    const loaderData = useLoaderData({
        from: '/_authenticated/dashboards/$subtype/$name',
    }) as { entry: EntryResponse };
    const contentObject = loaderData?.entry;
    const { isAdmin } = useAuthState();
    const router = useRouter();
    const search = useSearch({
        from: '/_authenticated/dashboards/$subtype/$name',
    }) as { tab?: string };
    const location = useRouterState({
        select: (state) => state.location,
    });
    const dashboard = useRef<HTMLDivElement>(null);
    const activeTab = search.tab ?? 'notes';

    const handleTabChange = (tab: string) => {
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
    // Scroll to top on mount
    useEffect(() => {
        if (dashboard.current) {
            dashboard.current.scrollTo(0, 0);
        }
    }, [contentObject]);

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
                                        <span className='text-muted-foreground text-2xl mr-2'>{`${contentObject.subtype ?? contentObject.type}:`}</span>
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
