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
import { DateRangeFilterButton } from '@/components/custom/data-table/data-table-date-range-filter';
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
import { DateRangeFilter } from '@/types/list-view';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import { truncateText } from '@/utils/dashboard';
import { TrashIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import {
    type ColumnDef,
    type RowSelectionState,
    type SortingState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FILTER_OPTIONS } from './digest-list-status';

type DigestRow = components['schemas']['BaseDigest'];

const SORT_FIELD_MAPPING: Record<string, string> = {
    title: 'title',
    type: 'digest_type',
    created_at: 'created_at',
    user: 'user__username',
};

interface DataTypeOption {
    value: string;
    label: string;
    inferEntities: boolean;
}

interface DigestsTableProps {
    rows: DigestRow[];
    isLoading: boolean;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onRefresh?: () => void;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    onSort: (field: string, direction: 'asc' | 'desc') => void;
    pageSize?: number;
    onPageSizeChange?: (size: number) => void;
    onColumnFilterChange?:
        ((column: string, value: string | DateRangeFilter) => void) | null;
    filters?: Record<string, any>;
    draft?: Record<string, string>;
    onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSearchSubmit?: (e: React.SyntheticEvent) => void;
    dataTypeOptions?: DataTypeOption[];
    onUpload?: () => void;
}

export default function DigestsTable({
    rows,
    isLoading,
    page,
    totalPages,
    onPageChange,
    onRefresh,
    sortField = 'created_at',
    sortDirection = 'desc',
    onSort,
    pageSize = 10,
    onPageSizeChange = () => {},
    onColumnFilterChange = null,
    filters = {},
    draft = {},
    onSearchChange = () => {},
    onSearchSubmit = () => {},
    dataTypeOptions: _dataTypeOptions = [],
    onUpload: _onUpload,
}: DigestsTableProps) {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const checkedIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const paginate = useCallback(
        (pageIndex: number, size: number) => {
            const target = pageIndex + 1;

            if (size !== pageSize) {
                onPageSizeChange(size);
            } else if (target !== page) {
                onPageChange(target);
            }
        },
        [page, pageSize, onPageChange, onPageSizeChange],
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
            if (next.length === 0) {
                onSort('created_at', 'desc');
            } else {
                const entry = next[0];
                if (!entry) {
                    onSort('created_at', 'desc');
                } else {
                    const apiField = SORT_FIELD_MAPPING[entry.id] || entry.id;
                    onSort(apiField, entry.desc ? 'desc' : 'asc');
                }
            }
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

    const statusIcon = useCallback((status?: string, detail?: string) => {
        if (!status) return null;

        const statusCapitalized = status.charAt(0).toUpperCase() + status.slice(1);
        const tooltipContent = detail || statusCapitalized;
        const tooltipColorClass =
            status === 'error'
                ? '[--tooltip-bg:var(--destructive)] [--tooltip-fg:var(--destructive-foreground)] whitespace-pre-line'
                : status === 'waiting'
                  ? '[--tooltip-bg:var(--chart-4)] dark:[--tooltip-bg:var(--chart-3)] [--tooltip-fg:var(--foreground)] whitespace-pre-line'
                  : '';

        const iconElement =
            status === 'waiting' ? (
                <StatusIcon
                    status={status as StatusType}
                    className='text-[var(--chart-4)] dark:text-[var(--chart-3)]'
                />
            ) : (
                <StatusIcon status={status as StatusType} />
            );

        if ((status === 'error' || status === 'waiting') && detail) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className='inline-flex items-center align-middle flex-shrink-0'>
                            {iconElement}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent className={tooltipColorClass}>
                        {tooltipContent}
                    </TooltipContent>
                </Tooltip>
            );
        }

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className='inline-flex items-center align-middle flex-shrink-0'>
                        {iconElement}
                    </span>
                </TooltipTrigger>
                <TooltipContent>{tooltipContent}</TooltipContent>
            </Tooltip>
        );
    }, []);

    const columns = useMemo<ColumnDef<DigestRow>[]>(
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
                        <div className='truncate max-w-xs' title={item.title}>
                            <div className='flex items-center gap-2 min-w-0'>
                                <span className='inline-flex items-center flex-shrink-0'>
                                    {statusIcon(
                                        item.status,
                                        (item as any).errorMessage,
                                    )}
                                </span>
                                <span className='truncate'>{item.title}</span>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'type',
                id: 'type',
                meta: { label: 'Type' },
                header: 'Type',
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='truncate w-24' title={item.display_name}>
                            {truncateText(item.display_name || '', 24)}
                        </div>
                    );
                },
                enableSorting: false,
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
                        <div
                            className='truncate w-32'
                            title={item.user_detail?.username}
                        >
                            {truncateText(item.user_detail?.username || '', 16)}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'warnings',
                id: 'warnings',
                meta: { label: 'Warnings' },
                header: 'Warnings',
                cell: ({ row }) => {
                    const item = row.original;
                    const warnings = (item.warnings as any[]) ?? [];
                    return (
                        <div className='w-8'>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-foreground shadow-sm bg-[var(--chart-4)] dark:bg-[var(--chart-3)]'>
                                        {warnings.length || 0}
                                    </span>
                                </TooltipTrigger>
                                {warnings.length > 0 && (
                                    <TooltipContent
                                        side='bottom'
                                        className='[--tooltip-bg:var(--chart-4)] dark:[--tooltip-bg:var(--chart-3)] [--tooltip-fg:var(--foreground)] whitespace-pre-line'
                                    >
                                        {warnings.slice(0, 10).join('\n') +
                                            (warnings.length > 10 ? '...' : '')}
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </div>
                    );
                },
                enableSorting: false,
            },
            {
                accessorKey: 'errors',
                id: 'errors',
                meta: { label: 'Errors' },
                header: 'Errors',
                cell: ({ row }) => {
                    const item = row.original;
                    const errors = (item.errors as any[]) ?? [];
                    return (
                        <div className='w-8'>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-destructive-foreground shadow-sm bg-destructive'>
                                        {errors.length || 0}
                                    </span>
                                </TooltipTrigger>
                                {errors.length > 0 && (
                                    <TooltipContent
                                        side='bottom'
                                        className='[--tooltip-bg:var(--destructive)] [--tooltip-fg:var(--destructive-foreground)] whitespace-pre-line'
                                    >
                                        {errors.slice(0, 10).join('\n') +
                                            (errors.length > 10 ? '\n...' : '')}
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </div>
                    );
                },
                enableSorting: false,
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
                        <div className='w-36'>
                            {item.created_at
                                ? format(new Date(item.created_at), 'dd/MM/yyyy, HH:mm')
                                : 'N/A'}
                        </div>
                    );
                },
            },
        ],
        [filters, statusIcon],
    );
    const table = useReactTable({
        data: rows,
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
        onSortingChange: applySorting,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: (updater) => {
            const current = {
                pageIndex: page - 1,
                pageSize,
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

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

    const titleEvent = useCallback(
        (value: string) =>
            ({
                preventDefault: () => {},
                target: { name: 'title', value },
            }) as React.ChangeEvent<HTMLInputElement>,
        [],
    );

    const confirmDelete = useCallback(() => {
        if (checkedIds.length === 0) return;
        setPendingDeleteIds(checkedIds);
        setIsDeleteOpen(true);
    }, [checkedIds]);

    const deleteDigests = async (digestIds: string[]) => {
        try {
            const results = await Promise.allSettled(
                digestIds.map(async (id) => {
                    const { error, response } = await fetchClient.DELETE(
                        '/intelio/digest/{id}/',
                        { params: { path: { id } } },
                    );
                    if (error) throw { response, error };
                }),
            );

            const successes = results.filter((r) => r.status === 'fulfilled').length;
            const failures = results.filter((r) => r.status === 'rejected').length;

            if (failures === 0) {
                toast.success(
                    `Successfully deleted ${successes} digest${successes > 1 ? 's' : ''}`,
                );
            } else if (successes === 0) {
                const firstRejected = results.find(
                    (r) => r.status === 'rejected',
                ) as PromiseRejectedResult;
                const parsed = await parseAPIError(firstRejected.reason);
                toast.error(getDisplayMessage(parsed));
            } else {
                toast.warning(
                    `Deleted ${successes} digest${successes > 1 ? 's' : ''}, ${failures} failed`,
                );
            }

            clearSelection();
            if (onRefresh) onRefresh();
        } catch (error) {
            const parsed = await parseAPIError(error);
            toast.error(getDisplayMessage(parsed));
        }
    };

    return (
        <>
            <DataTable table={table} showViewOptions isLoading={isLoading}>
                <div className='flex items-center gap-2'>
                    <ActionBarSearch
                        placeholder='Search by title...'
                        initialValue={draft.title || ''}
                        debounceMs={300}
                        onDebouncedChange={(value) => {
                            onSearchChange(titleEvent(value));
                        }}
                        onSubmit={(value) => {
                            onSearchSubmit(titleEvent(value));
                        }}
                        onClear={() => {
                            const ev = titleEvent('');
                            onSearchChange(ev);
                            onSearchSubmit(ev);
                        }}
                    />
                    <StatusHeaderDropdown
                        onStatusChange={(status) =>
                            onColumnFilterChange?.('status', status)
                        }
                        status={filters.status || 'all'}
                        options={[...FILTER_OPTIONS]}
                    />
                    {onColumnFilterChange && (
                        <DateRangeFilterButton
                            title='Created At'
                            value={
                                (filters.created_at as DateRangeFilter) || {
                                    from: '',
                                    to: '',
                                }
                            }
                            onChange={(v) => onColumnFilterChange('created_at', v)}
                        />
                    )}
                </div>
            </DataTable>
            <ActionBar
                open={checkedIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {checkedIds.length} digest
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
                            digest
                            {pendingDeleteIds.length > 1 ? 's' : ''}?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            size='sm'
                            onClick={() => {
                                if (pendingDeleteIds.length > 0) {
                                    deleteDigests(pendingDeleteIds);
                                    setPendingDeleteIds([]);
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
