import { ChangeEvent, useEffect, useState } from 'react';

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
}: PaginationProps): JSX.Element {
    const [inputValue, setInputValue] = useState<string>(String(currentPage));

    useEffect(() => {
        setInputValue(String(currentPage));
    }, [currentPage]);

    const startPage = Math.max(
        1,
        Math.min(currentPage - Math.floor(maxVisible / 2), totalPages - maxVisible + 1),
    );
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);

    const _pages = Array.from(
        { length: endPage - startPage + 1 },
        (_, index) => startPage + index,
    );

    const handlePageInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handlePageInputBlur = () => {
        const pageNum = parseInt(inputValue, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            onPageChange(pageNum);
        } else {
            setInputValue(String(currentPage));
        }
    };

    const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handlePageInputBlur();
        }
    };

    return (
        <div className='pagination flex justify-end items-center text-sm w-full min-w-0'>
            {/* First */}
            {totalPages > 1 && currentPage !== 1 && (
                <span
                    onClick={() => onPageChange(1)}
                    className='cursor-pointer px-1 hover:opacity-70'
                    title='First page'
                >
                    &lt;&lt;
                </span>
            )}

            {/* Previous */}
            {totalPages > 1 && currentPage !== 1 && (
                <span
                    onClick={() => onPageChange(currentPage - 1)}
                    className='cursor-pointer px-1 hover:opacity-70'
                    title='Previous page'
                >
                    &lt;
                </span>
            )}

            {/* Current Page / Total */}
            <div className='flex items-center font-medium text-sm flex-shrink-0 px-1'>
                <input
                    type='text'
                    value={inputValue}
                    onChange={handlePageInputChange}
                    onBlur={handlePageInputBlur}
                    onKeyDown={handlePageInputKeyDown}
                    className='border border-cradle-border-accent rounded-full text-center text-sm bg-transparent focus:outline-none focus:border-cradle-accent-primary'
                    style={{
                        width: `${String(inputValue).length * 0.6 + 0.8}em`,
                        padding: '0 2px',
                    }}
                    title='Enter page number'
                />
                <span className='mx-0.5'>/</span>
                <span>{totalPages}</span>
            </div>

            {/* Next */}
            {totalPages > 1 && currentPage !== totalPages && (
                <span
                    onClick={() => onPageChange(currentPage + 1)}
                    className='cursor-pointer px-1 hover:opacity-70'
                    title='Next page'
                >
                    &gt;
                </span>
            )}

            {/* Last */}
            {totalPages > 1 && currentPage !== totalPages && (
                <span
                    onClick={() => onPageChange(totalPages)}
                    className='cursor-pointer px-1 hover:opacity-70'
                    title='Last page'
                >
                    &gt;&gt;
                </span>
            )}
        </div>
    );
}
