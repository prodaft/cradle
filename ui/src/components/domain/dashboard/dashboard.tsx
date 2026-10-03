import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthState } from '@/hooks/auth/use-auth';
import { SparkleIcon } from '@phosphor-icons/react';
import type { components } from '@services/openapi/schema';
import {
    useLoaderData,
    useRouter,
    useRouterState,
    useSearch,
} from '@tanstack/react-router';
import { FileText, FolderOpen, History, Share2 } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import ActivityList from '../activity/activity-list';
import EnrichmentList from '../enrichment/enrichment-list';
import FilesList from '../files/files-list';
import NotesList from '../notes/notes-list';
import Relations from './relations';

type EntryResponse = components['schemas']['EntryResponse'];

const DASHBOARD_ITEMS = [
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'relations', label: 'Relations', icon: Share2 },
    { id: 'files', label: 'Files', icon: FolderOpen },
    { id: 'enrichment', label: 'Enrichment', icon: SparkleIcon },
];

export default function Dashboard() {
    const { entry } = useLoaderData({
        from: '/_authenticated/dashboards/$subtype/$name',
    }) as { entry: EntryResponse };
    useDockPanelTab({
        title: entry?.name ? `Dashboard: ${entry.name}` : 'Dashboard',
        icon: 'dashboard',
    });
    const { isAdmin } = useAuthState();
    const router = useRouter();
    const search = useSearch({
        from: '/_authenticated/dashboards/$subtype/$name',
    }) as { tab?: string };
    const location = useRouterState({
        select: (state) => state.location,
    });
    const dashboard = useRef<HTMLDivElement>(null);
    const tab = search.tab ?? DASHBOARD_ITEMS[0]?.id ?? 'notes';

    const changeTab = (tabId: string) => {
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
    useEffect(() => {
        if (dashboard.current) {
            dashboard.current.scrollTo(0, 0);
        }
    }, [entry]);

    if (!entry) {
        return null;
    }

    return (
        <>
            <div
                className='w-full h-full flex justify-center items-start overflow-x-hidden overflow-y-auto'
                ref={dashboard}
            >
                <div className='w-full min-h-full flex flex-col p-6 space-y-4 overflow-hidden'>
                    {entry.name && (
                        <div className='flex justify-between items-center w-full border-b border-border pr-4 pb-4'>
                            <div className='flex flex-col'>
                                <h1 className='text-3xl font-medium break-all text-foreground tracking-tight'>
                                    {entry.type && (
                                        <span className='text-muted-foreground text-2xl mr-2'>{`${entry.subtype ?? entry.type}:`}</span>
                                    )}
                                    {entry.name}
                                </h1>
                                {entry.description && (
                                    <p className='text-sm text-foreground mt-2'>
                                        {entry.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    {entry.id && (
                        <div className='flex flex-1 flex-col space-y-4 overflow-hidden'>
                            <Tabs value={tab} onValueChange={changeTab}>
                                <TabsList className='flex-nowrap overflow-x-auto overflow-y-hidden w-full md:w-fit min-w-0 h-auto justify-start md:justify-center [&>button]:shrink-0 [&>button]:flex-none'>
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
                                {tab === 'notes' && (
                                    <NotesList
                                        hidePageHeader
                                        linkedToEntryId={entry.id}
                                    />
                                )}
                                {tab === 'relations' && <Relations obj={entry} />}
                                {tab === 'files' && (
                                    <FilesList
                                        hidePageHeader
                                        scope={{ linked_to: entry.id }}
                                    />
                                )}
                                {tab === 'enrichment' && (
                                    <EnrichmentList hidePageHeader entryId={entry.id} />
                                )}
                                {tab === 'eventlog' && isAdmin && (
                                    <ActivityList objectId={entry.id?.toString()} />
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
