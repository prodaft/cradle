import { PageLoader } from '@/components/base/page-loader';
import { DataTable } from '@/components/custom/data-table/data-table';
import NotFound from '@/components/feedback/not-found';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { createDashboardLink, FILE_DASHBOARD_SUBTYPE } from '@/utils/dashboard';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import { $api } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useParams, useRouter, useSearch } from '@tanstack/react-router';
import {
    type ColumnDef,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import bytes from 'bytes';
import { format } from 'date-fns';
import { FileText, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../dashboard/dashboard-layout';
import NotesList from '../notes/notes-list';
import { useFileDownload } from './use-file-download';

type LinkedEntry = components['schemas']['OptimizedEntryResponse'];

const FILE_DASHBOARD_TABS = [
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'entries', label: 'Linked Entries', icon: Share2 },
];

const EMPTY_ENTRIES: LinkedEntry[] = [];

const LINKED_ENTRY_COLUMNS: ColumnDef<LinkedEntry>[] = [
    {
        accessorKey: 'subtype',
        id: 'type',
        header: 'Type',
        cell: ({ row }) => (
            <Badge
                className={`rounded-full ${!row.original.color ? 'bg-muted' : ''}`}
                style={
                    row.original.color
                        ? { backgroundColor: row.original.color }
                        : undefined
                }
            >
                {row.original.subtype}
            </Badge>
        ),
    },
    {
        accessorKey: 'name',
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
            <span className='truncate block max-w-[300px]'>{row.original.name}</span>
        ),
    },
];

/**
 * File dashboard: the entry dashboard layout for a file, with the notes holding it (or a copy)
 * and the entries linked through them.
 */
export default function FileDashboard() {
    const { name } = useParams({ strict: false }) as { name?: string };
    const id = name?.slice(0, 36);
    const router = useRouter();
    const search = useSearch({ strict: false }) as { tab?: string };
    const tab =
        FILE_DASHBOARD_TABS.find((item) => item.id === search.tab)?.id ?? 'notes';

    const {
        data: file,
        isLoading,
        isError,
    } = $api.useQuery(
        'get',
        '/notes/files/{file_id}/',
        { params: { path: { file_id: id ?? '' } } },
        { enabled: !!id, retry: false },
    );

    useDockPanelTab(
        {
            title: file?.name ? `Dashboard: ${file.name}` : 'Dashboard',
            icon: 'dashboard',
        },
        isLoading || !!file,
    );

    const download = useFileDownload();

    const entriesTable = useReactTable({
        data: file?.entries ?? EMPTY_ENTRIES,
        columns: LINKED_ENTRY_COLUMNS,
        getRowId: (row, index) => String(row.id ?? index),
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied to clipboard');
        } catch {
            // Silently fail - user can try again
        }
    };

    if (isLoading) {
        return <PageLoader fill='container' />;
    }

    if (isError || !file?.id) {
        return <NotFound message='The file you are looking for does not exist.' />;
    }

    const fileId = file.id;
    const details = [
        file.mime_type,
        file.size != null ? bytes.format(file.size, { unitSeparator: ' ' }) : null,
        file.created_at
            ? `Uploaded ${format(new Date(file.created_at), 'dd/MM/yyyy, HH:mm')}`
            : null,
    ].filter(Boolean);
    const hashes = [
        { label: 'MD5', value: file.md5 },
        { label: 'SHA1', value: file.sha1 },
        { label: 'SHA256', value: file.sha256 },
    ].filter((hash): hash is { label: string; value: string } => !!hash.value);

    return (
        <DashboardLayout
            prefix={FILE_DASHBOARD_SUBTYPE}
            title={file.name || 'Unnamed file'}
            description={
                <>
                    <p>{details.join(' · ')}</p>
                    {hashes.map(({ label, value }) => (
                        <p key={label} className='text-muted-foreground mt-1'>
                            {label}{' '}
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <span
                                            className='font-mono break-all cursor-pointer hover:bg-muted px-1 rounded'
                                            onClick={() => copyToClipboard(value)}
                                        />
                                    }
                                >
                                    {value}
                                </TooltipTrigger>
                                <TooltipContent>Click to copy</TooltipContent>
                            </Tooltip>
                        </p>
                    ))}
                </>
            }
            actions={
                <Button
                    variant='outline'
                    size='sm'
                    className='shrink-0'
                    onClick={() => download.mutate(fileId)}
                    disabled={download.isPending}
                >
                    <DownloadSimpleIcon size={16} weight='bold' />
                    Download
                </Button>
            }
            tabs={FILE_DASHBOARD_TABS}
            tab={tab}
            resetScrollKey={fileId}
        >
            {tab === 'notes' && <NotesList hidePageHeader fileId={fileId} />}
            {tab === 'entries' && (
                <DataTable
                    table={entriesTable}
                    onRowClick={(entry) =>
                        router.navigate({ to: createDashboardLink(entry) as any })
                    }
                    getRowHref={createDashboardLink}
                    emptyMessage='No entries are linked to this file.'
                />
            )}
        </DashboardLayout>
    );
}
