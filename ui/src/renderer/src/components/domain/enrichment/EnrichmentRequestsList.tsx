import { useCradleNavigate } from '@/hooks';
import { truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import TableCard from '@components/base/Card/TableCard';
import ListView, { DateRangeFilter } from '@components/base/ListView/ListView';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import Tooltip from '@components/base/Tooltip/Tooltip';
import { EnrichmentRequestList } from '@services/cradle/models';
import { PlusCircle, Search, Trash, Xmark } from 'iconoir-react';
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
                            <Tooltip content='Create new enrichment request'>
                                <button
                                    onClick={onCreateRequest}
                                    className='flex items-center justify-center w-10 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors rounded-full'
                                >
                                    <PlusCircle
                                        className='text-[#FF8C00]'
                                        width={20}
                                        height={20}
                                    />
                                </button>
                            </Tooltip>

                            <div className='h-8 w-px bg-cradle-border-accent'></div>

                            <Tooltip content={selectedRequests.length > 0 ? `Delete ${selectedRequests.length} request${selectedRequests.length > 1 ? 's' : ''}` : 'Select requests to delete'}>
                                <button
                                    onClick={onDeleteSelected}
                                    disabled={enrichmentRequests.length === 0 || selectedRequests.length === 0}
                                    className='flex items-center gap-2 px-3 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full'
                                >
                                    <Trash
                                        className={selectedRequests.length > 0 ? 'text-[#FF8C00]' : 'text-cradle-text-secondary'}
                                        width={20}
                                        height={20}
                                    />
                                    {selectedRequests.length > 0 && (
                                        <span className='text-sm text-cradle-text-secondary font-mono'>
                                            {selectedRequests.length}
                                        </span>
                                    )}
                                </button>
                            </Tooltip>
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
