import React, { ChangeEvent, FormEvent, MouseEvent } from 'react';
import { Eye } from 'iconoir-react';
import { useNavigate } from 'react-router-dom';
import { truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import ListView from '@components/base/ListView/ListView';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import TableCard from '@components/base/Card/TableCard';
import Tooltip from '@components/base/Tooltip/Tooltip';

interface EnrichmentRequest {
    id: string;
    title: string;
    status: string;
    user?: {
        username: string;
    };
    createdAt: string;
}

interface ColumnFilter {
    user: string;
}

interface SearchFilters {
    title?: string;
    user?: string;
}

interface Column {
    key: string;
    label: string;
    filterType?: string;
}

interface SelectProps {
    enableMultiSelect?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
}

interface EnrichmentRequestsListProps {
    enrichmentRequests: EnrichmentRequest[];
    loading: boolean;
    page: number;
    totalPages: number;
    handlePageChange: (page: number) => void;
    setAlert?: (alert: any) => void;
    onRequestDelete?: () => void;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (field: string, direction: 'asc' | 'desc') => void;
    pageSize?: number;
    setPageSize?: (size: number) => void;
    onColumnFilterChange?: ((column: string, value: string) => void) | null;
    columnFilters?: ColumnFilter;
    searchFilters?: SearchFilters;
    onSearchChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    onSearchSubmit?: (e: FormEvent) => void;
}

function EnrichmentRequestsList({
    enrichmentRequests,
    loading,
    page,
    totalPages,
    handlePageChange,
    setAlert,
    onRequestDelete,
    sortField = 'created_at',
    sortDirection = 'desc',
    onSort,
    pageSize = 10,
    setPageSize = () => { },
    onColumnFilterChange = null,
    columnFilters = { user: '' },
    searchFilters = {},
    onSearchChange = () => { },
    onSearchSubmit = () => { },
}: EnrichmentRequestsListProps) {
    const navigate = useNavigate();

    // Mapping of table columns to API field names
    const sortFieldMapping: Record<string, string> = {
        title: 'title',
        status: 'status',
        createdAt: 'created_at',
        user: 'user__username',
    };

    const columns: Column[] = [
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'user', label: 'User', filterType: 'text' },
        { key: 'createdAt', label: 'Created At' },
        { key: 'actions', label: 'Actions' },
    ];

    // Define filterable columns with their handlers
    const filterableColumns = onColumnFilterChange ? {
        user: (value: string) => onColumnFilterChange('user', value),
    } : {};

    const renderRow = (request: EnrichmentRequest, index: number, selectProps: SelectProps = {}) => {
        const { enableMultiSelect, isSelected, onSelect } = selectProps;

        return (
            <tr key={request.id}>
                {enableMultiSelect && (
                    <td className='w-12' onClick={(e: MouseEvent) => e.stopPropagation()}>
                        <input
                            type='checkbox'
                            className='cradle-checkbox'
                            checked={isSelected}
                            onChange={onSelect}
                        />
                    </td>
                )}
                <td className='truncate max-w-xs' title={request.title}>
                    {truncateText(request.title, 50)}
                </td>
                <td className='w-32'>
                    <span
                        className={`badge ${
                            request.status === 'done'
                                ? 'badge-success'
                                : request.status === 'failed'
                                ? 'badge-error'
                                : request.status === 'pending'
                                ? 'badge-warning'
                                : 'badge-info'
                        }`}
                    >
                        {request.status}
                    </span>
                </td>
                <td className='w-32'>{request.user?.username || 'N/A'}</td>
                <td className='w-40'>
                    {request.createdAt ? formatDate(new Date(request.createdAt)) : 'N/A'}
                </td>
                <td className='w-20'>
                    <div className='flex gap-2'>
                        <Tooltip content='View Details' placement='top'>
                            <button
                                className='btn btn-ghost btn-sm'
                                onClick={() => navigate(`/enrichment/${request.id}`)}
                            >
                                <Eye />
                            </button>
                        </Tooltip>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <TableCard>
            <ListView
                data={enrichmentRequests}
                columns={columns}
                renderRow={renderRow}
                loading={loading}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                sortFieldMapping={sortFieldMapping}
                filterableColumns={filterableColumns}
                filterValues={columnFilters}
                emptyMessage='No enrichment requests found'
            />
            <PaginationWrapper
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
            />
        </TableCard>
    );
}

export default EnrichmentRequestsList;
