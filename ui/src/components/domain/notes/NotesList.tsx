import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/ui/action-bar';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import type { OptimizedEntryResponse } from '@/services/cradle';
import { truncateText } from '@/utils/dashboard';
import { parseMarkdownInline } from '@/utils/parser';
import type { NoteRetrieve, NoteRetrieveStatusEnum } from '@services/cradle/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    type SortingState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { endOfDay, format, startOfDay } from 'date-fns';
import {
    DesignNib,
    InfoCircleSolid,
    PlusCircle,
    RefreshCircle,
    Sparks,
    StatsReport,
    Trash,
    WarningCircleSolid,
    WarningTriangleSolid,
} from 'iconoir-react';
import { startCase } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    ActionBarButton,
    ActionBarSearch,
    ActionBar as BaseActionBar,
} from '../../base/ActionBar/ActionBar';
import { DateRangeFilter, type SortDirection } from '../../base/ListView/types';
import PreviewTip, { PreviewTipProvider } from '../../base/Preview/PreviewTip';
import StatusHeaderDropdown from '../../base/StatusHeaderDropdown/StatusHeaderDropdown';
import ConfirmDeletionModal from '../../dialogs/base/ConfirmDeletionModal';
import EnrichmentRequestModal from '../../dialogs/enrichment/EnrichmentRequestModal';
import ReportGenerationModal from '../../dialogs/reports/ReportGenerationModal';
import OfflineIndicator from '../../feedback/OfflineIndicator';
import { NotePreviewContent } from './NotePreviewContent';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

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
    createdAt: DateRangeFilter;
    lastChanged: DateRangeFilter;
}

interface ContentSearch {
    value: string;
    onChange?: (value: string) => void;
    onSubmit?: (value?: string) => void;
}

interface NotesListProps {
    query: Query | null;
    filteredNotes?: NoteRetrieve[];
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
    noteActions = [],
    hideActionBar = false,
    references = null,
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
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const [page, setPage] = useState((search as any)?.notes_page || 1);
    const [sortField, setSortField] = useState(
        (search as any)?.notes_sort_field || 'timestamp',
    );
    const [sortDirection, setSortDirection] = useState<SortDirection>(
        (search as any)?.notes_sort_direction || 'desc',
    );
    const { notesApi, managementApi } = useApi();
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportSelectedNotes, setReportSelectedNotes] = useState<
        Array<{ id: string; title: string }>
    >([]);
    const [enrichmentModalOpen, setEnrichmentModalOpen] = useState(false);
    const [enrichmentNotesList, setEnrichmentNotesList] = useState<
        Array<{ id: string; title: string; entities: OptimizedEntryResponse[] }>
    >([]);
    const queryClient = useQueryClient();

    const retryNotesMutation = useMutation({
        mutationFn: async (noteId: string) => {
            await managementApi.managementActionsCreate({
                actionName: 'relinkNotes',
                requestBody: {
                    note_id: noteId,
                },
            });
        },
        meta: {
            suppressNotification: true,
        },
    });
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [pageSize, setPageSize] = useState((search as any)?.notes_pagesize || 10);
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        status: 'all',
        any_field: query?.any_field || '',
        author: query?.author__username || '',
        editor: query?.editor__username || '',
        createdAt: {
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
        lastChanged: {
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
    const selectedNoteIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    // Mapping of table columns to API field names
    const sortFieldMapping: Record<string, string> = {
        title: 'title',
        description: 'timestamp',
        author: 'author__username',
        editor: 'editor__username',
        createdAt: 'timestamp',
        lastChanged: 'edit_timestamp',
    };

    const getStatusIcon = (status?: NoteRetrieveStatusEnum) => {
        if (!status) return null;

        switch (status) {
            case 'healthy':
                return (
                    <svg
                        width='18'
                        height='18'
                        viewBox='0 0 24 24'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                        className='text-primary'
                    >
                        <path
                            d='M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        />
                    </svg>
                );
            case 'processing':
                return (
                    <InfoCircleSolid className='text-primary' width='18' height='18' />
                );
            case 'warning':
                return (
                    <WarningTriangleSolid
                        className='text-muted-foreground'
                        width='18'
                        height='18'
                    />
                );
            case 'invalid':
                return (
                    <WarningCircleSolid
                        className='text-destructive'
                        width='18'
                        height='18'
                    />
                );
            default:
                return null;
        }
    };

    const handleSortingChange = useCallback(
        (sorting: SortingState) => {
            if (sorting.length === 0) {
                setSortField('timestamp');
                setSortDirection('desc');
            } else {
                const sort = sorting[0];
                const apiField = sortFieldMapping[sort.id] || sort.id;
                setSortField(apiField);
                setSortDirection(sort.desc ? 'desc' : 'asc');
            }

            setPage(1);
            const newSearch: any = {
                ...(search as any),
                notes_page: 1,
            };
            if (sorting.length > 0) {
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
        [search, router, location.pathname, sortFieldMapping],
    );

    const handleColumnFilter = (column: string, value: string | DateRangeFilter) => {
        setColumnFilters((prev) => ({
            ...prev,
            [column]: value,
        }));

        if (onFilterChange) {
            onFilterChange(column, value);
        }
    };

    const filterableColumns: Record<string, (value: string | DateRangeFilter) => void> =
    {
        author: (value) => handleColumnFilter('author', value),
        editor: (value) => handleColumnFilter('editor', value),
        createdAt: (value) => handleColumnFilter('createdAt', value),
        lastChanged: (value) => handleColumnFilter('lastChanged', value),
    };

    const handleStatusChange = (status: string) => {
        setColumnFilters((prev) => ({
            ...prev,
            status,
        }));
    };

    const statusOptions = useMemo(
        () => ['all', 'healthy', 'processing', 'warning', 'invalid'],
        [],
    );

    useEffect(() => {
        setColumnFilters({
            any_field: query?.any_field || '',
            author: query?.author__username || '',
            editor: query?.editor__username || '',
            createdAt: {
                from:
                    query?.created_date_from && query?.created_date_to
                        ? query.created_date_from
                        : '',
                to:
                    query?.created_date_from && query?.created_date_to
                        ? query.created_date_to
                        : '',
            },
            lastChanged: {
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

    // Sync URL params to page state
    useEffect(() => {
        const pageFromParams = (search as any)?.notes_page || 1;
        if (pageFromParams !== page) {
            setPage(pageFromParams);
        }
    }, [(search as any)?.notes_page, page]);

    // Prepare query parameters
    const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
    const hasCompleteCreatedRange =
        Boolean(columnFilters.createdAt?.from) && Boolean(columnFilters.createdAt?.to);

    const queryParams = useMemo(() => {
        if (!query) return null;

        const params = {
            page,
            pageSize: pageSize,
            orderBy: orderBy,
            status:
                columnFilters.status === 'all'
                    ? hideFleetingNotes
                        ? 'finalized'
                        : null
                    : columnFilters.status,
            anyField: query.any_field,
            content: query.content,
            authorUsername: query.author__username,
            date: query.date,
            references: query.references,
            // Only apply timestamp filters when the range is complete.
            // This prevents "stuck" start dates when loading with only a `*_from` param.
            timestampGte: hasCompleteCreatedRange
                ? columnFilters.createdAt.from
                : undefined,
            timestampLte: hasCompleteCreatedRange
                ? columnFilters.createdAt.to
                : undefined,
            truncate: query.truncate,
        };

        Object.keys(params).forEach(
            (key) =>
                params[key as keyof typeof params] === undefined &&
                delete params[key as keyof typeof params],
        );

        return params;
    }, [
        page,
        pageSize,
        sortField,
        sortDirection,
        query,
        columnFilters.status,
        hideFleetingNotes,
        columnFilters.createdAt,
        hasCompleteCreatedRange,
        orderBy,
    ]);

    // Query for notes
    const {
        data: notesData,
        isPending,
        isPaused,
        error,
    } = useQuery({
        queryKey: queryKeys.notes.list({
            page,
            pageSize,
            sortField,
            sortDirection,
            query: queryParams as any,
            columnFilters,
        }),
        queryFn: () => notesApi.notesList(queryParams as any),
        enabled: query != null && queryParams != null,
        meta: {
            showErrorToast: false, // We handle alerts ourselves
            suppressNotification: true,
        },
    });

    // Handle query errors (v5: onError removed from useQuery, use useEffect instead)
    useEffect(() => {
        if (error) {
            setAlert({
                show: true,
                message: 'Failed to fetch notes. Please try again.',
                color: 'red',
            });
        }
    }, [error]);

    const notes = (notesData?.results as NoteRetrieve[]) || [];
    const totalPages = notesData?.totalPages || 1;
    const totalCount = notesData?.count || 0;
    const loading = isPending && !isPaused;

    // Update total count callback
    useEffect(() => {
        if (onTotalCountChange) {
            onTotalCountChange({ current: notes.length, total: totalCount });
        }
    }, [notes.length, totalCount, onTotalCountChange]);

    // Notes to display (same as fetched notes since filters were removed)
    const displayedNotes = notes;

    const handleRetrySelected = useCallback(async () => {
        if (selectedNoteIds.length === 0) return;

        const promises = selectedNoteIds.map((id) =>
            retryNotesMutation.mutateAsync(id),
        );

        await Promise.all(promises);

        toast.success(
            `Retrying ${selectedNoteIds.length} note${selectedNoteIds.length > 1 ? 's' : ''}...`,
        );
        setRowSelection({});
        queryClient.invalidateQueries({ queryKey: queryKeys.notes.lists() });
    }, [retryNotesMutation, queryClient, selectedNoteIds]);

    const handlePageChange = (newPage: number) => {
        const searchAny = search as any;
        const newSearch: any = { ...searchAny, notes_page: newPage };
        router.navigate({
            to: location.pathname as any,
            search: newSearch as any,
        });
    };

    // Handle pagination changes from DataTable
    const handlePaginationChange = useCallback(
        (pageIndex: number, newPageSize: number) => {
            const newPage = pageIndex + 1; // Convert 0-based to 1-based

            // Handle page size change
            if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
                setPage(1);
                const searchAny = search as any;
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
        [page, pageSize, search, router, location.pathname, handlePageChange],
    );

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (noteId: string) => notesApi.notesDelete({ noteId }),
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.notes.lists() }],
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
                setAlert({
                    show: true,
                    color: 'green',
                    message: `Successfully deleted ${successes} note${successes > 1 ? 's' : ''}`,
                });
            } else if (successes === 0) {
                setAlert({
                    show: true,
                    color: 'red',
                    message: `Failed to delete ${failures} note${failures > 1 ? 's' : ''}`,
                });
            } else {
                setAlert({
                    show: true,
                    color: 'amber',
                    message: `Deleted ${successes} note${successes > 1 ? 's' : ''}, ${failures} failed`,
                });
            }

            setRowSelection({});
        } catch (error) {
            setAlert({
                show: true,
                color: 'red',
                message: 'An unexpected error occurred while deleting notes',
            });
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
    }, [sortField, sortDirection]);

    const onTableSortingChange = useCallback(
        (updater: SortingState | ((prev: SortingState) => SortingState)) => {
            const nextSorting =
                typeof updater === 'function' ? updater(sorting) : updater;
            handleSortingChange(nextSorting);
        },
        [handleSortingChange, sorting],
    );

    // Filter out filtered notes
    const filteredData = useMemo(() => {
        return displayedNotes.filter((note) => {
            return !filteredNotes.some((n) => n.id === note.id);
        });
    }, [displayedNotes, filteredNotes]);

    const renderNotePreview = (note: NoteRetrieve) => {
        return <NotePreviewContent note={note} />;
    };

    // Memoize columns to prevent recreation on every render
    const columns = useMemo<ColumnDef<NoteRetrieve>[]>(
        () => [
            {
                id: 'select',
                size: 36,
                minSize: 36,
                maxSize: 36,
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
                accessorKey: 'title',
                id: 'title',
                header: () => (
                    <div className='flex items-center'>
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
                            triggerClassName='size-7'
                        />
                        <span>Title</span>
                    </div>
                ),
                cell: ({ row }) => (
                    <PreviewTip
                        content={renderNotePreview(row.original)}
                        side='top'
                        align='start'
                        sideOffset={32}
                        size='lg'
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
                            <div className='flex items-center gap-2 min-w-0'>
                                {row.original.fleeting ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className='inline-flex items-center align-middle flex-shrink-0'>
                                                <DesignNib
                                                    className='text-primary'
                                                    width='18'
                                                    height='18'
                                                />
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>Fleeting Note</TooltipContent>
                                    </Tooltip>
                                ) : (
                                    row.original.status && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className='inline-flex items-center align-middle flex-shrink-0'>
                                                    {getStatusIcon(row.original.status)}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {row.original.statusMessage ||
                                                    startCase(row.original.status)}
                                            </TooltipContent>
                                        </Tooltip>
                                    )
                                )}

                                <span className='truncate'>
                                    {truncateText(
                                        parseMarkdownInline(
                                            row.original.metadata?.title || '',
                                        ),
                                        64,
                                    )}
                                </span>
                            </div>
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
                        {row.original.metadata?.description
                            ? parseMarkdownInline(row.original.metadata?.description)
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
                accessorKey: 'createdAt',
                id: 'createdAt',
                header: ({ column }) => {
                    const filterValue = columnFilters.createdAt as DateRangeFilter;
                    return (
                        <div className='flex items-center gap-2'>
                            <DataTableColumnHeader column={column} label='Created At' />
                            {filterValue?.from && filterValue?.to && (
                                <span className='text-xs text-accent'>●</span>
                            )}
                        </div>
                    );
                },
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
                accessorKey: 'lastChanged',
                id: 'lastChanged',
                header: ({ column }) => {
                    const filterValue = columnFilters.lastChanged as DateRangeFilter;
                    return (
                        <div className='flex items-center gap-2'>
                            <DataTableColumnHeader column={column} label='Updated At' />
                            {filterValue?.from && filterValue?.to && (
                                <span className='text-xs text-accent'>●</span>
                            )}
                        </div>
                    );
                },
                cell: ({ row }) => (
                    <div className='w-36'>
                        {row.original.editTimestamp
                            ? format(
                                new Date(row.original.editTimestamp),
                                'dd/MM/yyyy, HH:mm',
                            )
                            : '-'}
                    </div>
                ),
            },
        ],
        [
            columnFilters,
            handleStatusChange,
            handleColumnFilter,
            getStatusIcon,
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

    return (
        <PreviewTipProvider delayDuration={800}>
            <div ref={containerRef} className='flex flex-col space-y-4'>
                <BaseActionBar
                    left={
                        <div className='flex items-center gap-2 flex-nowrap'>
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
                                    icon={<PlusCircle width={18} height={18} />}
                                    iconActive={true}
                                    onClick={onCreateNote}
                                    disabled={loading}
                                />
                            )}

                            {contentSearch && (
                                <ActionBarSearch
                                    placeholder='Search content...'
                                    value={contentSearch.value || ''}
                                    defaultExpanded={Boolean(contentSearch.value)}
                                    debounceMs={300}
                                    onDebouncedChange={(v) => {
                                        contentSearch.onChange?.(v);
                                        // Many parents execute the search on submit; provide the value so they don't rely on potentially-stale state.
                                        contentSearch.onSubmit?.(v);
                                    }}
                                    onSubmit={(v) => contentSearch.onSubmit?.(v)}
                                />
                            )}
                            <DateRangePicker
                                startDate={
                                    columnFilters.createdAt?.from
                                        ? new Date(columnFilters.createdAt.from)
                                        : null
                                }
                                endDate={
                                    columnFilters.createdAt?.to
                                        ? new Date(columnFilters.createdAt.to)
                                        : null
                                }
                                onChange={([start, end]) => {
                                    const normalizedStart = start
                                        ? startOfDay(start)
                                        : null;
                                    const normalizedEnd = start
                                        ? endOfDay(end ?? start)
                                        : null;
                                    handleColumnFilter('createdAt', {
                                        from: normalizedStart
                                            ? format(
                                                  normalizedStart,
                                                  "yyyy-MM-dd'T'HH:mm",
                                              )
                                            : '',
                                        to: normalizedEnd
                                            ? format(
                                                  normalizedEnd,
                                                  "yyyy-MM-dd'T'HH:mm",
                                              )
                                            : '',
                                    });
                                }}
                                className='h-10 min-w-[220px]'
                            />
                            <Select
                                value={columnFilters.status || 'all'}
                                onValueChange={handleStatusChange}
                            >
                                <SelectTrigger className='h-10 min-w-[160px]'>
                                    <SelectValue placeholder='Status' />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {startCase(status)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    }
                />

                {isPaused && (
                    <div className='mb-4'>
                        <OfflineIndicator />
                    </div>
                )}

                {loading ? (
                    <div className='flex min-h-[200px] items-center justify-center'>
                        Loading...
                    </div>
                ) : (
                    <DataTable
                        table={table}
                        onRowClick={(note) =>
                            router.navigate({ to: `/notes/${note.id}` as any })
                        }
                    />
                )}
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
                    <ActionBarItem
                        onClick={handleRetrySelected}
                        disabled={loading || selectedNoteIds.length === 0 || notes.length === 0}
                    >
                        <RefreshCircle width={18} height={18} />
                        Retry
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={() => {
                            if (selectedNoteIds.length === 0) return;
                            const selectedNoteObjects = notes
                                .filter((n) => n.id && selectedNoteIds.includes(String(n.id)))
                                .map((n) => ({
                                    id: n.id!,
                                    title: n.metadata?.title || n.title || 'Untitled',
                                }));
                            setReportSelectedNotes(selectedNoteObjects);
                            setReportModalOpen(true);
                        }}
                        disabled={loading || selectedNoteIds.length === 0 || notes.length === 0}
                    >
                        <StatsReport width={18} height={18} />
                        Report
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={() => {
                            if (selectedNoteIds.length === 0) return;
                            const selectedNoteObjects = notes
                                .filter((n) => n.id && selectedNoteIds.includes(String(n.id)))
                                .map((n) => ({
                                    id: n.id!,
                                    title: (n.metadata?.title ||
                                        n.title ||
                                        'Untitled') as string,
                                    entities: (n.entities || []) as OptimizedEntryResponse[],
                                }));
                            setEnrichmentNotesList(selectedNoteObjects);
                            setEnrichmentModalOpen(true);
                        }}
                        disabled={loading || selectedNoteIds.length === 0 || notes.length === 0}
                    >
                        <Sparks width={18} height={18} />
                        Enrich
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={() => {
                            if (selectedNoteIds.length > 0) {
                                setBulkDeleteModalOpen(true);
                            }
                        }}
                        disabled={loading || selectedNoteIds.length === 0 || notes.length === 0}
                        className='text-destructive'
                    >
                        <Trash width={18} height={18} />
                        Delete
                    </ActionBarItem>
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose className='px-2 text-sm'>Clear</ActionBarClose>
            </ActionBar>
            <ConfirmDeletionModal
                open={bulkDeleteModalOpen}
                onOpenChange={setBulkDeleteModalOpen}
                onConfirm={async () => {
                    if (selectedNoteIds.length > 0) {
                        await executeBulkDelete(selectedNoteIds);
                    }
                }}
                text={`Are you sure you want to delete ${selectedNoteIds.length} note${selectedNoteIds.length > 1 ? 's' : ''}? This action is irreversible.`}
            />
            <ReportGenerationModal
                open={reportModalOpen}
                onOpenChange={setReportModalOpen}
                selectedNotes={reportSelectedNotes}
            />
            <EnrichmentRequestModal
                open={enrichmentModalOpen}
                onOpenChange={setEnrichmentModalOpen}
                notesList={enrichmentNotesList}
            />
        </PreviewTipProvider>
    );
}
