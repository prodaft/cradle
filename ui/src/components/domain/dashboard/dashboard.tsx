import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { useAuthState } from '@/hooks/auth/use-auth';
import { FILE_DASHBOARD_SUBTYPE } from '@/utils/dashboard';
import { SparkleIcon } from '@phosphor-icons/react';
import type { components } from '@services/openapi/schema';
import { useLoaderData, useParams, useSearch } from '@tanstack/react-router';
import { FileText, FolderOpen, History, Share2 } from 'lucide-react';
import { useMemo } from 'react';
import ActivityList from '../activity/activity-list';
import EnrichmentList from '../enrichment/enrichment-list';
import FileDashboard from '../files/file-dashboard';
import FilesList from '../files/files-list';
import NotesList from '../notes/notes-list';
import DashboardLayout from './dashboard-layout';
import Relations from './relations';

type EntryResponse = components['schemas']['EntryResponse'];

const DASHBOARD_ITEMS = [
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'relations', label: 'Relations', icon: Share2 },
    { id: 'files', label: 'Files', icon: FolderOpen },
    { id: 'enrichment', label: 'Enrichment', icon: SparkleIcon },
];

export default function Dashboard() {
    const { subtype } = useParams({ strict: false }) as { subtype?: string };
    return subtype === FILE_DASHBOARD_SUBTYPE ? <FileDashboard /> : <EntryDashboard />;
}

function EntryDashboard() {
    const { entry } = useLoaderData({
        from: '/_authenticated/dashboards/$subtype/$name',
    }) as { entry: EntryResponse };
    useDockPanelTab({
        title: entry?.name ? `Dashboard: ${entry.name}` : 'Dashboard',
        icon: 'dashboard',
    });
    const { isAdmin } = useAuthState();
    const search = useSearch({
        from: '/_authenticated/dashboards/$subtype/$name',
    }) as { tab?: string };
    const tab = search.tab ?? DASHBOARD_ITEMS[0]?.id ?? 'notes';

    const tabs = useMemo(
        () => [
            ...DASHBOARD_ITEMS,
            ...(isAdmin ? [{ id: 'eventlog', label: 'Event Log', icon: History }] : []),
        ],
        [isAdmin],
    );

    if (!entry) {
        return null;
    }

    return (
        <DashboardLayout
            prefix={entry.type ? (entry.subtype ?? entry.type) : undefined}
            title={entry.name}
            description={entry.description}
            tabs={tabs}
            tab={tab}
            resetScrollKey={entry}
        >
            {entry.id && (
                <>
                    {tab === 'notes' && (
                        <NotesList hidePageHeader linkedToEntryId={entry.id} />
                    )}
                    {tab === 'relations' && <Relations obj={entry} />}
                    {tab === 'files' && (
                        <FilesList hidePageHeader scope={{ linked_to: entry.id }} />
                    )}
                    {tab === 'enrichment' && (
                        <EnrichmentList hidePageHeader entryId={entry.id} />
                    )}
                    {tab === 'eventlog' && isAdmin && (
                        <ActivityList objectId={entry.id?.toString()} />
                    )}
                </>
            )}
        </DashboardLayout>
    );
}
