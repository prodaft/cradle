import { useState, useEffect } from 'react';

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    maxVisible = 7,
    pageSize = null,
    onPageSizeChange = null,
}) {
    const [inputValue, setInputValue] = useState(currentPage);

    useEffect(() => {
        setInputValue(currentPage);
    }, [currentPage]);

    const startPage = Math.max(
        1,
        Math.min(currentPage - Math.floor(maxVisible / 2), totalPages - maxVisible + 1),
    );
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);

    const pages = Array.from(
        { length: endPage - startPage + 1 },
        (_, index) => startPage + index,
    );

    const handlePageInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const handlePageInputSubmit = () => {
        const pageNum = parseInt(inputValue, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            onPageChange(pageNum);
        } else {
            setInputValue(currentPage);
        }
    };

    const handlePageInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            handlePageInputSubmit();
            e.target.blur();
        }
    };

    return (
        <div className='pagination flex justify-end items-center text-sm'>
            {/* First */}
            {totalPages > 1 && currentPage !== 1 && (
                <span
                    onClick={() => onPageChange(1)}
                    className='cursor-pointer px-0 hover:opacity-70'
                    title='First page'
                >
                    &lt;&lt;
                </span>
            )}

            {/* Previous */}
            {totalPages > 1 && currentPage !== 1 && (
                <span
                    onClick={() => onPageChange(currentPage - 1)}
                    className='cursor-pointer px-0 hover:opacity-70'
                    title='Previous page'
                >
                    &lt;
                </span>
            )}

            {/* Current Page / Total */}
            <div className='flex items-center font-medium whitespace-nowrap text-sm'>
                <input
                    type='text'
                    value={inputValue}
                    onChange={handlePageInputChange}
                    onBlur={handlePageInputSubmit}
                    onKeyDown={handlePageInputKeyDown}
                    className='border border-base-300 rounded text-center text-sm bg-base-100 focus:outline-none focus:border-primary'
                    style={{ width: `${String(inputValue).length * 0.6 + 0.8}em`, padding: '0 2px' }}
                    title='Enter page number'
                />
                <span className='mx-0.5'>/</span>
                <span>{totalPages}</span>
            </div>

            {/* Next */}
            {totalPages > 1 && currentPage !== totalPages && (
                <span
                    onClick={() => onPageChange(currentPage + 1)}
                    className='cursor-pointer px-0 hover:opacity-70'
                    title='Next page'
                >
                    &gt;
                </span>
            )}

            {/* Last */}
            {totalPages > 1 && currentPage !== totalPages && (
                <span
                    onClick={() => onPageChange(totalPages)}
                    className='cursor-pointer px-0 hover:opacity-70'
                    title='Last page'
                >
                    &gt;&gt;
                </span>
            )}

            {/* Page Size Dropdown */}
            {pageSize !== null && onPageSizeChange && (
                <select
                    className='select select-sm select-bordered w-16 ml-1 py-0'
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    title='Items per page'
                >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
            )}
        </div>
    );
}
