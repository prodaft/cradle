import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DateRangeFilterButton } from '@/components/data-table/data-table-date-range-filter';
import ConfirmDeletionDialog from '@/components/dialogs/base/ConfirmDeletionDialog';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/ui/action-bar';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import type { Alert, StateSetter } from '@/types';
import { truncateText } from '@/utils/dashboard';
import { ActionBarSearch } from '@components/base/ActionBar/ActionBar';
import { DateRangeFilter } from '@components/base/ListView/types';
import StatusHeaderDropdown from '@components/base/StatusHeaderDropdown/StatusHeaderDropdown';
import { TrashIcon } from '@phosphor-icons/react';
import type { BaseDigest } from '@services/cradle/models';
import {
    type ColumnDef,
    type RowSelectionState,
    type SortingState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusIcon, type StatusType } from '../notes/StatusIcon';

interface DataTypeOption {
    value: string;
    label: string;
    inferEntities: boolean;
}

interface DigestListProps {
    digests: BaseDigest[];
    loading: boolean;
    page: number;
    totalPages: number;
    handlePageChange: (page: number) => void;
    setAlert: StateSetter<Alert>;
    onDigestDelete?: () => void;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    onSort: (field: string, direction: 'asc' | 'desc') => void;
    selectedDigests?: string[];
    setSelectedDigests?: StateSetter<string[]>;
    pageSize?: number;
    setPageSize?: (size: number) => void;
    onColumnFilterChange?:
        | ((column: string, value: string | DateRangeFilter) => void)
        | null;
    columnFilters?: Record<string, any>;
    searchFilters?: Record<string, string>;
    onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSearchSubmit?: (e: React.FormEvent | React.MouseEvent) => void;
    dataTypeOptions?: DataTypeOption[];
    onUpload?: () => void;
}

function DigestList({
    digests,
    loading,
    page,
    totalPages,
    handlePageChange,
    setAlert,
    onDigestDelete,
    sortField = 'created_at',
    sortDirection = 'desc',
    onSort,
    selectedDigests: externalSelectedDigests,
    setSelectedDigests: externalSetSelectedDigests,
    pageSize = 10,
    setPageSize = () => {},
    onColumnFilterChange = null,
    columnFilters = {},
    searchFilters = {},
    onSearchChange = () => {},
    onSearchSubmit = () => {},
    dataTypeOptions = [],
    onUpload,
}: DigestListProps) {
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleteDigestIds, setBulkDeleteDigestIds] = useState<string[]>([]);
    const { intelioApi } = useApi();
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const selectedDigestIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    useEffect(() => {
        if (!externalSelectedDigests) return;
        const selection: RowSelectionState = {};
        externalSelectedDigests.forEach((id) => {
            selection[String(id)] = true;
        });
        setRowSelection(selection);
    }, [externalSelectedDigests]);

    // Mapping of table columns to API field names
    const sortFieldMapping: Record<string, string> = {
        title: 'title',
        type: 'digest_type',
        createdAt: 'created_at',
        user: 'user__username',
    };

    const handleStatusChange = (status: string) => {
        if (onColumnFilterChange) {
            onColumnFilterChange('status', status);
        }
    };

    // Handle pagination changes from DataTable
    const handlePaginationChange = useCallback(
        (pageIndex: number, newPageSize: number) => {
            const newPage = pageIndex + 1; // Convert 0-based to 1-based

            // Handle page size change
            if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
                handlePageChange(1);
            }
            // Handle page change
            else if (newPage !== page) {
                handlePageChange(newPage);
            }
        },
        [page, pageSize],
    );

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

    const handleSortingChange = useCallback(
        (newSorting: SortingState) => {
            if (newSorting.length === 0) {
                onSort('created_at', 'desc');
            } else {
                const sort = newSorting[0];
                const apiField = sortFieldMapping[sort.id] || sort.id;
                onSort(apiField, sort.desc ? 'desc' : 'asc');
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

    // Define filterable columns with their handlers
    const filterableColumns: Record<string, (value: string | DateRangeFilter) => void> =
        onColumnFilterChange
            ? {
                  user: (value) => {
                      if (typeof value === 'string') {
                          onColumnFilterChange('user', value);
                      }
                  },
                  createdAt: (value) => {
                      if (typeof value !== 'string') {
                          onColumnFilterChange('createdAt', value);
                      }
                  },
              }
            : {};

    interface SelectProps {
        enableMultiSelect?: boolean;
        isSelected?: boolean;
        onSelect?: () => void;
    }

    const getStatusIcon = (status?: string, errorMessage?: string) => {
        if (!status) return null;

        const statusCapitalized = status.charAt(0).toUpperCase() + status.slice(1);
        const tooltipContent = errorMessage || statusCapitalized;
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

        if ((status === 'error' || status === 'waiting') && errorMessage) {
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
    };

    // Memoize columns to prevent recreation on every render
    const columns = useMemo<ColumnDef<BaseDigest>[]>(
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
                    <div className='truncate max-w-xs' title={row.original.title}>
                        <div className='flex items-center gap-2 min-w-0'>
                            <span className='inline-flex items-center flex-shrink-0'>
                                {getStatusIcon(
                                    row.original.status,
                                    (row.original as any).errorMessage,
                                )}
                            </span>
                            <span className='truncate'>{row.original.title}</span>
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: 'type',
                id: 'type',
                header: 'Type',
                cell: ({ row }) => (
                    <div className='truncate w-24' title={row.original.displayName}>
                        {truncateText(row.original.displayName || '', 24)}
                    </div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'user',
                id: 'user',
                header: ({ column }) => {
                    const filterValue = columnFilters.user as string;
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
                    <div
                        className='truncate w-32'
                        title={row.original.userDetail?.username}
                    >
                        {truncateText(row.original.userDetail?.username || '', 16)}
                    </div>
                ),
            },
            {
                accessorKey: 'warnings',
                id: 'warnings',
                header: 'Warnings',
                cell: ({ row }) => (
                    <div className='w-8'>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-foreground shadow-sm bg-[var(--chart-4)] dark:bg-[var(--chart-3)]'>
                                    {row.original.warnings?.length || 0}
                                </span>
                            </TooltipTrigger>
                            {row.original.warnings?.length > 0 && (
                                <TooltipContent
                                    side='bottom'
                                    className='[--tooltip-bg:var(--chart-4)] dark:[--tooltip-bg:var(--chart-3)] [--tooltip-fg:var(--foreground)] whitespace-pre-line'
                                >
                                    {row.original.warnings.slice(0, 10).join('\n') +
                                        (row.original.warnings.length > 10
                                            ? '...'
                                            : '')}
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'errors',
                id: 'errors',
                header: 'Errors',
                cell: ({ row }) => (
                    <div className='w-8'>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-destructive-foreground shadow-sm bg-destructive'>
                                    {row.original.errors?.length || 0}
                                </span>
                            </TooltipTrigger>
                            {row.original.errors?.length > 0 && (
                                <TooltipContent
                                    side='bottom'
                                    className='[--tooltip-bg:var(--destructive)] [--tooltip-fg:var(--destructive-foreground)] whitespace-pre-line'
                                >
                                    {row.original.errors.slice(0, 10).join('\n') +
                                        (row.original.errors.length > 10
                                            ? '\n...'
                                            : '')}
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'createdAt',
                id: 'createdAt',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Created At' />
                ),
                cell: ({ row }) => (
                    <div className='w-36'>
                        {row.original.createdAt
                            ? format(
                                  new Date(row.original.createdAt),
                                  'dd/MM/yyyy, HH:mm',
                              )
                            : 'N/A'}
                    </div>
                ),
            },
        ],
        [columnFilters, handleStatusChange, getStatusIcon],
    );
    const table = useReactTable({
        data: digests,
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
        onRowSelectionChange: (updater) => {
            setRowSelection((prev) => {
                const next = typeof updater === 'function' ? updater(prev) : updater;
                const selectedIds = Object.keys(next).filter((key) => next[key]);
                externalSetSelectedDigests?.(selectedIds);
                return next;
            });
        },
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

    const clearSelection = useCallback(() => {
        setRowSelection({});
        externalSetSelectedDigests?.([]);
    }, [externalSetSelectedDigests]);

    const handleDeleteSelected = async () => {
        if (selectedDigestIds.length > 0) {
            setBulkDeleteDigestIds(selectedDigestIds);
            setBulkDeleteDialogOpen(true);
        }
    };

    const executeBulkDelete = async (selectedIds: string[]) => {
        try {
            // Send all delete requests in parallel
            const deletePromises = selectedIds.map((id) =>
                intelioApi.intelioDigestDestroy({ id }),
            );
            const results = await Promise.allSettled(deletePromises);

            // Count successes and failures
            const successes = results.filter((r) => r.status === 'fulfilled').length;
            const failures = results.filter((r) => r.status === 'rejected').length;

            if (failures === 0) {
                setAlert({
                    show: true,
                    color: 'green',
                    message: `Successfully deleted ${successes} digest${successes > 1 ? 's' : ''}`,
                });
            } else if (successes === 0) {
                setAlert({
                    show: true,
                    color: 'red',
                    message: `Failed to delete ${failures} digest${failures > 1 ? 's' : ''}`,
                });
            } else {
                setAlert({
                    show: true,
                    color: 'amber',
                    message: `Deleted ${successes} digest${successes > 1 ? 's' : ''}, ${failures} failed`,
                });
            }

            // Refresh the digests list
            clearSelection();
            if (onDigestDelete) onDigestDelete();
        } catch (error) {
            setAlert({
                show: true,
                color: 'red',
                message: 'An unexpected error occurred while deleting digests',
            });
        }
    };

    return (
        <>
            {loading ? (
                <div className='flex min-h-[200px] items-center justify-center'>
                    <Spinner className='size-10' />
                </div>
            ) : (
                <DataTable table={table} showViewOptions>
                    <div className='flex items-center gap-2'>
                        <ActionBarSearch
                            placeholder='Search by title...'
                            initialValue={searchFilters.title || ''}
                            defaultExpanded={Boolean(searchFilters.title)}
                            debounceMs={300}
                            onDebouncedChange={(value) => {
                                const event = {
                                    preventDefault: () => {},
                                    target: { name: 'title', value },
                                } as React.ChangeEvent<HTMLInputElement>;
                                onSearchChange(event);
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
                            status={columnFilters.status || 'all'}
                            statusOptions={['all', 'done', 'working', 'error']}
                        />
                        {onColumnFilterChange && (
                            <DateRangeFilterButton
                                title='Created At'
                                value={
                                    (columnFilters.createdAt as DateRangeFilter) || {
                                        from: '',
                                        to: '',
                                    }
                                }
                                onChange={(v) => onColumnFilterChange('createdAt', v)}
                            />
                        )}
                    </div>
                </DataTable>
            )}
            <ActionBar
                open={selectedDigestIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {selectedDigestIds.length} digest
                    {selectedDigestIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={handleDeleteSelected}
                        disabled={
                            loading ||
                            digests.length === 0 ||
                            selectedDigestIds.length === 0
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
            <ConfirmDeletionDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={(open) => {
                    setBulkDeleteDialogOpen(open);
                    if (!open) {
                        setBulkDeleteDigestIds([]);
                    }
                }}
                text={`Are you sure you want to delete ${bulkDeleteDigestIds.length} digest${bulkDeleteDigestIds.length > 1 ? 's' : ''}?`}
                onConfirm={() => {
                    if (bulkDeleteDigestIds.length > 0) {
                        executeBulkDelete(bulkDeleteDigestIds);
                        setBulkDeleteDigestIds([]);
                    }
                }}
            />
        </>
    );
}

export default DigestList;
