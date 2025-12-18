import { useCradleNavigate } from '@/hooks';
import { useModal } from '@/contexts/ui/ModalContext';
import { truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import TableCard from '@components/base/Card/TableCard';
import ListView, { DateRangeFilter } from '@components/base/ListView/ListView';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import StatusHeaderDropdown from '@components/base/StatusHeaderDropdown/StatusHeaderDropdown';
import Tooltip from '@components/base/Tooltip/Tooltip';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import { EnrichmentRequestList } from '@services/cradle/models';
import { InfoCircleSolid, PlusCircle, Search, Trash, WarningCircleSolid, WarningTriangleSolid, Xmark } from 'iconoir-react';
import { capitalize } from 'lodash';
import { ChangeEvent, FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';

type EnrichmentRequest = EnrichmentRequestList;

interface ColumnFilter {
    [key: string]: string | DateRangeFilter | undefined;
    status: string;
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
    columnFilters = { status: 'all', user: '' },
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
    const { setModal } = useModal();
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
        createdAt: 'created_at',
        user: 'user__username',
    };

    const handleStatusChange = (status: string) => {
        if (onColumnFilterChange) {
            onColumnFilterChange('status', status);
        }
    };

    const columns: Array<{ key: string; label: string | React.ReactNode; filterType?: 'text' | 'date'; sortable?: boolean }> =
        [
            {
                key: 'status',
                label: <StatusHeaderDropdown
                    onStatusChange={handleStatusChange}
                    status={columnFilters.status}
                    statusOptions={['all', 'done', 'waiting', 'error', 'info']}
                />,
                sortable: false
            },
            { key: 'title', label: 'Title' },
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
            : {
                status: (value: string | DateRangeFilter) => { },
            };

    const getStatusIcon = (status?: string, errorMessage?: string) => {
        if (!status) return null;

        const icon = (() => {
            switch (status) {
                case 'done':
                    return (
                        <svg
                            width='18'
                            height='18'
                            viewBox='0 0 24 24'
                            fill='none'
                            xmlns='http://www.w3.org/2000/svg'
                            className='text-green-500'
                        >
                            <path
                                d='M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            />
                        </svg>
                    );
                case 'waiting':
                    return (
                        <WarningTriangleSolid
                            className='text-amber-500'
                            width='18'
                            height='18'
                        />
                    );
                case 'error':
                    return (
                        <WarningCircleSolid
                            className='text-red-500'
                            width='18'
                            height='18'
                        />
                    );
                case 'info':
                    return <InfoCircleSolid className='text-blue-500' width='18' height='18' />;
                default:
                    return null;
            }
        })();

        const tooltipContent = errorMessage || capitalize(status);
        const tooltipColor = status === 'error' ? 'error' : status === 'waiting' ? 'warning' : 'primary';

        if ((status === 'error' || status === 'waiting') && errorMessage) {
            return (
                <Tooltip content={tooltipContent} color={tooltipColor} showArrow={false}>
                    <span className='inline-flex items-center align-middle flex-shrink-0'>
                        {icon}
                    </span>
                </Tooltip>
            );
        }

        return (
            <Tooltip content={tooltipContent} showArrow={false}>
                <span className='inline-flex items-center align-middle flex-shrink-0'>
                    {icon}
                </span>
            </Tooltip>
        );
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
                <td className='w-20'>
                    <div className='flex items-center'>
                        {getStatusIcon(request.status, (request as any).errorMessage)}
                    </div>
                </td>
                <td className='truncate max-w-xs' title={request.title}>
                    {truncateText(request.title, 50)}
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
                                    onClick={() => {
                                        if (selectedRequests.length > 0) {
                                            setModal(ConfirmDeletionModal, {
                                                onConfirm: onDeleteSelected,
                                                text: `Are you sure you want to delete ${selectedRequests.length} request${selectedRequests.length > 1 ? 's' : ''}? This action is irreversible.`,
                                            });
                                        }
                                    }}
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