import { truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import TableCard from '@components/base/Card/TableCard';
import ListView, { DateRangeFilter } from '@components/base/ListView/ListView';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import Tooltip from '@components/base/Tooltip/Tooltip';
import { EnrichmentRequestList } from '@services/cradle/models';
import { Eye, Refresh, Trash } from 'iconoir-react';
import { ChangeEvent, FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type EnrichmentRequest = EnrichmentRequestList;

interface ColumnFilter {
    [key: string]: string | DateRangeFilter | undefined;
    user: string;
}

interface SearchFilters {
    title?: string;
    user?: string;
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
    onColumnFilterChange?: ((column: keyof ColumnFilter, value: string) => void) | null;
    columnFilters?: ColumnFilter;
    searchFilters?: SearchFilters;
    onSearchChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    onSearchSubmit?: (e: FormEvent) => void;
    selectedRequests?: number[];
    setSelectedRequests?: (ids: number[]) => void;
    onDeleteSelected?: () => void;
    onRetrySelected?: () => void;
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
    selectedRequests = [],
    setSelectedRequests = () => { },
    onDeleteSelected = () => { },
    onRetrySelected = () => { },
}: EnrichmentRequestsListProps) {
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside as any);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside as any);
        };
    }, []);

    // Mapping of table columns to API field names
    const sortFieldMapping: Record<string, string> = {
        title: 'title',
        status: 'status',
        createdAt: 'created_at',
        user: 'user__username',
    };

    const columns: Array<{ key: string; label: string; filterType?: 'text' | 'date' }> =
        [
            { key: 'title', label: 'Title' },
            { key: 'status', label: 'Status' },
            { key: 'user', label: 'User', filterType: 'text' as const },
            { key: 'createdAt', label: 'Created At' },
            { key: 'actions', label: 'Actions' },
        ];

    const filterableColumns: Record<string, (value: string | DateRangeFilter) => void> =
        onColumnFilterChange
            ? {
                user: (value: string | DateRangeFilter) => {
                    if (typeof value === 'string') {
                        onColumnFilterChange('user', value);
                    }
                },
            }
            : {};

    const renderRow = (
        request: EnrichmentRequest,
        index: number,
        selectProps: SelectProps = {},
    ) => {
        const { enableMultiSelect, isSelected, onSelect } = selectProps;

        return (
            <tr key={request.id}>
                {enableMultiSelect && (
                    <td
                        className='w-12'
                        onClick={(e: MouseEvent) => e.stopPropagation()}
                    >
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
                        className={`badge ${request.status === 'done'
                            ? 'badge-success'
                            : request.status === 'error'
                                ? 'badge-error'
                                : request.status === 'waiting'
                                    ? 'badge-warning'
                                    : 'badge-info'
                            }`}
                    >
                        {request.status}
                    </span>
                </td>
                <td className='w-32'>{request.userDetail?.username || 'N/A'}</td>
                <td className='w-40'>
                    {request.createdAt
                        ? formatDate(new Date(request.createdAt))
                        : 'N/A'}
                </td>
                <td className='w-20'>
                    <div className='flex gap-2'>
                        <Tooltip content='View Details' side='top'>
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
        <div className='flex flex-col space-y-4'>
            {/* Compact Control Bar - Actions and Pagination */}
            {!loading && (
                <TableCard>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
                        {/* Left: Actions Dropdown */}
                        <div className='flex items-center gap-4 flex-shrink-0'>
                            <div
                                className={`${enrichmentRequests.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className='cradle-dropdown' ref={dropdownRef}>
                                    <button
                                        type='button'
                                        className={`cradle-select text-sm flex items-center justify-between gap-2 min-w-[120px] ${selectedRequests.length > 0 ? 'opacity-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                                        disabled={selectedRequests.length === 0}
                                        title={
                                            selectedRequests.length > 0
                                                ? `${selectedRequests.length} request(s) selected`
                                                : 'Select requests to perform actions'
                                        }
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    >
                                        <span className='truncate'>
                                            {selectedRequests.length > 0
                                                ? `${selectedRequests.length} selected`
                                                : 'Actions'}
                                        </span>
                                        <svg
                                            className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth='2'
                                                d='M19 9l-7 7-7-7'
                                            ></path>
                                        </svg>
                                    </button>

                                    {isDropdownOpen && selectedRequests.length > 0 && (
                                        <div className='cradle-dropdown-menu'>
                                            <button
                                                type='button'
                                                className='cradle-dropdown-option flex items-center gap-2'
                                                onClick={() => {
                                                    onRetrySelected();
                                                    setIsDropdownOpen(false);
                                                }}
                                            >
                                                <Refresh className='w-4 h-4' />
                                                Retry
                                            </button>
                                            <button
                                                type='button'
                                                className='cradle-dropdown-option flex items-center gap-2 text-red-600'
                                                onClick={() => {
                                                    onDeleteSelected();
                                                    setIsDropdownOpen(false);
                                                }}
                                            >
                                                <Trash className='w-4 h-4' />
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Pagination */}
                        <PaginationWrapper
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            pageSize={pageSize}
                            onPageSizeChange={setPageSize}
                            disabled={enrichmentRequests.length === 0}
                        />
                    </div>
                </TableCard>
            )}

            {/* Table */}
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
                    enableMultiSelect={true}
                    setSelected={(ids) =>
                        setSelectedRequests(
                            ids
                        )
                    }
                />
            </TableCard>
        </div>
    );
}

export default EnrichmentRequestsList;
