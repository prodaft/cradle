import { SearchInput } from '@/components/base/search-input/search-input';
import { StatusIcon } from '@/components/base/status-icon/status-icon';
import { Badge } from '@/components/custom/badge';
import { DataTable } from '@/components/custom/data-table/data-table';
import NotFound from '@/components/feedback/not-found';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cradleJsonTheme } from '@/config/json-view';
import { queryKeys } from '@/hooks/query';
import {
    EMPTY_SEARCH_STATE,
    FREE_TEXT_SCHEMA,
    type SearchState,
} from '@/lib/search-query/search-schema';
import {
    CalendarIcon,
    CaretDownIcon,
    FileTextIcon,
    UserIcon,
    WarningCircleIcon,
    WarningIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from '@tanstack/react-router';
import {
    getCoreRowModel,
    getExpandedRowModel,
    useReactTable,
    type ColumnDef,
    type PaginationState,
    type Row,
    type Updater,
} from '@tanstack/react-table';
import JsonView from '@uiw/react-json-view';
import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type DigestRelation = components['schemas']['DigestRelation'];
type DigestNote = components['schemas']['DigestNote'];
type EntrySerializerMinimal = components['schemas']['EntrySerializerMinimal'];

type DigestTab = 'relations' | 'notes' | 'warnings' | 'errors';

/** How often a digest that is still being processed is refetched. */
const WORKING_REFETCH_MS = 5000;

const formatDate = (value?: string) =>
    value ? format(new Date(value), 'dd/MM/yyyy, HH:mm') : 'N/A';

/** "files_downloaded" -> "Files downloaded" */
const summaryLabel = (key: string) => {
    const words = key.replace(/_/g, ' ').trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
};

const messageText = (message: unknown) =>
    typeof message === 'string' ? message : JSON.stringify(message);

function EntryChip({ entry }: { entry?: EntrySerializerMinimal | null }) {
    if (!entry) return <span className='text-muted-foreground'>—</span>;
    return (
        <div className='flex min-w-0 items-center gap-2'>
            <Badge
                className={`rounded-full flex-shrink-0 ${entry.color ? '' : 'bg-muted'}`}
                style={entry.color ? { backgroundColor: entry.color } : undefined}
            >
                {entry.subtype}
            </Badge>
            <span className='truncate text-foreground' title={entry.name}>
                {entry.name}
            </span>
        </div>
    );
}

function MessageList({
    messages,
    kind,
}: {
    messages: unknown[];
    kind: 'warning' | 'error';
}) {
    if (messages.length === 0) {
        return (
            <p className='py-8 text-center text-sm text-muted-foreground'>
                No {kind}s.
            </p>
        );
    }
    return (
        <Card className='border-border bg-muted/5 py-0'>
            <CardContent className='p-0'>
                <div className='divide-y divide-border'>
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`px-4 py-3 flex items-center gap-3 border-l-2 ${kind === 'error' ? 'border-l-destructive' : 'border-l-muted-foreground'}`}
                        >
                            {kind === 'error' ? (
                                <WarningCircleIcon
                                    className='text-destructive flex-shrink-0'
                                    size={16}
                                />
                            ) : (
                                <WarningIcon
                                    className='text-muted-foreground flex-shrink-0'
                                    size={16}
                                />
                            )}
                            <span className='flex-1 text-sm text-foreground break-words'>
                                {messageText(message)}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function usePagedSearch() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [applied, setApplied] = useState<SearchState>(EMPTY_SEARCH_STATE);

    const applySearch = useCallback((state: SearchState) => {
        setApplied(state);
        setPage(1);
    }, []);
    const pagination = useMemo<PaginationState>(
        () => ({ pageIndex: page - 1, pageSize }),
        [page, pageSize],
    );
    const onPaginationChange = useCallback(
        (updater: Updater<PaginationState>) => {
            const next = typeof updater === 'function' ? updater(pagination) : updater;
            if (next.pageSize !== pageSize) {
                setPageSize(next.pageSize);
                setPage(1);
            } else {
                setPage(next.pageIndex + 1);
            }
        },
        [pagination, pageSize],
    );

    return { page, pageSize, pagination, onPaginationChange, applied, applySearch };
}

/**
 * DigestDetail - one imported digest: its metadata and summary, the relations and
 * notes it created, and the warnings and errors raised while processing it.
 */
export default function DigestDetail() {
    const params = useParams({ strict: false });
    const id = String((params as { id?: string }).id ?? '');
    const router = useRouter();
    const queryClient = useQueryClient();

    const [tab, setTab] = useState<DigestTab | null>(null);
    const relationsPaging = usePagedSearch();
    const notesPaging = usePagedSearch();

    const {
        data: digest,
        isLoading,
        isError,
    } = useQuery({
        queryKey: queryKeys.digests.detail(id),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/digests/{digest_id}/',
                { params: { path: { digest_id: id } } },
            );
            if (error) throw { response, error };
            return data;
        },
        enabled: !!id,
        retry: false,
        refetchInterval: (query) =>
            query.state.data?.status === 'working' ? WORKING_REFETCH_MS : false,
        meta: {
            showErrorToast: false,
        },
    });
    const isWorking = digest?.status === 'working';

    // Polling stops with the digest's status, so load what was imported after the last poll.
    const previousStatus = useRef(digest?.status);
    useEffect(() => {
        if (previousStatus.current === 'working' && digest?.status !== 'working') {
            queryClient.invalidateQueries({
                queryKey: [...queryKeys.digests.all, 'relations'],
            });
            queryClient.invalidateQueries({
                queryKey: [...queryKeys.digests.all, 'notes'],
            });
        }
        previousStatus.current = digest?.status;
    }, [digest?.status, queryClient]);

    const relationsSearch = relationsPaging.applied.q;
    const { data: relationsPage, isFetching: isRelationsFetching } = useQuery({
        queryKey: queryKeys.digests.relations({
            id,
            page: relationsPaging.page,
            pageSize: relationsPaging.pageSize,
            search: relationsSearch,
        }),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/digests/{digest_id}/relations/',
                {
                    params: {
                        path: { digest_id: id },
                        query: {
                            page: relationsPaging.page,
                            page_size: relationsPaging.pageSize,
                            ...(relationsSearch ? { search: relationsSearch } : {}),
                        },
                    },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        enabled: !!digest,
        placeholderData: keepPreviousData,
        refetchInterval: isWorking ? WORKING_REFETCH_MS : false,
        meta: {
            showErrorToast: true,
        },
    });

    const notesSearch = notesPaging.applied.q;
    const { data: notesPage, isFetching: isNotesFetching } = useQuery({
        queryKey: queryKeys.digests.notes({
            id,
            page: notesPaging.page,
            pageSize: notesPaging.pageSize,
            search: notesSearch,
        }),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/digests/{digest_id}/notes/',
                {
                    params: {
                        path: { digest_id: id },
                        query: {
                            page: notesPaging.page,
                            page_size: notesPaging.pageSize,
                            ...(notesSearch ? { search: notesSearch } : {}),
                        },
                    },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        enabled: !!digest,
        placeholderData: keepPreviousData,
        refetchInterval: isWorking ? WORKING_REFETCH_MS : false,
        meta: {
            showErrorToast: true,
        },
    });

    const warnings = useMemo(() => (digest?.warnings as unknown[]) ?? [], [digest]);
    const errors = useMemo(() => (digest?.errors as unknown[]) ?? [], [digest]);
    const summary = useMemo(
        () =>
            // Sorted, since the stored JSON does not keep key order.
            Object.entries((digest?.summary as Record<string, unknown>) ?? {})
                .filter(
                    (entry): entry is [string, number | string] =>
                        typeof entry[1] === 'number' || typeof entry[1] === 'string',
                )
                .sort(([a], [b]) => a.localeCompare(b)),
        [digest],
    );
    const relationsCount = relationsPage?.count;
    const notesCount = notesPage?.count;

    // Open the first tab that has something in it once the counts are known.
    useEffect(() => {
        if (tab !== null || relationsCount === undefined || notesCount === undefined) {
            return;
        }
        if (relationsCount > 0) setTab('relations');
        else if (notesCount > 0) setTab('notes');
        else if (errors.length > 0) setTab('errors');
        else if (warnings.length > 0) setTab('warnings');
        else setTab('relations');
    }, [tab, relationsCount, notesCount, errors.length, warnings.length]);
    const activeTab = tab ?? 'relations';

    const dockPanelTitle = useMemo(() => {
        if (isError) return 'Not found';
        if (!digest) return 'Digest';
        const t = digest.title;
        return `Digest: ${t.length > 48 ? `${t.slice(0, 45)}…` : t}`;
    }, [digest, isError]);

    useDockPanelTab({
        title: dockPanelTitle,
        icon: isError ? 'not-found' : 'digest-data',
    });

    const relationColumns = useMemo<ColumnDef<DigestRelation>[]>(
        () => [
            {
                id: 'src',
                header: 'Source',
                cell: ({ row }) => <EntryChip entry={row.original.src} />,
            },
            {
                id: 'dst',
                header: 'Target',
                cell: ({ row }) => <EntryChip entry={row.original.dst} />,
            },
            {
                id: 'created_at',
                header: 'Created At',
                cell: ({ row }) => (
                    <div className='flex items-center justify-between gap-2 w-40'>
                        <span>{formatDate(row.original.created_at)}</span>
                        {row.getCanExpand() && (
                            <CaretDownIcon
                                className={`size-4 text-muted-foreground transition-transform flex-shrink-0 ${row.getIsExpanded() ? 'rotate-180' : ''}`}
                            />
                        )}
                    </div>
                ),
            },
        ],
        [],
    );

    const relationsTable = useReactTable({
        data: relationsPage?.results ?? [],
        columns: relationColumns,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getRowId: (row, index) => row.id ?? String(index),
        getRowCanExpand: (row) =>
            !!row.original.details && Object.keys(row.original.details).length > 0,
        state: { pagination: relationsPaging.pagination },
        onPaginationChange: relationsPaging.onPaginationChange,
        manualPagination: true,
        pageCount: relationsPage?.total_pages ?? 1,
        rowCount: relationsCount,
    });

    const relationDetails = useCallback(
        (row: Row<DigestRelation>) => (
            <div className='bg-muted/30 border-t px-4 py-3'>
                <JsonView
                    value={row.original.details as object}
                    collapsed={2}
                    displayDataTypes={false}
                    displayObjectSize={false}
                    enableClipboard={true}
                    style={{
                        backgroundColor: 'transparent',
                        fontSize: '12px',
                        ...cradleJsonTheme,
                    }}
                />
            </div>
        ),
        [],
    );

    const noteColumns = useMemo<ColumnDef<DigestNote>[]>(
        () => [
            {
                id: 'title',
                header: 'Title',
                cell: ({ row }) => (
                    <div className='flex min-w-0 items-center gap-2 max-w-md'>
                        <FileTextIcon
                            size={16}
                            className='text-muted-foreground flex-shrink-0'
                        />
                        <span className='truncate' title={row.original.title}>
                            {row.original.title || 'Untitled'}
                        </span>
                    </div>
                ),
            },
            {
                id: 'description',
                header: 'Description',
                cell: ({ row }) => (
                    <div
                        className='truncate max-w-md text-muted-foreground'
                        title={row.original.description}
                    >
                        {row.original.description}
                    </div>
                ),
            },
            {
                id: 'created_by',
                header: 'Owner',
                cell: ({ row }) => (
                    <div className='truncate w-32'>
                        {row.original.created_by?.username ?? 'N/A'}
                    </div>
                ),
            },
            {
                id: 'created_at',
                header: 'Created At',
                cell: ({ row }) => (
                    <div className='w-36'>{formatDate(row.original.created_at)}</div>
                ),
            },
        ],
        [],
    );

    const notesTable = useReactTable({
        data: notesPage?.results ?? [],
        columns: noteColumns,
        getCoreRowModel: getCoreRowModel(),
        getRowId: (row, index) => row.id ?? String(index),
        state: { pagination: notesPaging.pagination },
        onPaginationChange: notesPaging.onPaginationChange,
        manualPagination: true,
        pageCount: notesPage?.total_pages ?? 1,
        rowCount: notesCount,
    });

    if (isError) {
        return <NotFound message='The digest you are looking for does not exist.' />;
    }

    if (isLoading || !digest) {
        return (
            <div className='flex h-full w-full items-center justify-center text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    const entities = digest.entities ?? [];

    return (
        <div className='w-full h-full flex flex-col overflow-auto'>
            {/* Header */}
            <div className='w-full border-b border-border px-4 py-4'>
                <h1 className='text-2xl font-medium break-all text-foreground mb-2'>
                    {digest.title}
                </h1>
                <div className='h-px bg-card mb-2' />
                <div className='flex flex-wrap items-center gap-4 text-xs text-muted-foreground'>
                    {digest.status && (
                        <div className='flex items-center gap-1.5'>
                            <StatusIcon status={digest.status} size={16} />
                            <span className='capitalize'>{digest.status}</span>
                            {isWorking && <Spinner className='size-3' />}
                        </div>
                    )}
                    <Badge variant='secondary'>{digest.display_name}</Badge>
                    <div className='flex items-center gap-1.5'>
                        <CalendarIcon size={14} weight='bold' />
                        <span>{formatDate(digest.created_at)}</span>
                    </div>
                    {digest.created_by && (
                        <div className='flex items-center gap-1.5'>
                            <UserIcon size={14} weight='bold' />
                            <span>{digest.created_by.username}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className='flex flex-col gap-4 p-4'>
                {/* Summary */}
                {summary.length > 0 && (
                    <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5'>
                        {summary.map(([key, value]) => (
                            <Card key={key} className='border-border bg-muted/5 py-3'>
                                <CardContent className='px-4'>
                                    <div className='text-xs text-muted-foreground'>
                                        {summaryLabel(key)}
                                    </div>
                                    <div className='text-xl font-semibold tabular-nums text-foreground'>
                                        {typeof value === 'number'
                                            ? value.toLocaleString()
                                            : value}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Entities */}
                {entities.length > 0 && (
                    <div className='flex flex-wrap items-center gap-2'>
                        <span className='text-sm text-muted-foreground'>Entities:</span>
                        {entities.map((entity) => (
                            <EntryChip key={entity.id} entry={entity} />
                        ))}
                    </div>
                )}

                <Tabs
                    value={activeTab}
                    onValueChange={(value) => setTab(value as DigestTab)}
                >
                    <TabsList>
                        <TabsTrigger value='relations'>
                            Relations
                            {relationsCount !== undefined && ` (${relationsCount})`}
                        </TabsTrigger>
                        <TabsTrigger value='notes'>
                            Notes{notesCount !== undefined && ` (${notesCount})`}
                        </TabsTrigger>
                        <TabsTrigger value='warnings'>
                            Warnings ({warnings.length})
                        </TabsTrigger>
                        <TabsTrigger value='errors'>
                            Errors ({errors.length})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {activeTab === 'relations' && (
                    <div className='flex flex-col gap-2.5'>
                        <SearchInput
                            schema={FREE_TEXT_SCHEMA}
                            value={relationsPaging.applied}
                            onApply={relationsPaging.applySearch}
                            placeholder='Search relations...'
                            className='w-full min-w-0'
                        />
                        <DataTable
                            table={relationsTable}
                            density='compact'
                            isLoading={!relationsPage && isRelationsFetching}
                            onRowClickRow={(row) => row.toggleExpanded()}
                            interactiveRow={(row) => row.getCanExpand()}
                            renderSubRow={relationDetails}
                            emptyMessage='No relations found.'
                        />
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className='flex flex-col gap-2.5'>
                        <SearchInput
                            schema={FREE_TEXT_SCHEMA}
                            value={notesPaging.applied}
                            onApply={notesPaging.applySearch}
                            placeholder='Search notes...'
                            className='w-full min-w-0'
                        />
                        <DataTable
                            table={notesTable}
                            density='compact'
                            isLoading={!notesPage && isNotesFetching}
                            onRowClick={(note) =>
                                router.navigate({
                                    to: '/notes/$id',
                                    params: { id: String(note.id) },
                                })
                            }
                            getRowHref={(note) => `/notes/${note.id}`}
                            emptyMessage='No notes found.'
                        />
                    </div>
                )}

                {activeTab === 'warnings' && (
                    <MessageList messages={warnings} kind='warning' />
                )}
                {activeTab === 'errors' && (
                    <MessageList messages={errors} kind='error' />
                )}
            </div>
        </div>
    );
}
