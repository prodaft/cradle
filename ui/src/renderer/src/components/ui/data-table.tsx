'use client';

import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    Updater,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import * as React from 'react';

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface BulkAction {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'default' | 'destructive';
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    loading?: boolean;
    emptyMessage?: string;
    enableRowSelection?: boolean;
    selectedRows?: string[];
    onRowSelectionChange?: (selectedRows: string[]) => void;
    sorting?: SortingState;
    onSortingChange?: (sorting: SortingState) => void;
    columnFilters?: ColumnFiltersState;
    onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
    columnVisibility?: VisibilityState;
    onColumnVisibilityChange?: (visibility: VisibilityState) => void;
    manualPagination?: boolean;
    manualSorting?: boolean;
    manualFiltering?: boolean;
    pageCount?: number;
    initialPageIndex?: number;
    initialPageSize?: number;
    onPaginationChange?: (pageIndex: number, pageSize: number) => void;
    onRowClick?: (row: TData) => void;
    bulkActions?: BulkAction[];
    itemLabel?: string;
    showPagination?: boolean;
    pageSizeOptions?: number[];
}

export function DataTable<TData, TValue>({
    columns,
    data,
    loading = false,
    emptyMessage = 'No results.',
    enableRowSelection = false,
    selectedRows = [],
    onRowSelectionChange,
    sorting,
    onSortingChange,
    columnFilters,
    onColumnFiltersChange,
    columnVisibility,
    onColumnVisibilityChange,
    manualPagination = false,
    manualSorting = false,
    manualFiltering = false,
    pageCount,
    initialPageIndex,
    initialPageSize,
    onPaginationChange,
    onRowClick,
    bulkActions = [],
    itemLabel = 'item',
    showPagination = false,
    pageSizeOptions,
}: DataTableProps<TData, TValue>) {
    const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
    const [internalColumnFilters, setInternalColumnFilters] =
        React.useState<ColumnFiltersState>([]);
    const [internalColumnVisibility, setInternalColumnVisibility] =
        React.useState<VisibilityState>({});

    // Use controlled pagination if props are provided, otherwise use internal state
    const isPaginationControlled =
        initialPageIndex !== undefined || initialPageSize !== undefined;
    const [internalPagination, setInternalPagination] = React.useState({
        pageIndex: initialPageIndex ?? 0,
        pageSize: initialPageSize ?? 10,
    });

    const effectivePagination = isPaginationControlled
        ? {
              pageIndex: initialPageIndex ?? 0,
              pageSize: initialPageSize ?? 10,
          }
        : internalPagination;

    const effectiveSorting = sorting ?? internalSorting;
    const effectiveColumnFilters = columnFilters ?? internalColumnFilters;
    const effectiveColumnVisibility = columnVisibility ?? internalColumnVisibility;

    // Helper to get row ID (matches getRowId logic)
    const getRowIdValue = React.useCallback((row: TData, index: number): string => {
        const id = (row as any).id;
        return id ? String(id) : String(index);
    }, []);

    // Convert selectedRows array to rowSelection object
    // TanStack Table uses row IDs (from getRowId) as keys, not indices
    const rowSelection = React.useMemo(() => {
        if (!enableRowSelection || selectedRows.length === 0) return {};
        const selection: Record<string, boolean> = {};
        data.forEach((row, index) => {
            const rowId = getRowIdValue(row, index);
            if (selectedRows.includes(rowId)) {
                selection[rowId] = true;
            }
        });
        return selection;
    }, [selectedRows, data, enableRowSelection, getRowIdValue]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
        getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
        getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
        onSortingChange: (updater: Updater<SortingState>) => {
            const newSorting =
                typeof updater === 'function' ? updater(effectiveSorting) : updater;
            if (onSortingChange) {
                onSortingChange(newSorting);
            } else {
                setInternalSorting(newSorting);
            }
        },
        onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => {
            const newFilters =
                typeof updater === 'function'
                    ? updater(effectiveColumnFilters)
                    : updater;
            if (onColumnFiltersChange) {
                onColumnFiltersChange(newFilters);
            } else {
                setInternalColumnFilters(newFilters);
            }
        },
        onColumnVisibilityChange: (updater: Updater<VisibilityState>) => {
            const newVisibility =
                typeof updater === 'function'
                    ? updater(effectiveColumnVisibility)
                    : updater;
            if (onColumnVisibilityChange) {
                onColumnVisibilityChange(newVisibility);
            } else {
                setInternalColumnVisibility(newVisibility);
            }
        },
        onRowSelectionChange: (updater) => {
            const currentSelection = rowSelection;
            const newSelection =
                typeof updater === 'function' ? updater(currentSelection) : updater;
            if (onRowSelectionChange && enableRowSelection) {
                // Convert row selection object to array of IDs
                // TanStack Table uses row IDs (from getRowId) as keys in rowSelection
                const selectedIds: string[] = [];
                Object.keys(newSelection).forEach((rowId) => {
                    if (newSelection[rowId]) {
                        selectedIds.push(rowId);
                    }
                });
                onRowSelectionChange(selectedIds);
            }
        },
        enableRowSelection: enableRowSelection,
        getRowId: getRowIdValue,
        state: {
            sorting: effectiveSorting,
            columnFilters: effectiveColumnFilters,
            columnVisibility: effectiveColumnVisibility,
            rowSelection,
            pagination: effectivePagination,
        },
        onPaginationChange: (updater) => {
            const currentPagination = effectivePagination;
            const newPagination =
                typeof updater === 'function' ? updater(currentPagination) : updater;

            if (!isPaginationControlled) {
                setInternalPagination(newPagination);
            }

            if (onPaginationChange) {
                onPaginationChange(newPagination.pageIndex, newPagination.pageSize);
            }
        },
        manualPagination,
        manualSorting,
        manualFiltering,
        pageCount: manualPagination && pageCount !== undefined ? pageCount : undefined,
    });

    if (loading) {
        return (
            <div className='flex items-center justify-center min-h-[200px]'>
                <Spinner className='size-6' />
            </div>
        );
    }

    const selectedCount = selectedRows.length;
    const hasBulkActions = bulkActions.length > 0 && enableRowSelection;
    const showContextMenu = hasBulkActions && selectedCount > 0;

    const tableContent = (
        <>
            <ScrollArea className='w-full'>
                <ScrollBar orientation='horizontal' />
                <div className='rounded-md border'>
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column.columnDef
                                                              .header,
                                                          header.getContext(),
                                                      )}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && 'selected'}
                                        className={onRowClick ? 'cursor-pointer' : ''}
                                        onClick={
                                            onRowClick
                                                ? () => onRowClick(row.original)
                                                : undefined
                                        }
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className='h-24 text-center'
                                    >
                                        {emptyMessage}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </ScrollArea>
            {showPagination && (
                <div className='flex-shrink-0 -mt-3 py-2'>
                    <DataTablePagination
                        table={table}
                        pageSizeOptions={pageSizeOptions}
                    />
                </div>
            )}
        </>
    );

    if (!showContextMenu) {
        return tableContent;
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{tableContent}</ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuLabel>
                    {selectedCount} {itemLabel}
                    {selectedCount !== 1 ? 's' : ''} selected
                </ContextMenuLabel>
                <ContextMenuSeparator />
                {bulkActions.map((action) => (
                    <ContextMenuItem
                        key={action.id}
                        onClick={action.onClick}
                        disabled={action.disabled}
                        variant={action.variant}
                    >
                        {action.icon && <span className='mr-2'>{action.icon}</span>}
                        {action.label}
                    </ContextMenuItem>
                ))}
            </ContextMenuContent>
        </ContextMenu>
    );
}
