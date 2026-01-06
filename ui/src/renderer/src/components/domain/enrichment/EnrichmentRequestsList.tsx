import { useModal } from '@/contexts/ui/ModalContext';
import { useCradleNavigate } from '@/hooks';
import { truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import {
    ActionBar,
    ActionBarDivider,
    ActionBarSearch,
    CollapsibleActionGroup,
} from '@components/base/ActionBar/ActionBar';
import ListView, { DateRangeFilter } from '@components/base/ListView/ListView';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import StatusHeaderDropdown from '@components/base/StatusHeaderDropdown/StatusHeaderDropdown';
import TableActionsButton from '@components/base/TableActionsButton';
import Tooltip from '@components/base/Tooltip/Tooltip';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import type { EnrichmentRequestList } from '@services/cradle/models';
import {
    InfoCircleSolid,
    RefreshCircle,
    Trash,
    WarningCircleSolid,
    WarningTriangleSolid,
} from 'iconoir-react';
import { capitalize } from 'lodash';
import { ChangeEvent, FormEvent, MouseEvent } from 'react';

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
    onRerunSelected?: () => void;
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
    setPageSize = () => {},
    onColumnFilterChange = null,
    columnFilters = { status: 'all', user: '' },
    searchFilters = {},
    onSearchChange = () => {},
    onSearchSubmit = () => {},
    selectedRequests = [],
    setSelectedRequests = () => {},
    onDeleteSelected = () => {},
    onRerunSelected = () => {},
    onCreateRequest = () => {},
}: EnrichmentRequestsListProps) {
    const { navigateLink } = useCradleNavigate();
    const { setModal } = useModal();

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

    const columns: Array<{
        key: string;
        label: string | React.ReactNode;
        filterType?: 'text' | 'date';
        sortable?: boolean;
    }> = [
        {
            key: 'title',
            label: (
                <div className='flex items-center gap-2'>
                    <StatusHeaderDropdown
                        onStatusChange={handleStatusChange}
                        status={columnFilters.status}
                        statusOptions={['all', 'done', 'waiting', 'error', 'info']}
                    />
                    <span>Title</span>
                </div>
            ),
        },
        { key: 'user', label: 'User', filterType: 'text' as const },
        { key: 'createdAt', label: 'Created At' },
        { key: 'actions', label: '', sortable: false },
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
                  status: (value: string | DateRangeFilter) => {},
              };

    const errorMsg = (request: EnrichmentRequest) => {
        let msgs: string[] = [];
        if (request.ignoredCount && request.ignoredCount > 0) {
            msgs.push(
                `Ignored ${request.ignoredCount} artifact${request.ignoredCount > 1 ? 's' : ''}`,
            );
        }
        let warn_count =
            request.enrichers?.filter((enricher) => enricher.status === 'warning')
                .length || 0;
        if (warn_count > 0) {
            msgs.push(`Warnings in ${warn_count} enricher${warn_count > 1 ? 's' : ''}`);
        }
        let error_count =
            request.enrichers?.filter((enricher) => enricher.status === 'error')
                .length || 0;
        if (error_count > 0) {
            msgs.push(`Errors in ${error_count} enricher${error_count > 1 ? 's' : ''}`);
        }

        return msgs.join(', ');
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
                case 'warning':
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
                case 'working':
                    return (
                        <InfoCircleSolid
                            className='text-blue-500'
                            width='18'
                            height='18'
                        />
                    );
                default:
                    return null;
            }
        })();

        const tooltipContent = errorMessage || capitalize(status);
        const tooltipColor =
            status === 'error' ? 'error' : status === 'waiting' ? 'warning' : 'primary';

        if ((status === 'error' || status === 'waiting') && errorMessage) {
            return (
                <Tooltip
                    content={tooltipContent}
                    color={tooltipColor}
                    showArrow={false}
                >
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

    // Row Actions Button Component
    const RowActionsButton = ({ request }: { request: EnrichmentRequest }) => {
        const handleDelete = () => {
            if (onRequestDelete) {
                onRequestDelete();
            }
        };

        return (
            <TableActionsButton>
                <button
                    onClick={handleDelete}
                    className='w-full text-left px-4 py-2 text-sm text-red-500 border border-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors rounded-lg flex items-center gap-2'
                >
                    <Trash width='18' height='18' className='text-red-500' />
                    Delete
                </button>
            </TableActionsButton>
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
                <td className='truncate max-w-xs' title={request.title}>
                    <div className='flex items-center gap-2 min-w-0'>
                        <span className='inline-flex items-center flex-shrink-0'>
                            {getStatusIcon(request.status, errorMsg(request))}
                        </span>
                        <span className='truncate'>
                            {truncateText(request.title, 50)}
                        </span>
                    </div>
                </td>
                <td className='w-32'>{request.userDetail?.username || 'N/A'}</td>
                <td className='w-40'>
                    {request.createdAt
                        ? formatDate(new Date(request.createdAt))
                        : 'N/A'}
                </td>
                <td className='w-12 text-right'>
                    <div className='flex justify-end'>
                        <RowActionsButton request={request} />
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className='flex flex-col space-y-4'>
            {/* Compact Control Bar - Actions and Pagination */}
            <ActionBar
                left={
                    <>
                        <CollapsibleActionGroup
                            selectedCount={selectedRequests.length}
                            itemLabel='request'
                            actions={[
                                {
                                    id: 'delete',
                                    tooltip:
                                        selectedRequests.length > 0
                                            ? `Delete ${selectedRequests.length} request${selectedRequests.length > 1 ? 's' : ''}`
                                            : 'Select requests to delete',
                                    icon: <Trash width={20} height={20} />,
                                    onClick: () => {
                                        if (selectedRequests.length === 0) return;
                                        setModal(ConfirmDeletionModal, {
                                            onConfirm: onDeleteSelected,
                                            text: `Are you sure you want to delete ${selectedRequests.length} request${selectedRequests.length > 1 ? 's' : ''}? This action is irreversible.`,
                                        });
                                    },
                                    disabled:
                                        loading ||
                                        enrichmentRequests.length === 0 ||
                                        selectedRequests.length === 0,
                                    iconActive: selectedRequests.length > 0,
                                },
                                {
                                    id: 'rerun',
                                    tooltip:
                                        selectedRequests.length > 0
                                            ? `Rerun ${selectedRequests.length} enrichment${selectedRequests.length > 1 ? 's' : ''}`
                                            : 'Select requests to rerun',
                                    icon: <RefreshCircle width={20} height={20} />,
                                    onClick: onRerunSelected,
                                    disabled:
                                        loading ||
                                        enrichmentRequests.length === 0 ||
                                        selectedRequests.length === 0,
                                    iconActive: selectedRequests.length > 0,
                                },
                            ]}
                        />

                        <ActionBarDivider />

                        <ActionBarSearch
                            placeholder='Search requests...'
                            initialValue={searchFilters?.title || ''}
                            defaultExpanded={Boolean(searchFilters?.title)}
                            debounceMs={300}
                            onDebouncedChange={(value) => {
                                const event = {
                                    preventDefault: () => {},
                                    target: { name: 'title', value },
                                } as ChangeEvent<HTMLInputElement>;
                                onSearchChange(event);
                                // Some parents only fetch on submit; trigger submit on debounce too.
                                onSearchSubmit(event as any);
                            }}
                            onSubmit={(value) => {
                                const event = {
                                    preventDefault: () => {},
                                    target: { name: 'title', value },
                                } as any;
                                onSearchSubmit(event);
                            }}
                        />
                    </>
                }
                right={
                    <>
                        <Tooltip content='Create new enrichment request'>
                            <button
                                type='button'
                                onClick={onCreateRequest}
                                disabled={loading}
                                className='flex items-center gap-1.5 px-4 h-9 text-sm rounded-full border border-[#FF8C00]/30 bg-[#FF8C00]/10 text-[#FF8C00] hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                New
                            </button>
                        </Tooltip>
                    </>
                }
            />

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
                selectedIds={selectedRequests}
                setSelected={(ids) => setSelectedRequests(ids)}
            />

            <PaginationWrapper
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                disabled={enrichmentRequests.length === 0}
                selectedCount={selectedRequests.length}
                totalRows={enrichmentRequests.length}
            />
        </div>
    );
}

export default EnrichmentRequestsList;
