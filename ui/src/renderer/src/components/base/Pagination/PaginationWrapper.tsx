import React from 'react';
import Pagination from '../Pagination/Pagination';

interface PaginationWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    pageSize?: number;
    onPageSizeChange?: (size: number) => void;
    disabled?: boolean;
    className?: string;
    selectedCount?: number;
    totalRows?: number;
    compact?: boolean;
}

/**
 * Reusable PaginationWrapper component that wraps Pagination with consistent styling
 */
function PaginationWrapper({
    currentPage = 1,
    totalPages = 1,
    onPageChange = (_page: number) => {},
    pageSize = 10,
    onPageSizeChange = (_size: number) => {},
    disabled = false,
    className = '',
    selectedCount,
    totalRows,
    compact = false,
    ...props
}: PaginationWrapperProps) {
    return (
        <div
            className={`flex-shrink-0 -mt-3 py-2 ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
            {...props}
        >
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                pageSize={pageSize}
                onPageSizeChange={onPageSizeChange}
                selectedCount={selectedCount}
                totalRows={totalRows}
                compact={compact}
            />
        </div>
    );
}

export default PaginationWrapper;
