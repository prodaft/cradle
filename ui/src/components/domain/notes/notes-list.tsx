import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DateRangeFilterButton } from '@/components/data-table/data-table-date-range-filter';
import EnrichmentRequestDialog from '@/components/domain/enrichment/dialogs/enrichment-request-dialog';
import ReportGenerationDialog from '@/components/domain/reports/dialogs/report-generation-dialog';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/ui/action-bar';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import { truncateText } from '@/utils/dashboard';
import { parseMarkdownInline } from '@/utils/parser';
import {
    ArrowClockwiseIcon,
    ChartBarIcon,
    DotsThreeIcon,
    PlusCircleIcon,
    SparkleIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    ColumnDef,
    type RowSelectionState,
    SortingState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { startCase } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ActionBarButton, ActionBarSearch } from '../../base/action-bar/action-bar';
import { DateRangeFilter, type SortDirection } from '../../base/list-view/types';
import PreviewTip from '../../base/preview/preview-tip';
import StatusHeaderDropdown from '../../base/status-header-dropdown/status-header-dropdown';
import OfflineIndicator from '../../feedback/offline-indicator';
import { NotePreviewContent } from './note-preview-content';
import { StatusIcon, type StatusType } from './status-icon';

type NoteListResponse = components['schemas']['NoteListResponse'];
type NoteMetadata = { title?: string; description?: string };
type OptimizedEntryResponse = components['schemas']['OptimizedEntryResponse'];

interface Query {
    any_field?: string;
    content?: string;
    author__username?: string;
    editor__username?: string;
    date?: string;
    references?: string[];
    linked_to?: number | string;
    linked_to_exact_match?: boolean;
    created_date_from?: string;
    created_date_to?: string;
    updated_date_from?: string;
    updated_date_to?: string;
    timestamp_gte?: string;
    timestamp_lte?: string;
    truncate?: number;
}

interface ColumnFilters {
    [key: string]: string | DateRangeFilter | undefined;
    status: string;
    author: string;
    editor: string;
    timestamp: DateRangeFilter;
    edit_timestamp: DateRangeFilter;
}

interface ContentSearch {
    value: string;
    onChange?: (value: string) => void;
    onSubmit?: (value?: string) => void;
}

interface NotesListProps {
    query: Query | null;
    filteredNotes?: NoteListResponse[];
    hideFleetingNotes?: boolean;
    noteActions?: unknown[];
    hideActionBar?: boolean;
    references?: unknown;
    onFilterChange?: ((column: string, value: string | DateRangeFilter) => void) | null;
    contentSearch?: ContentSearch | null;
    onCreateNote?: (() => void) | null;
    onTotalCountChange?: ((count: { current: number; total: number }) => void) | null;
}

export default function NotesList({
    query,
    filteredNotes = [],
    hideFleetingNotes = false,
    noteActions: _noteActions = [],
    hideActionBar = false,
    references: _references = null,
    onFilterChange = null,
    contentSearch = null,
    onCreateNote = null,
    onTotalCountChange = null,
}: NotesListProps) {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });
    const { isAdmin } = useAuthState();

    const searchAny = search as any;
    const page = Number(searchAny?.notes_page ?? 1) || 1;
    const sortField = (searchAny?.notes_sort_field ?? 'timestamp') as string;
    const sortDirection: SortDirection = (searchAny?.notes_sort_direction ??
        'desc') as SortDirection;
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleteNoteIds, setBulkDeleteNoteIds] = useState<string[]>([]);
    const [singleDeleteDialogOpen, setSingleDeleteDialogOpen] = useState(false);
    const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [reportSelectedNotes, setReportSelectedNotes] = useState<
        Array<{ id: string; title: string }>
    >([]);
    const [enrichmentDialogOpen, setEnrichmentDialogOpen] = useState(false);
    const [enrichmentNotesList, setEnrichmentNotesList] = useState<
        Array<{ id: string; title: string; entities: OptimizedEntryResponse[] }>
    >([]);
    const [relinkDialogOpen, setRelinkDialogOpen] = useState(false);
    const queryClient = useQueryClient();

    const relinkAllNotesMutation = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.POST(
                '/notes/relink/',
                { body: undefined },
            );
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.notes.apiList() }],
            suppressNotification: true,
        },
    });
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const pageSize = Number(searchAny?.notes_pagesize ?? 20) || 20;
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        status: 'all',
        any_field: query?.any_field || '',
        author: query?.author__username || '',
        editor: query?.editor__username || '',
        timestamp: {
            // Only treat date filters as active when the range is complete.
            from:
                query?.created_date_from && query?.created_date_to
                    ? query.created_date_from
                    : '',
            to:
                query?.created_date_from && query?.created_date_to
                    ? query.created_date_to
                    : '',
        },
        edit_timestamp: {
            from:
                query?.updated_date_from && query?.updated_date_to
                    ? query.updated_date_from
                    : '',
            to:
                query?.updated_date_from && query?.updated_date_to
                    ? query.updated_date_to
                    : '',
        },
    });
    const containerRef = useRef<HTMLDivElement>(null);

    // Mapping of table columns to API field names
    const sortFieldMapping = useMemo<Record<string, string>>(
        () => ({
            title: 'title',
            description: 'timestamp',
            author: 'author__username',
            editor: 'editor__username',
            timestamp: 'timestamp',
            edit_timestamp: 'edit_timestamp',
        }),
        [],
    );

    const handleSortingChange = useCallback(
        (sorting: SortingState) => {
            const newSearch: any = {
                ...searchAny,
                notes_page: 1,
            };
            if (sorting.length === 0) {
                delete newSearch.notes_sort_field;
                delete newSearch.notes_sort_direction;
            } else {
                const sort = sorting[0];
                const apiField = sortFieldMapping[sort.id] || sort.id;
                newSearch.notes_sort_field = apiField;
                newSearch.notes_sort_direction = sort.desc ? 'desc' : 'asc';
            }
            router.navigate({
                to: location.pathname as any,
                search: newSearch as any,
                replace: true,
            });
        },
        [searchAny, router, location.pathname, sortFieldMapping],
    );

    const handleColumnFilter = useCallback(
        (column: string, value: string | DateRangeFilter) => {
            setColumnFilters((prev) => ({
                ...prev,
                [column]: value,
            }));

            if (onFilterChange) {
                onFilterChange(column, value);
            }
        },
        [onFilterChange],
    );

    const handleStatusChange = useCallback((status: string) => {
        setColumnFilters((prev) => ({
            ...prev,
            status,
        }));
    }, []);

    useEffect(() => {
        setColumnFilters({
            any_field: query?.any_field || '',
            author: query?.author__username || '',
            editor: query?.editor__username || '',
            timestamp: {
                from:
                    query?.created_date_from && query?.created_date_to
                        ? query.created_date_from
                        : '',
                to:
                    query?.created_date_from && query?.created_date_to
                        ? query.created_date_to
                        : '',
            },
            edit_timestamp: {
                from:
                    query?.updated_date_from && query?.updated_date_to
                        ? query.updated_date_from
                        : '',
                to:
                    query?.updated_date_from && query?.updated_date_to
                        ? query.updated_date_to
                        : '',
            },
            status: 'all',
        });
    }, [
        query?.any_field,
        query?.author__username,
        query?.editor__username,
        query?.created_date_from,
        query?.created_date_to,
        query?.updated_date_from,
        query?.updated_date_to,
    ]);

    // Prepare query parameters
    const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
    const hasCompleteCreatedRange =
        Boolean(columnFilters.timestamp?.from) && Boolean(columnFilters.timestamp?.to);
    const hasCompleteUpdatedRange =
        Boolean(columnFilters.edit_timestamp?.from) && Boolean(columnFilters.edit_timestamp?.to);

    const queryParams = useMemo(() => {
        if (!query) return null;

        const params: Record<string, unknown> = {
            page,
            page_size: pageSize,
            order_by: orderBy,
            linked_to: query.linked_to,
            status:
                columnFilters.status === 'all'
                    ? hideFleetingNotes
                        ? 'finalized'
                        : undefined
                    : columnFilters.status,
            any_field: query.any_field,
            content: query.content,
            author__username: query.author__username,
            date: query.date,
            references: query.references,
            timestamp_gte: hasCompleteCreatedRange
                ? columnFilters.timestamp.from
                : undefined,
            timestamp_lte: hasCompleteCreatedRange
                ? columnFilters.timestamp.to
                : undefined,
            edit_timestamp_gte: hasCompleteUpdatedRange
                ? columnFilters.edit_timestamp.from
                : undefined,
            edit_timestamp_lte: hasCompleteUpdatedRange
                ? columnFilters.edit_timestamp.to
                : undefined,
            truncate: query.truncate,
        };

        Object.keys(params).forEach(
            (key) => params[key] === undefined && delete params[key],
        );

        return params;
    }, [
        page,
        pageSize,
        query,
        columnFilters.status,
        hideFleetingNotes,
        columnFilters.timestamp,
        columnFilters.edit_timestamp,
        hasCompleteCreatedRange,
        hasCompleteUpdatedRange,
        orderBy,
    ]);

    // Query for notes
    const {
        data: notesData,
        isLoading,
        isPaused,
    } = $api.useQuery(
        'get',
        '/notes/',
        { params: { query: queryParams as any } },
        {
            enabled: query != null && queryParams != null,
            meta: {
                showErrorToast: true,
            },
        },
    );

    const notes = useMemo(() => notesData?.results ?? [], [notesData]);
    const totalPages = notesData?.total_pages || 1;
    const totalCount = notesData?.count || 0;

    // Update total count callback
    useEffect(() => {
        if (onTotalCountChange) {
            onTotalCountChange({ current: notes.length, total: totalCount });
        }
    }, [notes.length, totalCount, onTotalCountChange]);

    const handleRelinkAll = useCallback(() => {
        setRelinkDialogOpen(true);
    }, []);

    const executeRelink = useCallback(
        async () => {
            await relinkAllNotesMutation.mutateAsync();
            toast.success('Relinking all notes...');
            setRowSelection({});
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.apiList() });
        },
        [relinkAllNotesMutation, queryClient],
    );

    const handlePageChange = useCallback(
        (newPage: number) => {
            router.navigate({
                to: location.pathname as any,
                search: { ...searchAny, notes_page: newPage } as any,
                replace: true,
            });
        },
        [searchAny, router, location.pathname],
    );

    // Handle pagination changes from DataTable
    const handlePaginationChange = useCallback(
        (pageIndex: number, newPageSize: number) => {
            const newPage = pageIndex + 1; // Convert 0-based to 1-based

            // Handle page size change
            if (newPageSize !== pageSize) {
                const newSearch: any = {
                    ...searchAny,
                    notes_page: 1,
                    notes_pagesize: newPageSize,
                };
                router.navigate({
                    to: location.pathname as any,
                    search: newSearch as any,
                    replace: true,
                });
            }
            // Handle page change
            else if (newPage !== page) {
                handlePageChange(newPage);
            }
        },
        [page, pageSize, searchAny, router, location.pathname, handlePageChange],
    );

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (noteId: string) => {
            const { error, response } = await fetchClient.DELETE('/notes/{note_id}/', {
                params: { path: { note_id: noteId } },
            });
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.notes.apiList() }],
            suppressNotification: true,
        },
    });

    const executeBulkDelete = async (selectedIds: string[]) => {
        try {
            const deletePromises = selectedIds.map((id) =>
                deleteMutation.mutateAsync(id),
            );
            const results = await Promise.allSettled(deletePromises);

            const successes = results.filter((r) => r.status === 'fulfilled').length;
            const failures = results.filter((r) => r.status === 'rejected').length;

            if (failures === 0) {
                toast.success(
                    `Successfully deleted ${successes} note${successes > 1 ? 's' : ''}`,
                );
            } else if (successes === 0) {
                const firstRejected = results.find(
                    (r) => r.status === 'rejected',
                ) as PromiseRejectedResult;
                const parsed = await parseAPIError(firstRejected.reason);
                toast.error(getDisplayMessage(parsed));
            } else {
                toast.warning(
                    `Deleted ${successes} note${successes > 1 ? 's' : ''}, ${failures} failed`,
                );
            }

            setRowSelection({});
        } catch (error) {
            const parsed = await parseAPIError(error);
            toast.error(getDisplayMessage(parsed));
        }
    };

    // Convert sortField and sortDirection to TanStack Table sorting state
    const sorting = useMemo<SortingState>(() => {
        const columnId =
            Object.keys(sortFieldMapping).find(
                (key) => sortFieldMapping[key] === sortField,
            ) || sortField;

        return columnId
            ? [
                  {
                      id: columnId,
                      desc: sortDirection === 'desc',
                  },
              ]
            : [];
    }, [sortField, sortDirection, sortFieldMapping]);

    const onTableSortingChange = useCallback(
        (updater: SortingState | ((prev: SortingState) => SortingState)) => {
            const nextSorting =
                typeof updater === 'function' ? updater(sorting) : updater;
            handleSortingChange(nextSorting);
        },
        [handleSortingChange, sorting],
    );

    const selectedNoteIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    // Filter out filtered notes - optimized with Set for O(n) instead of O(n*m)
    const filteredData = useMemo(() => {
        if (filteredNotes.length === 0) return notes;
        const filteredNoteIds = new Set(filteredNotes.map((n) => n.id));
        return notes.filter((note) => !filteredNoteIds.has(note.id));
    }, [notes, filteredNotes]);

    const renderNotePreview = useCallback((note: NoteListResponse) => {
        return <NotePreviewContent note={note} />;
    }, []);

    // Memoize columns to prevent recreation on every render
    const columns = useMemo<ColumnDef<NoteListResponse>[]>(
        () => [
            {
                id: 'select',
                size: 28,
                minSize: 28,
                maxSize: 28,
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && 'indeterminate')
                        }
                        onCheckedChange={(value) =>
                            table.toggleAllPageRowsSelected(!!value)
                        }
                        aria-label='Select all'
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label='Select row'
                        onClick={(e) => e.stopPropagation()}
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                id: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const status = row.original.fleeting
                        ? 'fleeting'
                        : row.original.status;
                    if (!status) return null;
                    const label = row.original.fleeting
                        ? 'Fleeting'
                        : startCase(status);
                    return (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant='outline'
                                    className='py-1 [&>svg]:size-3.5 capitalize'
                                >
                                    <StatusIcon
                                        status={status as StatusType}
                                        size={14}
                                    />
                                    <span>{label}</span>
                                </Badge>
                            </TooltipTrigger>
                            {row.original.status_message && (
                                <TooltipContent>
                                    {row.original.status_message}
                                </TooltipContent>
                            )}
                        </Tooltip>
                    );
                },
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: 'title',
                id: 'title',
                header: 'Title',
                cell: ({ row }) => (
                    <PreviewTip
                        content={renderNotePreview(row.original)}
                        side='top'
                        align='start'
                        sideOffset={32}
                        size='lg'
                        openDelay={800}
                    >
                        <div
                            className='truncate w-64 cursor-pointer'
                            onClick={() => {
                                if (row.original.id) {
                                    router.navigate({
                                        to: '/notes/$id',
                                        params: { id: row.original.id.toString() },
                                    });
                                }
                            }}
                        >
                            <span className='truncate'>
                                {truncateText(
                                    parseMarkdownInline(
                                        (row.original.metadata as NoteMetadata)
                                            ?.title || '',
                                    ),
                                    64,
                                )}
                            </span>
                        </div>
                    </PreviewTip>
                ),
            },
            {
                accessorKey: 'description',
                id: 'description',
                header: 'Description',
                cell: ({ row }) => (
                    <div className='truncate max-w-xs'>
                        {(row.original.metadata as NoteMetadata)?.description
                            ? parseMarkdownInline(
                                  (row.original.metadata as NoteMetadata)
                                      ?.description ?? '',
                              )
                            : '-'}
                    </div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'author',
                id: 'author',
                header: ({ column }) => {
                    const filterValue = columnFilters.author as string;
                    return (
                        <div className='flex items-center gap-2'>
                            <DataTableColumnHeader column={column} label='Author' />
                            {filterValue && (
                                <span className='text-xs text-accent'>●</span>
                            )}
                        </div>
                    );
                },
                cell: ({ row }) => (
                    <div className='truncate w-32'>
                        {truncateText(row.original.author?.username || '', 16)}
                    </div>
                ),
            },
            {
                accessorKey: 'editor',
                id: 'editor',
                header: ({ column }) => {
                    const filterValue = columnFilters.editor as string;
                    return (
                        <div className='flex items-center gap-2'>
                            <DataTableColumnHeader column={column} label='Editor' />
                            {filterValue && (
                                <span className='text-xs text-accent'>●</span>
                            )}
                        </div>
                    );
                },
                cell: ({ row }) => (
                    <div className='truncate w-32'>
                        {truncateText(row.original.editor?.username || '', 16)}
                    </div>
                ),
            },
            {
                accessorKey: 'timestamp',
                id: 'timestamp',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Created At' />
                ),
                cell: ({ row }) => (
                    <div className='w-36'>
                        {row.original.timestamp
                            ? format(
                                  new Date(row.original.timestamp),
                                  'dd/MM/yyyy, HH:mm',
                              )
                            : 'N/A'}
                    </div>
                ),
            },
            {
                accessorKey: 'edit_timestamp',
                id: 'edit_timestamp',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Updated At' />
                ),
                cell: ({ row }) => (
                    <div className='w-36'>
                        {row.original.edit_timestamp
                            ? format(
                                  new Date(row.original.edit_timestamp),
                                  'dd/MM/yyyy, HH:mm',
                              )
                            : '-'}
                    </div>
                ),
            },
            {
                id: 'actions',
                header: '',
                size: 40,
                minSize: 40,
                maxSize: 40,
                cell: ({ row }) => {
                    const note = row.original;
                    return (
                        <div
                            className='text-right flex justify-end'
                            onClick={(e) => e.stopPropagation()}
                        >
                            {note.id && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant='ghost'
                                            size='icon-sm'
                                            className='text-muted-foreground hover:text-foreground'
                                            title='Actions'
                                        >
                                            <DotsThreeIcon
                                                className='w-4 h-4'
                                                weight='bold'
                                                aria-hidden='true'
                                            />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align='end'>
                                        {isAdmin && (
                                            <DropdownMenuItem
                                                onClick={handleRelinkAll}
                                            >
                                                <ArrowClockwiseIcon
                                                    size={16}
                                                    weight='bold'
                                                />
                                                Relink
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setReportSelectedNotes([
                                                    {
                                                        id: String(note.id),
                                                        title:
                                                            (
                                                                note.metadata as NoteMetadata
                                                            )?.title ||
                                                            note.title ||
                                                            'Untitled',
                                                    },
                                                ]);
                                                setReportDialogOpen(true);
                                            }}
                                        >
                                            <ChartBarIcon size={16} weight='bold' />
                                            Report
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setEnrichmentNotesList([
                                                    {
                                                        id: String(note.id),
                                                        title: ((
                                                            note.metadata as NoteMetadata
                                                        )?.title ||
                                                            note.title ||
                                                            'Untitled') as string,
                                                        entities: (note.entities ||
                                                            []) as OptimizedEntryResponse[],
                                                    },
                                                ]);
                                                setEnrichmentDialogOpen(true);
                                            }}
                                        >
                                            <SparkleIcon size={16} weight='bold' />
                                            Enrich
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            variant='destructive'
                                            onClick={() => {
                                                setDeletingNoteId(String(note.id));
                                                setSingleDeleteDialogOpen(true);
                                            }}
                                        >
                                            <TrashIcon size={16} weight='bold' />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [
            columnFilters,
            router,
            handleRelinkAll,
            setReportSelectedNotes,
            setReportDialogOpen,
            setEnrichmentNotesList,
            setEnrichmentDialogOpen,
            setDeletingNoteId,
            setSingleDeleteDialogOpen,
            renderNotePreview,
            isAdmin,
        ],
    );

    const table = useReactTable({
        data: filteredData,
        columns,
        state: {
            sorting,
            rowSelection,
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
            columnPinning: {
                right: ['actions'],
            },
        },
        getRowId: (row, index) => String(row.id ?? index),
        onSortingChange: onTableSortingChange,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: (updater) => {
            const currentPagination = {
                pageIndex: page - 1,
                pageSize,
            };
            const nextPagination =
                typeof updater === 'function' ? updater(currentPagination) : updater;
            handlePaginationChange(nextPagination.pageIndex, nextPagination.pageSize);
        },
        getCoreRowModel: getCoreRowModel(),
        enableRowSelection: true,
        manualPagination: true,
        manualSorting: true,
        pageCount: totalPages,
    });

    // Memoize notes map to avoid recreating it on every render
    const noteById = useMemo(() => {
        const map = new Map<string, NoteListResponse>();
        for (const note of notes) {
            if (note.id) {
                map.set(String(note.id), note);
            }
        }
        return map;
    }, [notes]);

    const handleReportSelected = useCallback(() => {
        if (selectedNoteIds.length === 0) return;
        const selectedNoteObjects = selectedNoteIds.map((id) => {
            const note = noteById.get(id);
            return {
                id,
                title:
                    (note?.metadata as NoteMetadata)?.title ||
                    note?.title ||
                    'Untitled',
            };
        });
        setReportSelectedNotes(selectedNoteObjects);
        setReportDialogOpen(true);
    }, [noteById, selectedNoteIds]);

    const handleEnrichSelected = useCallback(() => {
        if (selectedNoteIds.length === 0) return;
        const selectedNoteObjects = selectedNoteIds.map((id) => {
            const note = noteById.get(id);
            return {
                id,
                title: ((note?.metadata as NoteMetadata)?.title ||
                    note?.title ||
                    'Untitled') as string,
                entities: (note?.entities || []) as OptimizedEntryResponse[],
            };
        });
        setEnrichmentNotesList(selectedNoteObjects);
        setEnrichmentDialogOpen(true);
    }, [noteById, selectedNoteIds]);

    return (
        <>
            <div ref={containerRef} className='flex flex-col space-y-4'>
                {isPaused && (
                    <div className='mb-4'>
                        <OfflineIndicator />
                    </div>
                )}

                <div className='grid grid-cols-1 gap-2'>
                    <DataTable
                        table={table}
                        showViewOptions
                        isLoading={isLoading}
                        onRowClick={(note) =>
                            router.navigate({ to: `/notes/${note.id}` as any })
                        }
                        getRowHref={(note) => `/notes/${note.id}`}
                    >
                        <div className='flex items-center gap-2'>
                            {onCreateNote && hideActionBar && (
                                <ActionBarButton
                                    tooltip={
                                        <>
                                            Create new note{' '}
                                            <KbdGroup>
                                                <Kbd>Ctrl</Kbd>
                                                <Kbd>N</Kbd>
                                            </KbdGroup>
                                        </>
                                    }
                                    variant='circle'
                                    icon={<PlusCircleIcon width={18} height={18} />}
                                    iconActive={true}
                                    onClick={onCreateNote}
                                    disabled={isLoading}
                                />
                            )}
                            {contentSearch && (
                                <ActionBarSearch
                                    placeholder='Search content...'
                                    value={contentSearch.value || ''}
                                    debounceMs={300}
                                    onDebouncedChange={(v) => {
                                        contentSearch.onChange?.(v);
                                        contentSearch.onSubmit?.(v);
                                    }}
                                    onSubmit={(v) => contentSearch.onSubmit?.(v)}
                                />
                            )}
                            <StatusHeaderDropdown
                                onStatusChange={handleStatusChange}
                                status={columnFilters.status}
                                statusOptions={[
                                    'all',
                                    'fleeting',
                                    'healthy',
                                    'warning',
                                    'invalid',
                                    'processing',
                                ]}
                            />
                            <DateRangeFilterButton
                                title='Created At'
                                value={columnFilters.timestamp}
                                onChange={(v) => handleColumnFilter('timestamp', v)}
                            />
                            <DateRangeFilterButton
                                title='Updated At'
                                value={columnFilters.edit_timestamp}
                                onChange={(v) =>
                                    handleColumnFilter('edit_timestamp', v)
                                }
                            />
                        </div>
                    </DataTable>
                </div>
            </div>
            <ActionBar
                open={selectedNoteIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) setRowSelection({});
                }}
            >
                <ActionBarSelection>
                    {selectedNoteIds.length} note
                    {selectedNoteIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    {isAdmin && (
                        <ActionBarItem
                            onClick={handleRelinkAll}
                            disabled={isLoading || notes.length === 0}
                        >
                            <ArrowClockwiseIcon width={18} height={18} />
                            Relink
                        </ActionBarItem>
                    )}
                    <ActionBarItem
                        onClick={handleReportSelected}
                        disabled={
                            isLoading ||
                            notes.length === 0 ||
                            selectedNoteIds.length === 0
                        }
                    >
                        <ChartBarIcon width={18} height={18} />
                        Report
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={handleEnrichSelected}
                        disabled={
                            isLoading ||
                            notes.length === 0 ||
                            selectedNoteIds.length === 0
                        }
                    >
                        <SparkleIcon width={18} height={18} />
                        Enrich
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={() => {
                            if (selectedNoteIds.length > 0) {
                                setBulkDeleteNoteIds(selectedNoteIds);
                                setBulkDeleteDialogOpen(true);
                            }
                        }}
                        disabled={
                            isLoading ||
                            notes.length === 0 ||
                            selectedNoteIds.length === 0
                        }
                        className='text-destructive'
                    >
                        <TrashIcon width={18} height={18} />
                        Delete
                    </ActionBarItem>
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose className='px-2 text-sm'>Clear</ActionBarClose>
            </ActionBar>
            <AlertDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={(open) => {
                    setBulkDeleteDialogOpen(open);
                    if (!open) setBulkDeleteNoteIds([]);
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {bulkDeleteNoteIds.length}{' '}
                            note
                            {bulkDeleteNoteIds.length > 1 ? 's' : ''}? This action is
                            irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            size='sm'
                            onClick={async () => {
                                if (bulkDeleteNoteIds.length > 0) {
                                    await executeBulkDelete(bulkDeleteNoteIds);
                                    setBulkDeleteNoteIds([]);
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {deletingNoteId && (
                <AlertDialog
                    open={singleDeleteDialogOpen}
                    onOpenChange={(open) => {
                        setSingleDeleteDialogOpen(open);
                        if (!open) setDeletingNoteId(null);
                    }}
                >
                    <AlertDialogContent className='sm:max-w-md'>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete this note? This action
                                is irreversible.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel variant='outline' size='sm'>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                variant='destructive'
                                size='sm'
                                onClick={async () => {
                                    if (deletingNoteId) {
                                        try {
                                            await deleteMutation.mutateAsync(
                                                deletingNoteId,
                                            );
                                            toast.success('Note deleted successfully');
                                        } catch (_error) {
                                            const parsed = await parseAPIError(_error);
                                            toast.error(getDisplayMessage(parsed));
                                        }
                                    }
                                }}
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            <ReportGenerationDialog
                open={reportDialogOpen}
                onOpenChange={setReportDialogOpen}
                selectedNotes={reportSelectedNotes}
            />
            <EnrichmentRequestDialog
                open={enrichmentDialogOpen}
                onOpenChange={setEnrichmentDialogOpen}
                notesList={enrichmentNotesList}
            />
            <AlertDialog
                open={relinkDialogOpen}
                onOpenChange={setRelinkDialogOpen}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Relinking</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to relink all notes? This will
                            reprocess the relationships between notes and entities.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='default'
                            size='sm'
                            onClick={async () => {
                                try {
                                    await executeRelink();
                                    setRelinkDialogOpen(false);
                                } catch (error) {
                                    const parsed = await parseAPIError(error);
                                    toast.error(getDisplayMessage(parsed));
                                }
                            }}
                        >
                            Relink
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
