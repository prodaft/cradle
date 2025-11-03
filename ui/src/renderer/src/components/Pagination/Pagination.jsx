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
        <div className='pagination flex justify-end items-center text-sm w-full min-w-0'>
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
            <div className='flex items-center font-medium text-sm flex-shrink-0'>
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

            {/* Page Size Input */}
            {pageSize !== null && onPageSizeChange && (
                <input
                    type="number"
                    min="10"
                    step="10"
                    value={pageSize}
                    onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value) && value >= 10) {
                            onPageSizeChange(value);
                        }
                    }}
                    className="cradle-select text-sm w-16 ml-1 px-2 py-1"
                    title="Items per page"
                />
            )}
        </div>
    );
}
