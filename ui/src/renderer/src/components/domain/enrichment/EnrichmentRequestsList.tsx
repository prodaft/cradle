import { useCradleNavigate } from '@/hooks';
import { truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import TableCard from '@components/base/Card/TableCard';
import ListView, { DateRangeFilter } from '@components/base/ListView/ListView';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import { EnrichmentRequestList } from '@services/cradle/models';
import { Search, Xmark } from 'iconoir-react';
import { capitalize } from 'lodash';
import { ChangeEvent, FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';

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
    onCreateRequest?: () => void;
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
    onCreateRequest = () => { },
}: EnrichmentRequestsListProps) {
    const { navigateLink } = useCradleNavigate();
    const [isSearchExpanded, setIsSearchExpanded] = useState(!!searchFilters?.title);
    const [searchQuery, setSearchQuery] = useState(searchFilters?.title || '');
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isSearchExpanded && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchExpanded]);

    const handleSearchSubmit = () => {
        const event = {
            target: { name: 'title', value: searchQuery },
        } as ChangeEvent<HTMLInputElement>;
        onSearchChange(event);
        if (onSearchSubmit) {
            onSearchSubmit(event);
        }
    };

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

    const getStatusBadgeClasses = (status: string) => {
        const baseClasses =
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white shadow-sm';
        let colorClass = 'bg-zinc-500';

        switch (status) {
            case 'done':
                colorClass = 'bg-green-600';
                break;
            case 'error':
                colorClass = 'bg-red-600';
                break;
            case 'waiting':
                colorClass = 'bg-yellow-600';
                break;
            case 'info':
                colorClass = 'bg-blue-600';
                break;
            default:
                colorClass = 'bg-zinc-500';
                break;
        }
        return `${baseClasses} ${colorClass}`;
    };

    const renderRow = (
        request: EnrichmentRequest,
        index: number,
        selectProps: SelectProps = {},
    ) => {
        const { enableMultiSelect, isSelected, onSelect } = selectProps;

        return (
            <tr
                key={request.id}
                onClick={navigateLink(`/enrichment/${request.id}`)}
                className='cursor-pointer'
            >
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
                        className={getStatusBadgeClasses(request.status || '')}
                    >
                        {capitalize(request.status || '')}
                    </span>
                </td>
                <td className='w-32'>{request.userDetail?.username || 'N/A'}</td>
                <td className='w-40'>
                    {request.createdAt
                        ? formatDate(new Date(request.createdAt))
                        : 'N/A'}
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
                        {/* Left: Actions */}
                        <div className='flex items-center gap-2 flex-shrink-0'>
                            <button
                                onClick={onCreateRequest}
                                className='flex items-center justify-center w-10 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors rounded-full'
                                data-state='closed'
                            >
                                <svg
                                    width='18'
                                    height='18'
                                    strokeWidth='1.5'
                                    viewBox='0 0 24 24'
                                    fill='none'
                                    xmlns='http://www.w3.org/2000/svg'
                                    color='currentColor'
                                    className='text-[#FF8C00]'
                                >
                                    <path
                                        d='M8 12H12M16 12H12M12 12V8M12 12V16'
                                        stroke='currentColor'
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                    ></path>
                                    <path
                                        d='M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z'
                                        stroke='currentColor'
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                    ></path>
                                </svg>
                            </button>
                            <div className='h-8 w-px bg-cradle-border-accent'></div>
                            <button
                                onClick={onDeleteSelected}
                                disabled={enrichmentRequests.length === 0 || selectedRequests.length === 0}
                                className='flex items-center gap-2 px-3 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full'
                            >
                                <svg
                                    width='18'
                                    height='18'
                                    viewBox='0 0 24 24'
                                    strokeWidth='1.5'
                                    fill='none'
                                    xmlns='http://www.w3.org/2000/svg'
                                    color='currentColor'
                                    className='text-cradle-text-secondary'
                                >
                                    <path
                                        d='M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9'
                                        stroke='currentColor'
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                    ></path>
                                    <path
                                        d='M21 6L15.375 6M3 6L8.625 6M8.625 6V4C8.625 2.89543 9.52043 2 10.625 2H13.375C14.4796 2 15.375 2.89543 15.375 4V6M8.625 6L15.375 6'
                                        stroke='currentColor'
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                    ></path>
                                </svg>
                            </button>
                            <div className='h-8 w-px bg-cradle-border-accent'></div>
                            {!isSearchExpanded ? (
                                <button
                                    onClick={() => setIsSearchExpanded(true)}
                                    className='flex items-center justify-center w-10 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary rounded-full'
                                    title='Search'
                                >
                                    <Search className='w-4 h-4' />
                                </button>
                            ) : (
                                <div className='flex items-center gap-2 min-w-[280px] bg-cradle-bg-elevated border border-cradle-border-accent h-10 px-2 rounded-full'>
                                    <button
                                        onClick={() => {
                                            handleSearchSubmit();
                                        }}
                                        className='p-1 flex-shrink-0 transition-colors text-cradle-text-muted hover:text-cradle-text-primary'
                                        title='Search'
                                    >
                                        <Search className='w-4 h-4' />
                                    </button>
                                    <input
                                        ref={searchInputRef}
                                        type='text'
                                        name='title'
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            onSearchChange(e);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleSearchSubmit();
                                            }
                                            if (e.key === 'Escape') {
                                                if (!searchQuery) {
                                                    setIsSearchExpanded(false);
                                                }
                                            }
                                        }}
                                        onBlur={() => {
                                            if (!searchQuery) {
                                                setIsSearchExpanded(false);
                                            }
                                        }}
                                        placeholder='Search requests...'
                                        className='flex-grow bg-transparent text-sm outline-none text-cradle-text-primary placeholder:text-cradle-text-muted rounded-none font-mono'
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => {
                                                setSearchQuery('');
                                                const event = {
                                                    target: { name: 'title', value: '' },
                                                } as ChangeEvent<HTMLInputElement>;
                                                onSearchChange(event);
                                                if (onSearchSubmit) {
                                                    onSearchSubmit(event);
                                                }
                                            }}
                                            className='p-1 flex-shrink-0 text-cradle-text-muted hover:text-cradle-text-primary transition-colors'
                                            title='Clear search'
                                        >
                                            <Xmark className='w-4 h-4' />
                                        </button>
                                    )}
                                </div>
                            )}
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
                setSelected={(ids) => setSelectedRequests(ids)}
            />
        </div>
    );
}

export default EnrichmentRequestsList;
