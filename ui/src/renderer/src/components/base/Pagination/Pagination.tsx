import { ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Pagination component props
 */
export interface PaginationProps {
    /** Current active page */
    currentPage: number;
    /** Total number of pages */
    totalPages: number;
    /** Callback when page changes */
    onPageChange: (page: number) => void;
    /** Maximum number of page buttons to show */
    maxVisible?: number;
    /** Current page size (items per page) */
    pageSize?: number | null;
    /** Callback when page size changes */
    onPageSizeChange?: ((pageSize: number) => void) | null;
    /** Number of selected rows */
    selectedCount?: number;
    /** Total number of rows */
    totalRows?: number;
}

/**
 * Pagination component - Navigate between pages with first/prev/next/last controls
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
    maxVisible = 7,
    pageSize = null,
    onPageSizeChange = null,
    selectedCount,
    totalRows,
}: PaginationProps): JSX.Element {
    const handlePageSizeChange = (e: ChangeEvent<HTMLSelectElement>) => {
        if (!onPageSizeChange) return;

        const newSize = parseInt(e.target.value, 10);
        if (!isNaN(newSize) && newSize > 0) {
            onPageSizeChange(newSize);
        }
    };

    const pageSizeOptions = [10, 20, 50, 100];

    const canGoFirst = totalPages > 1 && currentPage !== 1;
    const canGoPrevious = totalPages > 1 && currentPage !== 1;
    const canGoNext = totalPages > 1 && currentPage !== totalPages;
    const canGoLast = totalPages > 1 && currentPage !== totalPages;

    return (
        <div className='flex items-center justify-between px-2'>
            {/* Left side: Selection info */}
            {selectedCount !== undefined && totalRows !== undefined && (
                <div className='flex-1 text-sm text-muted-foreground'>
                    {selectedCount} of {totalRows} row{totalRows !== 1 ? 's' : ''}{' '}
                    selected.
                </div>
            )}

            {/* Right side: Pagination controls */}
            <div className='flex items-center space-x-6 lg:space-x-8'>
                {/* Rows per page selector */}
                {pageSize !== null && onPageSizeChange && (
                    <div className='flex items-center space-x-2'>
                        <p className='text-sm font-medium'>Rows per page</p>
                        <select
                            className='h-8 px-3 text-sm rounded-md border border-border-border bg-transparent text-text-foreground focus:outline-none focus:ring-2 focus:ring-border-primary focus:ring-offset-2 cursor-pointer appearance-none'
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.5em 1.5em',
                                paddingRight: '2.5rem',
                            }}
                            value={pageSize}
                            onChange={handlePageSizeChange}
                            aria-label='Rows per page'
                        >
                            {pageSizeOptions.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                            {!pageSizeOptions.includes(pageSize) && (
                                <option value={pageSize}>{pageSize}</option>
                            )}
                        </select>
                    </div>
                )}

                {/* Page info */}
                <div className='flex w-[100px] items-center justify-center text-sm font-medium'>
                    Page {currentPage} of {totalPages}
                </div>

                {/* Navigation buttons */}
                <div className='flex items-center space-x-2'>
                    <Button
                        variant='outline'
                        size='icon'
                        onClick={() => onPageChange(1)}
                        disabled={!canGoFirst}
                        className='hidden lg:flex text-white hover:text-white'
                        title='Go to first page'
                    >
                        <span className='sr-only'>Go to first page</span>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='24'
                            height='24'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            className='h-4 w-4 text-white'
                        >
                            <path d='m11 17-5-5 5-5'></path>
                            <path d='m18 17-5-5 5-5'></path>
                        </svg>
                    </Button>
                    <Button
                        variant='outline'
                        size='icon'
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={!canGoPrevious}
                        className='text-white hover:text-white'
                        title='Go to previous page'
                    >
                        <span className='sr-only'>Go to previous page</span>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='24'
                            height='24'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            className='h-4 w-4 text-white'
                        >
                            <path d='m15 18-6-6 6-6'></path>
                        </svg>
                    </Button>
                    <Button
                        variant='outline'
                        size='icon'
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={!canGoNext}
                        className='text-white hover:text-white'
                        title='Go to next page'
                    >
                        <span className='sr-only'>Go to next page</span>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='24'
                            height='24'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            className='h-4 w-4 text-white'
                        >
                            <path d='m9 18 6-6-6-6'></path>
                        </svg>
                    </Button>
                    <Button
                        variant='outline'
                        size='icon'
                        onClick={() => onPageChange(totalPages)}
                        disabled={!canGoLast}
                        className='hidden lg:flex text-white hover:text-white'
                        title='Go to last page'
                    >
                        <span className='sr-only'>Go to last page</span>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='24'
                            height='24'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            className='h-4 w-4 text-white'
                        >
                            <path d='m6 17 5-5-5-5'></path>
                            <path d='m13 17 5-5-5-5'></path>
                        </svg>
                    </Button>
                </div>
            </div>
        </div>
    );
}
