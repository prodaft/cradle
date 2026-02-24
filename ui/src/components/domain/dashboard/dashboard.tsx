import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
import ActivityList from '../activity/activity-list';
import DashboardEnrichmentRequests from './enrichment';
import Files from './files';
import Notes from './notes';
import Relations from './relations';

const DASHBOARD_ITEMS = [
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'relations', label: 'Relations', icon: Share2 },
    { id: 'files', label: 'Files', icon: FolderOpen },
    { id: 'enrichment', label: 'Enrichment', icon: SparkleIcon },
];

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
    const tab = search.tab ?? DASHBOARD_ITEMS[0].id;

    const handleTabChange = (tabId: string) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), tab: tabId },
            replace: true,
        });
    };
    const tabs = useMemo(
        () => [
            ...DASHBOARD_ITEMS,
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
                            <Tabs value={tab} onValueChange={handleTabChange}>
                                <TabsList className='flex-wrap h-auto'>
                                    {tabs.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <TabsTrigger key={item.id} value={item.id}>
                                                <Icon />
                                                {item.label}
                                            </TabsTrigger>
                                        );
                                    })}
                                </TabsList>
                            </Tabs>
                            <ScrollArea className='faded-bottom h-full w-full pb-12'>
                                {tab === 'notes' && <Notes obj={contentObject} />}
                                {tab === 'relations' && (
                                    <Relations obj={contentObject} />
                                )}
                                {tab === 'files' && <Files obj={contentObject} />}
                                {tab === 'enrichment' && (
                                    <DashboardEnrichmentRequests
                                        entryId={contentObject.id}
                                    />
                                )}
                                {tab === 'eventlog' && isAdmin && (
                                    <ActivityList
                                        name={contentObject.name}
                                        objectId={contentObject.id?.toString()}
                                    />
                                )}
                                <ScrollBar orientation='horizontal' />
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </div>
            <div className='w-full h-8' />
        </>
    );
}
