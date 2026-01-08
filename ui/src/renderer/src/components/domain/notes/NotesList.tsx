import { useModal } from '@/contexts/ui/ModalContext';
import { toast } from 'sonner';
import useApi from '@/hooks/api/useApi';
import useAPICall from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { capitalizeString, truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { parseMarkdownInline } from '@/utils/parser';
import type { NoteRetrieve, NoteRetrieveStatusEnum } from '@services/cradle/models';
import { Button } from '@/components/ui/button';
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
import { useSearchParams } from 'react-router-dom';
import { ActionBar, ActionBarButton, ActionBarSearch } from '../../base/ActionBar/ActionBar';
import { DataTable, type BulkAction } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import PaginationWrapper from '../../base/Pagination/PaginationWrapper';
import PreviewTip, { PreviewTipProvider } from '../../base/Preview/PreviewTip';
import StatusHeaderDropdown from '../../base/StatusHeaderDropdown/StatusHeaderDropdown';
import TableActionsButton from '../../base/TableActionsButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import ConfirmDeletionModal from '../../modals/base/ConfirmDeletionModal';
import EnrichmentRequestModal from '../../modals/enrichment/EnrichmentRequestModal';
import ReportGenerationModal from '../../modals/reports/ReportGenerationModal';
import { NotePreviewContent } from './NotePreviewContent';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangeFilter } from '../../base/ListView/types';

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
    const [searchParams, setSearchParams] = useSearchParams();
    const [notes, setNotes] = useState<NoteRetrieve[]>([]);
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const [loading, setLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(Number(searchParams.get('notes_page')) || 1);
    const [sortField, setSortField] = useState(
        searchParams.get('notes_sort_field') || 'timestamp',
    );
    const [sortDirection, setSortDirection] = useState<SortDirection>(
        (searchParams.get('notes_sort_direction') as SortDirection) || 'desc',
    );
    const { navigate, navigateLink } = useCradleNavigate();
    const { setModal } = useModal();
    const { fleetingNotesApi, notesApi, managementApi } = useApi();
    const { execute } = useAPICall();
    const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('notes_pagesize')) || 10,
    );
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
    const [totalCount, setTotalCount] = useState(0);
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
                        className='text-green-500'
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
                    <InfoCircleSolid className='text-blue-500' width='18' height='18' />
                );
            case 'warning':
                return (
                    <WarningTriangleSolid
                        className='text-amber-500'
                        width='18'
                        height='18'
                    />
                );
            case 'invalid':
                return (
                    <WarningCircleSolid
                        className='text-red-500'
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
        const newParams = new URLSearchParams(searchParams);
        newParams.set('notes_page', '1');
            if (sorting.length > 0) {
                const sort = sorting[0];
                const apiField = sortFieldMapping[sort.id] || sort.id;
                newParams.set('notes_sort_field', apiField);
                newParams.set('notes_sort_direction', sort.desc ? 'desc' : 'asc');
            }
        setSearchParams(newParams, { replace: true });
        },
        [searchParams, setSearchParams],
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
        console.log('handleStatusChange', status);
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

    const handleRetrySelected = useCallback(
        async (selectedIds: string[]) => {
            if (selectedIds.length === 0) return;

            const promises = selectedIds.map((id) =>
                execute(() =>
                    managementApi.managementActionsCreate({
                        actionName: 'relinkNotes',
                        requestBody: {
                            note_id: id,
                        },
                    }),
                ),
            );

            await Promise.all(promises);

        toast.success(`Retrying ${selectedIds.length} note${selectedIds.length > 1 ? 's' : ''}...`);
        setSelectedNotes([]);
    }, [managementApi, execute]);

    // Notes to display (same as fetched notes since filters were removed)
    const displayedNotes = notes;

    // Notify parent of count changes
    useEffect(() => {
        if (onTotalCountChange) {
            onTotalCountChange({
                current: notes.length,
                total: totalCount,
            });
        }
    }, [notes.length, totalCount, onTotalCountChange]);

    // Select all visible notes
    const handleSelectAll = () => {
        if (selectedNotes.length === displayedNotes.length) {
            setSelectedNotes([]);
        } else {
            setSelectedNotes(displayedNotes.map((n) => n.id!));
        }
    };

    const fetchNotes = useCallback(async () => {
        if (query == null) return;
        setLoading(true);

        try {
            const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;

            const hasCompleteCreatedRange =
                Boolean(columnFilters.createdAt?.from) &&
                Boolean(columnFilters.createdAt?.to);

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
                (key) => params[key] === undefined && delete params[key],
            );

            const response = await notesApi.notesList(params as any);
            setNotes(response.results as NoteRetrieve[]);
            setTotalPages(response.totalPages || 1);
            setTotalCount(response.count || 0);
            setLoading(false);
        } catch (error) {
            setAlert({
                show: true,
                message: 'Failed to fetch notes. Please try again.',
                color: 'red',
            });
            setLoading(false);
        }
    }, [
        page,
        pageSize,
        sortField,
        sortDirection,
        query,
        notesApi,
        columnFilters.status,
    ]);

    // Sync URL params to page state
    useEffect(() => {
        const pageFromParams = Number(searchParams.get('notes_page')) || 1;
        if (pageFromParams !== page) {
            setPage(pageFromParams);
        }
    }, [searchParams.get('notes_page'), page]);

    // Fetch notes when dependencies change
    useEffect(() => {
        fetchNotes();
    }, [
        page,
        pageSize,
        sortField,
        sortDirection,
        query?.content,
        query?.author__username,
        query?.date,
        query?.references,
        query?.created_date_from,
        query?.created_date_to,
        query?.timestamp_gte,
        query?.timestamp_lte,
        query?.truncate,
        columnFilters.status,
    ]);

    const handlePageChange = (newPage: number) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('notes_page', String(newPage));
        setSearchParams(newParams);
    };

    const actions = [
        {
            value: 'delete',
            label: 'Delete',
            handler: async (selectedIds: string[]) => {
                setModal(ConfirmDeletionModal, {
                    onConfirm: async () => {
                        try {
                            const deletePromises = selectedIds.map((id) => {
                                const note = notes.find((n) => n.id === id);
                                if (note && note.fleeting) {
                                    return fleetingNotesApi.fleetingNotesDestroy({
                                        id,
                                    });
                                } else {
                                    return notesApi.notesDelete({ noteId: id });
                                }
                            });
                            const results = await Promise.allSettled(deletePromises);

                            const successes = results.filter(
                                (r) => r.status === 'fulfilled',
                            ).length;
                            const failures = results.filter(
                                (r) => r.status === 'rejected',
                            ).length;

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
                            fetchNotes();
                        } catch (error) {
                            setAlert({
                                show: true,
                                color: 'red',
                                message:
                                    'An unexpected error occurred while deleting notes',
                            });
                        }
                    },
                    text: `Are you sure you want to delete ${selectedIds.length} note${selectedIds.length > 1 ? 's' : ''}? This action is irreversible.`,
                });
            },
        },
    ];

    // Convert sortField and sortDirection to TanStack Table sorting state
    const sorting = useMemo<SortingState>(() => {
        const columnId = Object.keys(sortFieldMapping).find(
            (key) => sortFieldMapping[key] === sortField
        ) || sortField;
        
        return columnId ? [{
            id: columnId,
            desc: sortDirection === 'desc',
        }] : [];
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
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
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
                    <span>Title</span>
                ),
                cell: ({ row }) => (
            <PreviewTip
                        content={renderNotePreview(row.original)}
                side='top'
                align='start'
                sideOffset={32}
                size='lg'
                    >
                        <div className='truncate w-64 cursor-pointer' onClick={navigateLink(`/notes/${row.original.id}`)}>
                        <div className='flex items-center gap-2 min-w-0'>
                                {row.original.fleeting ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className='inline-flex items-center align-middle flex-shrink-0'>
                                            <DesignNib
                                                className='text-[#FF8C00]'
                                                width='18'
                                                height='18'
                                            />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Fleeting Note
                                    </TooltipContent>
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
                                                capitalizeString(row.original.status)}
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            )}

                            <span className='truncate'>
                                {truncateText(
                                        parseMarkdownInline(row.original.metadata?.title || ''),
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
                        <div className="flex items-center gap-2">
                            <DataTableColumnHeader column={column} title="Author" />
                            {filterValue && (
                                <span className='text-xs text-orange-600 dark:text-orange-400'>●</span>
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
                        <div className="flex items-center gap-2">
                            <DataTableColumnHeader column={column} title="Editor" />
                            {filterValue && (
                                <span className='text-xs text-orange-600 dark:text-orange-400'>●</span>
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
                        <div className="flex items-center gap-2">
                            <DataTableColumnHeader column={column} title="Created At" />
                            {(filterValue?.from && filterValue?.to) && (
                                <span className='text-xs text-orange-600 dark:text-orange-400'>●</span>
                            )}
                        </div>
                    );
                },
                cell: ({ row }) => (
                    <div className='w-36'>
                        {row.original.timestamp && formatDate(new Date(row.original.timestamp))}
                    </div>
                ),
            },
            {
                accessorKey: 'lastChanged',
                id: 'lastChanged',
                header: ({ column }) => {
                    const filterValue = columnFilters.lastChanged as DateRangeFilter;
                    return (
                        <div className="flex items-center gap-2">
                            <DataTableColumnHeader column={column} title="Updated At" />
                            {(filterValue?.from && filterValue?.to) && (
                                <span className='text-xs text-orange-600 dark:text-orange-400'>●</span>
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
            setModal(ReportGenerationModal, {
                selectedNotes: [noteObject],
            });
        };

        const handleEnrich = () => {
            const noteObject = {
                id: note.id!,
                title: note.metadata?.title || note.title || 'Untitled',
                entities: note.entities || [],
            };
            setModal(EnrichmentRequestModal, {
                notesList: [noteObject],
            });
        };

        return (
                        <div className='w-12 text-right' onClick={(e) => e.stopPropagation()}>
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
                <DropdownMenuItem onClick={handleDelete} variant="destructive">
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
        [columnFilters, handleStatusChange, handleColumnFilter, getStatusIcon, actions, handleRetrySelected, setModal],
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
                                statusOptions={['all', 'fleeting', 'healthy', 'warning', 'invalid', 'processing']}
                            />
                        </>
                    }
                />

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
                    onRowClick={(note) => navigate(`/notes/${note.id}`)}
                    bulkActions={[
                        {
                            id: 'delete',
                            label: 'Delete notes',
                            icon: <Trash width={18} height={18} />,
                            onClick: () => {
                                if (selectedNotes.length > 0) actions[0].handler(selectedNotes);
                            },
                            disabled: loading || selectedNotes.length === 0 || notes.length === 0,
                            variant: 'destructive',
                        },
                        {
                            id: 'retry',
                            label: 'Retry notes',
                            icon: <RefreshCircle width={18} height={18} />,
                            onClick: () => handleRetrySelected(selectedNotes),
                            disabled: loading || selectedNotes.length === 0 || notes.length === 0,
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
                                        title: n.metadata?.title || n.title || 'Untitled',
                                    }));
                                setModal(ReportGenerationModal, {
                                    selectedNotes: selectedNoteObjects,
                                });
                            },
                            disabled: loading || selectedNotes.length === 0 || notes.length === 0,
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
                                        title: n.metadata?.title || n.title || 'Untitled',
                                        entities: n.entities,
                                    }));
                                setModal(EnrichmentRequestModal, {
                                    notesList: selectedNoteObjects,
                                });
                            },
                            disabled: loading || selectedNotes.length === 0 || notes.length === 0,
                        },
                    ]}
                    itemLabel="note"
                />

                <PaginationWrapper
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    pageSize={pageSize}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setPage(1);
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('notes_page', '1');
                        newParams.set('notes_pagesize', String(newSize));
                        setSearchParams(newParams, { replace: true });
                    }}
                    disabled={notes.length === 0}
                    selectedCount={selectedNotes.length}
                    totalRows={totalCount}
                />
            </div>
        </PreviewTipProvider>
    );
}
