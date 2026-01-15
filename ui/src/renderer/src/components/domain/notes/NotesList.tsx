import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import type { OptimizedEntryResponse } from '@/services/cradle';
import { capitalizeString, truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { parseMarkdownInline } from '@/utils/parser';
import type { NoteRetrieve, NoteRetrieveStatusEnum } from '@services/cradle/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { ColumnDef, SortingState } from '@tanstack/react-table';
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    ActionBar,
    ActionBarButton,
    ActionBarSearch,
} from '../../base/ActionBar/ActionBar';
import { DateRangeFilter, type SortDirection } from '../../base/ListView/types';
import PreviewTip, { PreviewTipProvider } from '../../base/Preview/PreviewTip';
import StatusHeaderDropdown from '../../base/StatusHeaderDropdown/StatusHeaderDropdown';
import TableActionsButton from '../../base/TableActionsButton';
import OfflineIndicator from '../../feedback/OfflineIndicator';
import ConfirmDeletionModal from '../../modals/base/ConfirmDeletionModal';
import EnrichmentRequestModal from '../../modals/enrichment/EnrichmentRequestModal';
import ReportGenerationModal from '../../modals/reports/ReportGenerationModal';
import { NotePreviewContent } from './NotePreviewContent';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface Query {
    content?: string;
    author__username?: string;
    editor__username?: string;
    date?: string;
    references?: string[];
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
    const search = useSearch({ from: '/_authenticated/notes' });
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
    const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
    const [pageSize, setPageSize] = useState((search as any)?.notes_pagesize || 10);
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        status: 'all',
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

    useEffect(() => {
        setColumnFilters({
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

    const handleRetrySelected = useCallback(
        async (selectedIds: string[]) => {
            if (selectedIds.length === 0) return;

            const promises = selectedIds.map((id) =>
                retryNotesMutation.mutateAsync(id),
            );

            await Promise.all(promises);

            toast.success(
                `Retrying ${selectedIds.length} note${selectedIds.length > 1 ? 's' : ''}...`,
            );
            setSelectedNotes([]);
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.lists() });
        },
        [retryNotesMutation, queryClient],
    );

    // Select all visible notes
    const handleSelectAll = () => {
        if (selectedNotes.length === displayedNotes.length) {
            setSelectedNotes([]);
        } else {
            setSelectedNotes(displayedNotes.map((n) => n.id!));
        }
    };

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

    const actions = [
        {
            value: 'delete',
            label: 'Delete',
            handler: async (selectedIds: string[]) => {
                setBulkDeleteModalOpen(true);
            },
        },
    ];

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

            setSelectedNotes([]);
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
                header: () => <span>Title</span>,
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
                                                    capitalizeString(
                                                        row.original.status,
                                                    )}
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
                            <DataTableColumnHeader column={column} title='Author' />
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
                            <DataTableColumnHeader column={column} title='Editor' />
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
                            <DataTableColumnHeader column={column} title='Created At' />
                            {filterValue?.from && filterValue?.to && (
                                <span className='text-xs text-accent'>●</span>
                            )}
                        </div>
                    );
                },
                cell: ({ row }) => (
                    <div className='w-36'>
                        {row.original.timestamp &&
                            formatDate(new Date(row.original.timestamp))}
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
                            <DataTableColumnHeader column={column} title='Updated At' />
                            {filterValue?.from && filterValue?.to && (
                                <span className='text-xs text-accent'>●</span>
                            )}
                        </div>
                    );
                },
                cell: ({ row }) => (
                    <div className='w-36'>
                        {row.original.editTimestamp
                            ? formatDate(new Date(row.original.editTimestamp))
                            : '-'}
                    </div>
                ),
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const note = row.original;
                    const handleDelete = () => {
                        actions[0].handler([note.id!]);
                    };

                    const handleRetry = () => {
                        handleRetrySelected([note.id!]);
                    };

                    const handleReport = () => {
                        const noteObject = {
                            id: note.id!,
                            title: note.metadata?.title || note.title || 'Untitled',
                        };
                        setReportSelectedNotes([noteObject]);
                        setReportModalOpen(true);
                    };

                    const handleEnrich = () => {
                        const noteObject = {
                            id: note.id!,
                            title: note.metadata?.title || note.title || 'Untitled',
                            entities: note.entities || [],
                        };
                        setEnrichmentNotesList([noteObject]);
                        setEnrichmentModalOpen(true);
                    };

                    return (
                        <div
                            className='w-12 text-right'
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className='flex justify-end'>
                                <TableActionsButton>
                                    <DropdownMenuItem onClick={handleRetry}>
                                        <RefreshCircle width='18' height='18' />
                                        Retry
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleReport}>
                                        <StatsReport width='18' height='18' />
                                        Generate Report
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleEnrich}>
                                        <Sparks width='18' height='18' />
                                        Enrich
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={handleDelete}
                                        variant='destructive'
                                    >
                                        <Trash width='18' height='18' />
                                        Delete
                                    </DropdownMenuItem>
                                </TableActionsButton>
                            </div>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [
            columnFilters,
            handleStatusChange,
            handleColumnFilter,
            getStatusIcon,
            actions,
            handleRetrySelected,
        ],
    );

    // Handle row selection
    const handleRowSelectionChange = useCallback((selectedIds: string[]) => {
        setSelectedNotes(selectedIds);
    }, []);

    return (
        <PreviewTipProvider delayDuration={800}>
            <div ref={containerRef} className='flex flex-col space-y-4'>
                <ActionBar
                    left={
                        <>
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
                        </>
                    }
                    right={
                        <>
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
                        </>
                    }
                />

                {isPaused && (
                    <div className='mb-4'>
                        <OfflineIndicator />
                    </div>
                )}

                <DataTable
                    columns={columns}
                    data={filteredData}
                    loading={loading}
                    emptyMessage='No notes found!'
                    enableRowSelection={true}
                    selectedRows={selectedNotes}
                    onRowSelectionChange={handleRowSelectionChange}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    manualPagination={true}
                    manualSorting={true}
                    pageCount={totalPages}
                    initialPageIndex={page - 1}
                    initialPageSize={pageSize}
                    onPaginationChange={handlePaginationChange}
                    showPagination={true}
                    onRowClick={(note) =>
                        router.navigate({ to: `/notes/${note.id}` as any })
                    }
                    bulkActions={[
                        {
                            id: 'delete',
                            label: 'Delete notes',
                            icon: <Trash width={18} height={18} />,
                            onClick: () => {
                                if (selectedNotes.length > 0)
                                    actions[0].handler(selectedNotes);
                            },
                            disabled:
                                loading ||
                                selectedNotes.length === 0 ||
                                notes.length === 0,
                            variant: 'destructive',
                        },
                        {
                            id: 'retry',
                            label: 'Retry notes',
                            icon: <RefreshCircle width={18} height={18} />,
                            onClick: () => handleRetrySelected(selectedNotes),
                            disabled:
                                loading ||
                                selectedNotes.length === 0 ||
                                notes.length === 0,
                        },
                        {
                            id: 'report',
                            label: 'Generate report',
                            icon: <StatsReport width={18} height={18} />,
                            onClick: () => {
                                if (selectedNotes.length === 0) return;
                                const selectedNoteObjects = notes
                                    .filter((n) => n.id && selectedNotes.includes(n.id))
                                    .map((n) => ({
                                        id: n.id!,
                                        title:
                                            n.metadata?.title || n.title || 'Untitled',
                                    }));
                                setReportSelectedNotes(selectedNoteObjects);
                                setReportModalOpen(true);
                            },
                            disabled:
                                loading ||
                                selectedNotes.length === 0 ||
                                notes.length === 0,
                        },
                        {
                            id: 'enrich',
                            label: 'Enrich notes',
                            icon: <Sparks width={18} height={18} />,
                            onClick: () => {
                                if (selectedNotes.length === 0) return;
                                const selectedNoteObjects = notes
                                    .filter((n) => n.id && selectedNotes.includes(n.id))
                                    .map((n) => ({
                                        id: n.id!,
                                        title: (n.metadata?.title ||
                                            n.title ||
                                            'Untitled') as string,
                                        entities: (n.entities ||
                                            []) as OptimizedEntryResponse[],
                                    }));
                                setEnrichmentNotesList(selectedNoteObjects);
                                setEnrichmentModalOpen(true);
                            },
                            disabled:
                                loading ||
                                selectedNotes.length === 0 ||
                                notes.length === 0,
                        },
                    ]}
                    itemLabel='note'
                />
            </div>
            <ConfirmDeletionModal
                open={bulkDeleteModalOpen}
                onOpenChange={setBulkDeleteModalOpen}
                onConfirm={async () => {
                    if (selectedNotes.length > 0) {
                        await executeBulkDelete(selectedNotes);
                    }
                }}
                text={`Are you sure you want to delete ${selectedNotes.length} note${selectedNotes.length > 1 ? 's' : ''}? This action is irreversible.`}
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
