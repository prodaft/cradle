import { ActionBarSearch } from '@/components/base/action-bar-controls/action-bar-controls';
import StatusHeaderDropdown from '@/components/base/status-header-dropdown/status-header-dropdown';
import { StatusIcon, type StatusType } from '@/components/base/status-icon/status-icon';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/custom/action-bar';
import { DataTable } from '@/components/custom/data-table/data-table';
import { DataTableColumnHeader } from '@/components/custom/data-table/data-table-column-header';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { truncateText } from '@/utils/dashboard';
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
import { useCallback, useMemo, useState } from 'react';
import { FILTER_OPTIONS } from './enrichment-list-status';

type EnrichmentRow = components['schemas']['EnrichmentRequestList'];

const SORT_FIELD_MAPPING: Record<string, string> = {
    title: 'title',
    created_at: 'created_at',
    user: 'user__username',
};

interface Filters {
    status: string;
    user: string;
}

interface EnrichmentTableProps {
    rows: EnrichmentRow[];
    isLoading: boolean;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (field: string, direction: 'asc' | 'desc') => void;
    pageSize?: number;
    onPageSizeChange?: (size: number) => void;
    onColumnFilterChange?: ((column: keyof Filters, value: string) => void) | null;
    filters?: Filters;
    initialSearch?: string;
    onSearchSubmit?: (value: string) => void;
    onDelete?: (ids: string[]) => Promise<boolean> | void;
    onRerun?: (ids: string[]) => Promise<boolean> | void;
}

export default function EnrichmentTable({
    rows,
    isLoading,
    page,
    totalPages,
    onPageChange,
    sortField = 'created_at',
    sortDirection = 'desc',
    onSort,
    pageSize = 20,
    onPageSizeChange = () => {},
    onColumnFilterChange = null,
    filters = { status: 'all', user: '' },
    initialSearch = '',
    onSearchSubmit = () => {},
    onDelete,
    onRerun = () => {},
}: EnrichmentTableProps) {
    const router = useRouter();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const checkedIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

    const paginate = useCallback(
        (pageIndex: number, size: number) => {
            const target = pageIndex + 1;

            if (size !== (pageSize || 20)) {
                onPageSizeChange(size);
            } else if (target !== page) {
                onPageChange(target);
            }
        },
        [onPageChange, page, pageSize, onPageSizeChange],
    );

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

    const applySort = useCallback(
        (next: SortingState) => {
            if (!onSort) return;

            if (next.length === 0) {
                onSort('created_at', 'desc');
                return;
            }

            const entry = next[0];
            if (!entry) {
                onSort('created_at', 'desc');
                return;
            }

            const apiField = SORT_FIELD_MAPPING[entry.id] || entry.id;
            onSort(apiField, entry.desc ? 'desc' : 'asc');
        },
        [onSort],
    );

    const applySorting = useCallback(
        (updater: SortingState | ((prev: SortingState) => SortingState)) => {
            const next = typeof updater === 'function' ? updater(sorting) : updater;
            applySort(next);
        },
        [applySort, sorting],
    );

    const statusDetail = useCallback((item: EnrichmentRow) => {
        const msgs: string[] = [];
        if (item.ignored_count && item.ignored_count > 0) {
            msgs.push(
                `Ignored ${item.ignored_count} artifact${item.ignored_count > 1 ? 's' : ''}`,
            );
        }
        const warnCount =
            item.enrichers?.filter((enricher) => enricher.status === 'warning')
                .length || 0;
        if (warnCount > 0) {
            msgs.push(`Warnings in ${warnCount} enricher${warnCount > 1 ? 's' : ''}`);
        }
        const errorCount =
            item.enrichers?.filter((enricher) => enricher.status === 'error').length ||
            0;
        if (errorCount > 0) {
            msgs.push(`Errors in ${errorCount} enricher${errorCount > 1 ? 's' : ''}`);
        }

        return msgs.join(', ');
    }, []);

    const statusIcon = useCallback((status?: string, detail?: string) => {
        if (!status) return null;

        const tooltipContent = detail || capitalize(status);
        const tooltipClassName =
            (status === 'error' || status === 'waiting') && detail
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

    const columns = useMemo<ColumnDef<EnrichmentRow>[]>(
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
                meta: { label: 'Title' },
                header: 'Title',
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div
                            className='truncate max-w-xs cursor-pointer'
                            title={item.title}
                            onClick={(event) => {
                                event.stopPropagation();
                                if (item.id) {
                                    router.navigate({
                                        to: '/enrichment/$id',
                                        params: { id: item.id.toString() },
                                    });
                                }
                            }}
                        >
                            <div className='flex items-center gap-2 min-w-0'>
                                <span className='inline-flex items-center flex-shrink-0'>
                                    {statusIcon(item.status, statusDetail(item))}
                                </span>
                                <span className='truncate'>
                                    {truncateText(item.title, 50)}
                                </span>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'user',
                id: 'user',
                meta: { label: 'User' },
                header: ({ column }) => (
                    <div className='flex items-center gap-2'>
                        <DataTableColumnHeader column={column} label='User' />
                        {filters.user && <span className='text-xs text-accent'>●</span>}
                    </div>
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='w-32'>
                            {item.user_detail?.username || 'N/A'}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'created_at',
                id: 'created_at',
                meta: { label: 'Created At' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Created At' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='w-40'>
                            {item.created_at
                                ? format(new Date(item.created_at), 'dd/MM/yyyy, HH:mm')
                                : 'N/A'}
                        </div>
                    );
                },
            },
        ],
        [filters.user, statusIcon, statusDetail, router],
    );

    const confirmDelete = useCallback(() => {
        if (checkedIds.length === 0) return;
        setPendingDeleteIds(checkedIds);
        setIsDeleteOpen(true);
    }, [checkedIds]);

    const table = useReactTable({
        data: rows,
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
        onSortingChange: applySorting,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: (updater) => {
            const current = {
                pageIndex: page - 1,
                pageSize: pageSize || 20,
            };
            const next = typeof updater === 'function' ? updater(current) : updater;
            paginate(next.pageIndex, next.pageSize);
        },
        getCoreRowModel: getCoreRowModel(),
        enableRowSelection: true,
        manualPagination: true,
        manualSorting: true,
        pageCount: totalPages,
    });

    return (
        <div className='flex flex-col space-y-4'>
            <DataTable table={table} showViewOptions isLoading={isLoading}>
                <div className='flex items-center gap-2'>
                    <ActionBarSearch
                        placeholder='Search requests...'
                        initialValue={initialSearch}
                        debounceMs={300}
                        onDebouncedChange={onSearchSubmit}
                        onSubmit={onSearchSubmit}
                        onClear={() => onSearchSubmit('')}
                    />
                    <StatusHeaderDropdown
                        onStatusChange={(status) =>
                            onColumnFilterChange?.('status', status)
                        }
                        status={filters.status}
                        options={[...FILTER_OPTIONS]}
                    />
                </div>
            </DataTable>
            <ActionBar
                open={checkedIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {checkedIds.length} request
                    {checkedIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={confirmDelete}
                        disabled={
                            isLoading || rows.length === 0 || checkedIds.length === 0
                        }
                        className='text-destructive'
                    >
                        <TrashIcon size={18} weight='bold' />
                        Delete
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={async () => {
                            if (await onRerun(checkedIds)) clearSelection();
                        }}
                        disabled={
                            isLoading || rows.length === 0 || checkedIds.length === 0
                        }
                    >
                        <ArrowsClockwiseIcon size={18} weight='bold' />
                        Rerun
                    </ActionBarItem>
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose className='px-2 text-sm'>Clear</ActionBarClose>
            </ActionBar>
            <AlertDialog
                open={isDeleteOpen}
                onOpenChange={(open) => {
                    setIsDeleteOpen(open);
                    if (!open) setPendingDeleteIds([]);
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {pendingDeleteIds.length}{' '}
                            request
                            {pendingDeleteIds.length > 1 ? 's' : ''}? This action is
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
                                const target = pendingDeleteIds;
                                setPendingDeleteIds([]);
                                if (target.length > 0 && (await onDelete?.(target))) {
                                    clearSelection();
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
