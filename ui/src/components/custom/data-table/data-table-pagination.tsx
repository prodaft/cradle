import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DataTablePaginationProps<TData> extends React.ComponentProps<'div'> {
    table: Table<TData>;
    pageSizeOptions?: number[];
    /** When true, all pagination controls are non-interactive. */
    disabled?: boolean;
}

export function DataTablePagination<TData>({
    table,
    pageSizeOptions = [10, 20, 30, 40, 50],
    disabled = false,
    className,
    ...props
}: DataTablePaginationProps<TData>) {
    const selectedCount = table.getFilteredSelectedRowModel().rows.length;
    const { pageIndex, pageSize } = table.getState().pagination;
    // Only server-paginated tables that pass `rowCount` know their total.
    const totalRows = table.options.rowCount;
    let rangeLabel: string | null = null;
    if (totalRows !== undefined) {
        const firstRow = Math.min(pageIndex * pageSize + 1, totalRows);
        const lastRow = Math.min((pageIndex + 1) * pageSize, totalRows);
        rangeLabel = totalRows
            ? `${firstRow.toLocaleString()}–${lastRow.toLocaleString()} of ${totalRows.toLocaleString()}`
            : '0 of 0';
    }
    return (
        <div
            className={cn(
                'flex flex-wrap items-center justify-between gap-2 p-1',
                className,
            )}
            {...props}
        >
            <p className='text-sm text-muted-foreground tabular-nums'>
                {rangeLabel}
                {rangeLabel && selectedCount > 0 ? ' · ' : null}
                {selectedCount > 0
                    ? `${selectedCount} of ${table.getFilteredRowModel().rows.length} row(s) selected`
                    : null}
            </p>
            <div className='flex items-center gap-2'>
                <Select
                    value={`${pageSize}`}
                    onValueChange={(value) => {
                        if (value === null) return;
                        table.setPageSize(Number(value));
                    }}
                    disabled={disabled}
                >
                    <SelectTrigger size='sm' aria-label='Rows per page'>
                        <SelectValue placeholder={pageSize} />
                    </SelectTrigger>
                    <SelectContent side='top'>
                        {pageSizeOptions.map((size) => (
                            <SelectItem key={size} value={`${size}`}>
                                {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    aria-label='First page'
                    variant='outline'
                    size='icon-sm'
                    onClick={() => table.setPageIndex(0)}
                    disabled={disabled || !table.getCanPreviousPage()}
                >
                    <ChevronsLeft />
                </Button>
                <Button
                    aria-label='Previous page'
                    variant='outline'
                    size='icon-sm'
                    onClick={() => table.previousPage()}
                    disabled={disabled || !table.getCanPreviousPage()}
                >
                    <ChevronLeft />
                </Button>
                <span className='whitespace-nowrap text-sm text-muted-foreground tabular-nums'>
                    Page {(pageIndex + 1).toLocaleString()} of{' '}
                    {table.getPageCount().toLocaleString()}
                </span>
                <Button
                    aria-label='Next page'
                    variant='outline'
                    size='icon-sm'
                    onClick={() => table.nextPage()}
                    disabled={disabled || !table.getCanNextPage()}
                >
                    <ChevronRight />
                </Button>
                <Button
                    aria-label='Last page'
                    variant='outline'
                    size='icon-sm'
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={disabled || !table.getCanNextPage()}
                >
                    <ChevronsRight />
                </Button>
            </div>
        </div>
    );
}
