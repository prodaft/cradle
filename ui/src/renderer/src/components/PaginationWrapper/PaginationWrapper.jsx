import React from 'react';
import Pagination from '../Pagination/Pagination';

/**
 * Reusable PaginationWrapper component that wraps Pagination with consistent styling
 */
function PaginationWrapper({
    currentPage = 1,
    totalPages = 1,
    onPageChange = () => {},
    pageSize = 10,
    onPageSizeChange = () => {},
    disabled = false,
    className = '',
    ...props
}) {
    return (
        <div className={`flex-shrink-0 ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`} {...props}>
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                pageSize={pageSize}
                onPageSizeChange={onPageSizeChange}
            />
        </div>
    );
}

export default PaginationWrapper;
