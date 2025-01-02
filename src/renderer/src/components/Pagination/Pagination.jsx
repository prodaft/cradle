import React from 'react';

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    maxVisible = 7,
}) {
    const startPage = Math.max(
        1,
        Math.min(currentPage - Math.floor(maxVisible / 2), totalPages - maxVisible + 1),
    );
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);

    const pages = Array.from(
        { length: endPage - startPage + 1 },
        (_, index) => startPage + index,
    );

    return (
        <div className='pagination flex justify-center mt-4 mb-4 items-center'>
            {/* Left Arrow */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className='btn'
            >
                &lt;
            </button>

            {/* Page Numbers */}
            {pages.map((page) => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    disabled={currentPage === page}
                    className={`btn ${currentPage === page ? 'btn-disabled' : ''}`}
                >
                    {page}
                </button>
            ))}

            {/* Right Arrow */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className='btn'
            >
                &gt;
            </button>
        </div>
    );
}
