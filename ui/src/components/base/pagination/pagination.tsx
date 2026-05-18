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
import React from 'react';

/**
 * Pagination component props for standalone (non-table) use
 */
interface PaginationProps extends React.ComponentProps<'div'> {
    /** Current active page */
    currentPage: number;
    /** Total number of pages */
    totalPages: number;
    /** Callback when page changes */
    onPageChange: (page: number) => void;
    /** Current page size (items per page) */
    pageSize?: number;
    /** Callback when page size changes */
    onPageSizeChange?: (pageSize: number) => void;
    /** Page size options */
    pageSizeOptions?: number[];
    /** Disabled state */
    disabled?: boolean;
    /** Number of selected rows */
    selectedCount?: number;
    /** Total number of rows */
    totalRows?: number;
    /** Use a tighter horizontal layout */
    compact?: boolean;
}

/**
 * Pagination component for standalone use (not with DataTable)
 * Use DataTablePagination for DataTable components
 *
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={page}
 *   totalPages={10}
 *   onPageChange={setPage}
 *   pageSize={20}
 *   onPageSizeChange={setPageSize}
 * />
 * ```
 */
export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    pageSize,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 30, 40, 50],
    disabled = false,
    className,
    selectedCount,
    totalRows,
    ...props
}: PaginationProps): React.ReactElement {
    const handlePageSizeChange = (value: string) => {
        if (!onPageSizeChange) return;
        const newSize = Number(value);
        if (!isNaN(newSize) && newSize > 0) {
            onPageSizeChange(newSize);
        }
    };

    const canGoPrevious = totalPages > 1 && currentPage !== 1;
    const canGoNext = totalPages > 1 && currentPage !== totalPages;

    return (
        <div
            className={cn(
                'flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8',
                disabled && 'opacity-50 pointer-events-none',
                className,
            )}
            {...props}
        >
            <div className='flex-1 whitespace-nowrap text-muted-foreground text-sm'>
                {selectedCount !== undefined && totalRows !== undefined && (
                    <>
                        {selectedCount} of {totalRows} row{totalRows !== 1 ? 's' : ''}{' '}
                        selected.
                    </>
                )}
            </div>
            <div className='flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8'>
                {/* Rows per page selector */}
                {pageSize !== undefined && onPageSizeChange && (
                    <div className='flex items-center space-x-2'>
                        <p className='whitespace-nowrap font-medium text-sm'>
                            Rows per page
                        </p>
                        <Select
                            value={`${pageSize}`}
                            onValueChange={handlePageSizeChange}
                            disabled={disabled}
                        >
                            <SelectTrigger className='h-8 w-18 data-size:h-8'>
                                <SelectValue placeholder={pageSize} />
                            </SelectTrigger>
                            <SelectContent side='top'>
                                {pageSizeOptions.map((size) => (
                                    <SelectItem key={size} value={`${size}`}>
                                        {size}
                                    </SelectItem>
                                ))}
                                {!pageSizeOptions.includes(pageSize) && (
                                    <SelectItem value={`${pageSize}`}>
                                        {pageSize}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Page info */}
                <div className='flex items-center justify-center font-medium text-sm'>
                    Page {currentPage} of {totalPages}
                </div>

                {/* Navigation buttons */}
                <div className='flex items-center space-x-2'>
                    <Button
                        aria-label='Go to first page'
                        variant='outline'
                        size='icon'
                        className='hidden size-8 lg:flex'
                        onClick={() => onPageChange(1)}
                        disabled={!canGoPrevious || disabled}
                    >
                        <ChevronsLeft />
                    </Button>
                    <Button
                        aria-label='Go to previous page'
                        variant='outline'
                        size='icon'
                        className='size-8'
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={!canGoPrevious || disabled}
                    >
                        <ChevronLeft />
                    </Button>
                    <Button
                        aria-label='Go to next page'
                        variant='outline'
                        size='icon'
                        className='size-8'
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={!canGoNext || disabled}
                    >
                        <ChevronRight />
                    </Button>
                    <Button
                        aria-label='Go to last page'
                        variant='outline'
                        size='icon'
                        className='hidden size-8 lg:flex'
                        onClick={() => onPageChange(totalPages)}
                        disabled={!canGoNext || disabled}
                    >
                        <ChevronsRight />
                    </Button>
                </div>
            </div>
        </div>
    );
}
