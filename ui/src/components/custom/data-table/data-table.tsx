import { flexRender, type Table as TanstackTable } from '@tanstack/react-table';
import type * as React from 'react';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
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
    showViewOptions?: boolean;
    /** When true, show skeleton rows instead of data (keeps toolbar mounted to preserve input focus) */
    isLoading?: boolean;
}

export function DataTable<TData>({
    table,
    actionBar,
    onRowClick,
    getRowHref,
    showViewOptions = false,
    isLoading = false,
    children,
    className,
    ...props
}: DataTableProps<TData>) {
    const handleRowClick = (row: TData, event: React.MouseEvent) => {
        const href = getRowHref?.(row);
        if (href && (event.ctrlKey || event.metaKey)) {
            window.open(href, '_blank');
            return;
        }
        onRowClick?.(row);
    };
    return (
        <div className={cn('flex w-full flex-col gap-2.5', className)} {...props}>
            {(children || showViewOptions) && (
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
                    </div>
                </div>
            )}
            <div className='overflow-x-auto overflow-y-hidden rounded-md border'>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className='h-12'>
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
                                <TableRow key={rowIdx} className='h-12'>
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
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    className={cn(
                                        'h-12',
                                        onRowClick ? 'cursor-pointer' : undefined,
                                    )}
                                    onClick={
                                        onRowClick
                                            ? (e) => handleRowClick(row.original, e)
                                            : undefined
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            style={{
                                                ...getCommonPinningStyles({
                                                    column: cell.column,
                                                }),
                                            }}
                                        >
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
                                    colSpan={table.getAllColumns().length}
                                    className='h-24 text-center'
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className='flex flex-col gap-2.5'>
                <DataTablePagination table={table} />
                {actionBar &&
                    table.getFilteredSelectedRowModel().rows.length > 0 &&
                    actionBar}
            </div>
        </div>
    );
}
