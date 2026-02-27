import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import ConfirmDeletionDialog from '@/components/dialogs/base/confirm-deletion-dialog';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/ui/action-bar';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { truncateText } from '@/utils/dashboard';
import { TableSkeleton } from '@/components/base/table-skeleton';
import { ActionBarSearch } from '@components/base/action-bar/action-bar';
import StatusHeaderDropdown from '@components/base/status-header-dropdown/status-header-dropdown';
import { ArrowsClockwiseIcon, TrashIcon } from '@phosphor-icons/react';
import type { components } from '@services/openapi/schema';
import { useRouter } from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    type SortingState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { capitalize } from 'lodash';
import {
    type ChangeEvent,
    type SyntheticEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { StatusIcon, type StatusType } from '../notes/status-icon';

type EnrichmentRequestList = components['schemas']['EnrichmentRequestList'];

const SORT_FIELD_MAPPING: Record<string, string> = {
    title: 'title',
    createdAt: 'created_at',
    user: 'user__username',
};

type EnrichmentRequest = EnrichmentRequestList;

interface ColumnFilter {
    status: string;
    user: string;
}

interface SearchFilters {
    title?: string;
}

interface EnrichmentRequestsListProps {
    enrichmentRequests: EnrichmentRequest[];
    loading: boolean;
    page: number;
    totalPages: number;
    handlePageChange: (page: number) => void;
    setAlert?: (alert: any) => void;
    onRequestDelete?: () => void;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (field: string, direction: 'asc' | 'desc') => void;
    pageSize?: number;
    setPageSize?: (size: number) => void;
    onColumnFilterChange?: ((column: keyof ColumnFilter, value: string) => void) | null;
    columnFilters?: ColumnFilter;
    searchFilters?: SearchFilters;
    onSearchChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    onSearchSubmit?: (e: SyntheticEvent) => void;
    selectedRequests?: string[];
    setSelectedRequests?: (ids: string[]) => void;
    onDeleteSelected?: (ids: string[]) => void;
    onRerunSelected?: () => void;
    onCreateRequest?: () => void;
}

function EnrichmentRequestsList({
    enrichmentRequests,
    loading,
    page,
    totalPages,
    handlePageChange,
    sortField = 'created_at',
    sortDirection = 'desc',
    onSort,
    pageSize = 20,
    setPageSize = () => {},
    onColumnFilterChange = null,
    columnFilters = { status: 'all', user: '' },
    searchFilters = {},
    onSearchChange = () => {},
    onSearchSubmit = () => {},
    selectedRequests = [],
    setSelectedRequests = () => {},
    onDeleteSelected,
    onRerunSelected = () => {},
    onCreateRequest: _onCreateRequest = () => {},
}: EnrichmentRequestsListProps) {
    const router = useRouter();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteRequestIds, setDeleteRequestIds] = useState<string[]>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const selectedRequestIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const clearSelection = useCallback(() => {
        setRowSelection({});
        setSelectedRequests?.([]);
    }, [setSelectedRequests]);

    useEffect(() => {
        if (!selectedRequests || selectedRequests.length === 0) {
            setRowSelection({});
            return;
        }
        const selection: RowSelectionState = {};
        selectedRequests.forEach((id) => {
            selection[String(id)] = true;
        });
        setRowSelection(selection);
    }, [selectedRequests]);

    const handleStatusChange = useCallback(
        (status: string) => onColumnFilterChange?.('status', status),
        [onColumnFilterChange],
    );

    // Handle pagination changes from DataTable
    const handlePaginationChange = useCallback(
        (pageIndex: number, newPageSize: number) => {
            const newPage = pageIndex + 1; // Convert 0-based to 1-based

            // Handle page size change
            if (newPageSize !== (pageSize || 20)) {
                if (setPageSize) {
                    setPageSize(newPageSize);
                }
                handlePageChange(1);
            }
            // Handle page change
            else if (newPage !== page) {
                handlePageChange(newPage);
            }
        },
        [handlePageChange, page, pageSize, setPageSize],
    );

    // Convert sortField and sortDirection to TanStack Table sorting state
    const sorting = useMemo<SortingState>(() => {
        const columnId =
            Object.keys(SORT_FIELD_MAPPING).find(
                (key) => SORT_FIELD_MAPPING[key] === sortField,
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

    const handleSortingChange = useCallback(
        (newSorting: SortingState) => {
            if (onSort) {
                if (newSorting.length === 0) {
                    onSort('created_at', 'desc');
                } else {
                    const sort = newSorting[0];
                    const apiField = SORT_FIELD_MAPPING[sort.id] || sort.id;
                    onSort(apiField, sort.desc ? 'desc' : 'asc');
                }
            }
        },
        [onSort],
    );

    const onTableSortingChange = useCallback(
        (updater: SortingState | ((prev: SortingState) => SortingState)) => {
            const nextSorting =
                typeof updater === 'function' ? updater(sorting) : updater;
            handleSortingChange(nextSorting);
        },
        [handleSortingChange, sorting],
    );

    const errorMsg = useCallback((request: EnrichmentRequest) => {
        const msgs: string[] = [];
        if (request.ignored_count && request.ignored_count > 0) {
            msgs.push(
                `Ignored ${request.ignored_count} artifact${request.ignored_count > 1 ? 's' : ''}`,
            );
        }
        const warn_count =
            request.enrichers?.filter((enricher) => enricher.status === 'warning')
                .length || 0;
        if (warn_count > 0) {
            msgs.push(`Warnings in ${warn_count} enricher${warn_count > 1 ? 's' : ''}`);
        }
        const error_count =
            request.enrichers?.filter((enricher) => enricher.status === 'error')
                .length || 0;
        if (error_count > 0) {
            msgs.push(`Errors in ${error_count} enricher${error_count > 1 ? 's' : ''}`);
        }

        return msgs.join(', ');
    }, []);

    const getStatusIcon = useCallback((status?: string, errorMessage?: string) => {
        if (!status) return null;

        const tooltipContent = errorMessage || capitalize(status);
        const tooltipClassName =
            (status === 'error' || status === 'waiting') && errorMessage
                ? status === 'error'
                    ? '[--tooltip-bg:var(--destructive)] [--tooltip-fg:var(--destructive-foreground)] whitespace-pre-line'
                    : '[--tooltip-bg:var(--chart-4)] [--tooltip-fg:var(--foreground)] whitespace-pre-line'
                : undefined;

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className='inline-flex items-center align-middle flex-shrink-0'>
                        <StatusIcon status={status as StatusType} />
                    </span>
                </TooltipTrigger>
                <TooltipContent className={tooltipClassName}>
                    {tooltipContent}
                </TooltipContent>
            </Tooltip>
        );
    }, []);

    // Memoize columns to prevent recreation on every render
    const columns = useMemo<ColumnDef<EnrichmentRequest>[]>(
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
                accessorKey: 'title',
                id: 'title',
                header: 'Title',
                cell: ({ row }) => (
                    <div
                        className='truncate max-w-xs cursor-pointer'
                        title={row.original.title}
                        onClick={(event) => {
                            event.stopPropagation();
                            if (row.original.id) {
                                router.navigate({
                                    to: '/enrichment/$id',
                                    params: { id: row.original.id.toString() },
                                });
                            }
                        }}
                    >
                        <div className='flex items-center gap-2 min-w-0'>
                            <span className='inline-flex items-center flex-shrink-0'>
                                {getStatusIcon(
                                    row.original.status,
                                    errorMsg(row.original),
                                )}
                            </span>
                            <span className='truncate'>
                                {truncateText(row.original.title, 50)}
                            </span>
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: 'user',
                id: 'user',
                header: ({ column }) => {
                    const filterValue = columnFilters.user;
                    return (
                        <div className='flex items-center gap-2'>
                            <DataTableColumnHeader column={column} label='User' />
                            {filterValue && (
                                <span className='text-xs text-accent'>●</span>
                            )}
                        </div>
                    );
                },
                cell: ({ row }) => (
                    <div className='w-32'>
                        {row.original.user_detail?.username || 'N/A'}
                    </div>
                ),
            },
            {
                accessorKey: 'createdAt',
                id: 'createdAt',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Created At' />
                ),
                cell: ({ row }) => (
                    <div className='w-40'>
                        {row.original.created_at
                            ? format(
                                  new Date(row.original.created_at),
                                  'dd/MM/yyyy, HH:mm',
                              )
                            : 'N/A'}
                    </div>
                ),
            },
        ],
        [columnFilters.user, getStatusIcon, errorMsg, router],
    );
    const table = useReactTable({
        data: enrichmentRequests,
        columns,
        state: {
            sorting,
            rowSelection,
            pagination: {
                pageIndex: page - 1,
                pageSize: pageSize || 20,
            },
        },
        getRowId: (row, index) => String(row.id ?? index),
        onSortingChange: onTableSortingChange,
        onRowSelectionChange: (updater) => {
            setRowSelection((prev) => {
                const next = typeof updater === 'function' ? updater(prev) : updater;
                const selectedIds = Object.keys(next).filter((key) => next[key]);
                setSelectedRequests?.(selectedIds);
                return next;
            });
        },
        onPaginationChange: (updater) => {
            const currentPagination = {
                pageIndex: page - 1,
                pageSize: pageSize || 20,
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
        <div className='flex flex-col space-y-4'>
            {/* Table */}
            {loading ? (
                <TableSkeleton />
            ) : (
                <DataTable table={table} showViewOptions>
                    <div className='flex items-center gap-2'>
                        <ActionBarSearch
                            placeholder='Search requests...'
                            initialValue={searchFilters?.title || ''}
                            debounceMs={300}
                            onDebouncedChange={(value) => {
                                const event = {
                                    preventDefault: () => {},
                                    target: { name: 'title', value },
                                } as ChangeEvent<HTMLInputElement>;
                                onSearchChange(event);
                                // Some parents only fetch on submit; trigger submit on debounce too.
                                onSearchSubmit(event as any);
                            }}
                            onSubmit={(value) => {
                                const event = {
                                    preventDefault: () => {},
                                    target: { name: 'title', value },
                                } as any;
                                onSearchSubmit(event);
                            }}
                        />
                        <StatusHeaderDropdown
                            onStatusChange={handleStatusChange}
                            status={columnFilters.status}
                            statusOptions={['all', 'done', 'waiting', 'error', 'info']}
                        />
                    </div>
                </DataTable>
            )}
            <ActionBar
                open={selectedRequestIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {selectedRequestIds.length} request
                    {selectedRequestIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={() => {
                            if (selectedRequestIds.length === 0) return;
                            setDeleteRequestIds(selectedRequestIds);
                            setDeleteDialogOpen(true);
                        }}
                        disabled={
                            loading ||
                            enrichmentRequests.length === 0 ||
                            selectedRequestIds.length === 0
                        }
                        className='text-destructive'
                    >
                        <TrashIcon size={18} weight='bold' />
                        Delete
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={onRerunSelected}
                        disabled={
                            loading ||
                            enrichmentRequests.length === 0 ||
                            selectedRequestIds.length === 0
                        }
                    >
                        <ArrowsClockwiseIcon size={18} weight='bold' />
                        Rerun
                    </ActionBarItem>
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose className='px-2 text-sm'>Clear</ActionBarClose>
            </ActionBar>
            <ConfirmDeletionDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                    setDeleteDialogOpen(open);
                    if (!open) {
                        setDeleteRequestIds([]);
                    }
                }}
                onConfirm={() => {
                    if (deleteRequestIds.length > 0) {
                        onDeleteSelected?.(deleteRequestIds);
                    }
                    setDeleteRequestIds([]);
                }}
                text={`Are you sure you want to delete ${deleteRequestIds.length} request${deleteRequestIds.length > 1 ? 's' : ''}? This action is irreversible.`}
            />
        </div>
    );
}

export default EnrichmentRequestsList;
