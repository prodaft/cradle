import { useState, useEffect, useRef } from 'react';

/**
 * Custom Page Size Dropdown component
 */
function PageSizeDropdown({ pageSize, onPageSizeChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const pageSizeOptions = [
        { value: 10, label: '10' },
        { value: 20, label: '20' },
        { value: 50, label: '50' },
        { value: 100, label: '100' }
    ];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleOptionClick = (value) => {
        setIsOpen(false);
        onPageSizeChange(value);
    };

    return (
        <div className="cradle-dropdown" ref={dropdownRef}>
            <button
                type="button"
                className="cradle-select text-sm w-16 ml-1 px-2 py-1 flex items-center justify-between"
                onClick={() => setIsOpen(!isOpen)}
                title="Items per page"
            >
                <span>{pageSize}</span>
                <svg
                    className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            
            {isOpen && (
                <div className="cradle-dropdown-menu">
                    {pageSizeOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className="cradle-dropdown-option flex items-center gap-2"
                            onClick={() => handleOptionClick(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

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

            {/* Page Size Dropdown */}
            {pageSize !== null && onPageSizeChange && (
                <PageSizeDropdown
                    pageSize={pageSize}
                    onPageSizeChange={onPageSizeChange}
                />
            )}
        </div>
    );
}
