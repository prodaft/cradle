import {
    type Cell,
    flexRender,
    type Row,
    type Table as TanstackTable,
} from '@tanstack/react-table';
import * as React from 'react';

import { DataTablePagination } from '@/components/custom/data-table/data-table-pagination';
import { DataTableViewOptions } from '@/components/custom/data-table/data-table-view-options';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { getCommonPinningStyles } from '@/lib/data-table';
import { cn } from '@/lib/utils';

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
    table: TanstackTable<TData>;
    actionBar?: React.ReactNode;
    onRowClick?: (row: TData) => void;
    getRowHref?: (row: TData) => string;
    /**
     * When set, handles row clicks instead of onRowClick / getRowHref (use for expand, etc.).
     */
    onRowClickRow?: (
        row: Row<TData>,
        event: React.MouseEvent<HTMLTableRowElement>,
    ) => void;
    /** When using onRowClickRow, limit pointer/click to rows where this is true (default: all rows). */
    interactiveRow?: (row: Row<TData>) => boolean;
    showViewOptions?: boolean;
    /** Right side of the toolbar row (e.g. column visibility with align="end") */
    toolbarEnd?: React.ReactNode;
    /** When true, show skeleton rows instead of data (keeps toolbar mounted to preserve input focus) */
    isLoading?: boolean;
    /** When isLoading, show this instead of the built-in skeleton rows (toolbar stays mounted). */
    loadingPlaceholder?: React.ReactNode;
    /** When false, pagination is omitted (e.g. while loadingPlaceholder is shown). */
    showPagination?: boolean;
    /** When true, pagination controls are disabled (e.g. while unsaved edits exist). */
    paginationDisabled?: boolean;
    /** comfortable = fixed h-12 rows (default); compact = natural row height */
    density?: 'comfortable' | 'compact';
    /** Renders a full-width cell below the row when row.getIsExpanded() is true */
    renderSubRow?: (row: Row<TData>) => React.ReactNode;
    getRowClassName?: (row: Row<TData>) => string | undefined;
    getCellProps?: (
        cell: Cell<TData, unknown>,
    ) => React.TdHTMLAttributes<HTMLTableCellElement> | undefined;
    emptyMessage?: string;
}

export function DataTable<TData>({
    table,
    actionBar,
    onRowClick,
    getRowHref,
    onRowClickRow,
    interactiveRow,
    showViewOptions = false,
    toolbarEnd,
    isLoading = false,
    loadingPlaceholder,
    showPagination = true,
    paginationDisabled = false,
    density = 'comfortable',
    renderSubRow,
    getRowClassName,
    getCellProps,
    emptyMessage = 'No results.',
    children,
    className,
    ...props
}: DataTableProps<TData>) {
    const rowHeightClass = density === 'comfortable' ? 'h-12' : undefined;

    const handleRowClick = (row: TData, event: React.MouseEvent) => {
        const href = getRowHref?.(row);
        if (href && (event.ctrlKey || event.metaKey)) {
            window.open(href, '_blank');
            return;
        }
        onRowClick?.(row);
    };

    const tableSection =
        isLoading && loadingPlaceholder ? (
            loadingPlaceholder
        ) : (
            <div className='overflow-x-auto overflow-y-hidden rounded-md border'>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className={rowHeightClass}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        style={{
                                            ...getCommonPinningStyles({
                                                column: header.column,
                                            }),
                                        }}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef.header,
                                                  header.getContext(),
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 8 }).map((_, rowIdx) => (
                                <TableRow key={rowIdx} className={rowHeightClass}>
                                    {table.getAllColumns().map((col, colIdx) => {
                                        const widths = [
                                            'w-full max-w-48',
                                            'w-24',
                                            'w-20',
                                            'w-28',
                                        ];
                                        return (
                                            <TableCell key={col.id}>
                                                <Skeleton
                                                    className={cn(
                                                        'h-4',
                                                        widths[colIdx % widths.length],
                                                    )}
                                                />
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => {
                                const baseRowClick =
                                    onRowClickRow !== undefined
                                        ? (e: React.MouseEvent<HTMLTableRowElement>) =>
                                              onRowClickRow(row, e)
                                        : onRowClick !== undefined
                                          ? (
                                                e: React.MouseEvent<HTMLTableRowElement>,
                                            ) => handleRowClick(row.original, e)
                                          : undefined;
                                const rowInteractive =
                                    baseRowClick !== undefined
                                        ? interactiveRow !== undefined
                                            ? interactiveRow(row)
                                            : true
                                        : false;
                                const rowClick =
                                    baseRowClick && rowInteractive
                                        ? baseRowClick
                                        : undefined;
                                return (
                                    <React.Fragment key={row.id}>
                                        <TableRow
                                            data-state={
                                                row.getIsSelected() && 'selected'
                                            }
                                            className={cn(
                                                rowHeightClass,
                                                rowClick ? 'cursor-pointer' : undefined,
                                                getRowClassName?.(row),
                                            )}
                                            onClick={rowClick}
                                        >
                                            {row.getVisibleCells().map((cell) => {
                                                const extra = getCellProps?.(cell);
                                                return (
                                                    <TableCell
                                                        key={cell.id}
                                                        style={{
                                                            ...getCommonPinningStyles({
                                                                column: cell.column,
                                                            }),
                                                            ...extra?.style,
                                                        }}
                                                        className={extra?.className}
                                                        colSpan={extra?.colSpan}
                                                        rowSpan={extra?.rowSpan}
                                                        headers={extra?.headers}
                                                        onClick={extra?.onClick}
                                                    >
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext(),
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                        {renderSubRow && row.getIsExpanded() ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={
                                                        row.getVisibleCells().length
                                                    }
                                                    className='p-0 border-b-0'
                                                >
                                                    {renderSubRow(row)}
                                                </TableCell>
                                            </TableRow>
                                        ) : null}
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={table.getAllColumns().length}
                                    className='p-0'
                                >
                                    <Empty className='min-h-24 flex-none gap-2 border-0 rounded-none py-8'>
                                        <EmptyHeader className='max-w-none'>
                                            <EmptyDescription>
                                                {emptyMessage}
                                            </EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        );

    return (
        <div className={cn('flex w-full flex-col gap-2.5', className)} {...props}>
            {(children || showViewOptions || toolbarEnd) && (
                <div
                    role='toolbar'
                    aria-orientation='horizontal'
                    className='flex w-full min-w-0 shrink-0 items-start justify-between gap-2 py-1'
                >
                    <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
                        {children}
                    </div>
                    <div className='flex items-center gap-2'>
                        {showViewOptions && <DataTableViewOptions table={table} />}
                        {toolbarEnd}
                    </div>
                </div>
            )}
            {tableSection}
            <div className='flex flex-col gap-2.5'>
                {showPagination ? (
                    <DataTablePagination table={table} disabled={paginationDisabled} />
                ) : null}
                {actionBar &&
                    table.getFilteredSelectedRowModel().rows.length > 0 &&
                    actionBar}
            </div>
        </div>
    );
}
