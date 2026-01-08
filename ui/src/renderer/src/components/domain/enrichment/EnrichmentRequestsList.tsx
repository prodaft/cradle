import { useModal } from '@/contexts/ui/ModalContext';
import { useCradleNavigate } from '@/hooks';
import { truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { ActionBar, ActionBarSearch } from '@components/base/ActionBar/ActionBar';
import { DataTable, type BulkAction } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import StatusHeaderDropdown from '@components/base/StatusHeaderDropdown/StatusHeaderDropdown';
import TableActionsButton from '@components/base/TableActionsButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
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
import { ChangeEvent, FormEvent, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';

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

    // Convert sortField and sortDirection to TanStack Table sorting state
    const sorting = useMemo<SortingState>(() => {
        const columnId = Object.keys(sortFieldMapping).find(
            (key) => sortFieldMapping[key] === sortField
        ) || sortField;
        
        return columnId ? [{
            id: columnId,
            desc: sortDirection === 'desc',
        }] : [];
    }, [sortField, sortDirection]);

    const handleSortingChange = useCallback(
        (newSorting: SortingState) => {
            if (onSort) {
                if (newSorting.length === 0) {
                    onSort('created_at', 'desc');
                } else {
                    const sort = newSorting[0];
                    const apiField = sortFieldMapping[sort.id] || sort.id;
                    onSort(apiField, sort.desc ? 'desc' : 'asc');
                }
            }
        },
        [onSort],
    );

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
                            className='text-primary'
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
                            className='text-muted-foreground'
                            width='18'
                            height='18'
                        />
                    );
                case 'error':
                    return (
                        <WarningCircleSolid
                            className='text-destructive'
                            width='18'
                            height='18'
                        />
                    );
                case 'working':
                    return (
                        <InfoCircleSolid
                            className='text-primary'
                            width='18'
                            height='18'
                        />
                    );
                default:
                    return null;
            }
        })();

        const tooltipContent = errorMessage || capitalize(status);
        const tooltipColorClass = status === 'error' ? 'bg-destructive text-destructive-foreground' : status === 'waiting' ? 'bg-accent text-accent-foreground' : '';

        if ((status === 'error' || status === 'waiting') && errorMessage) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className='inline-flex items-center align-middle flex-shrink-0'>
                            {icon}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent className={tooltipColorClass}>
                        {tooltipContent}
                    </TooltipContent>
                </Tooltip>
            );
        }

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className='inline-flex items-center align-middle flex-shrink-0'>
                        {icon}
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    {tooltipContent}
                </TooltipContent>
            </Tooltip>
        );
    };

    // Memoize columns to prevent recreation on every render
    const columns = useMemo<ColumnDef<EnrichmentRequest>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && 'indeterminate')
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                        onClick={(e) => e.stopPropagation()}
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: 'title',
                id: 'title',
                header: () => (
                    <span>Title</span>
                ),
                cell: ({ row }) => (
                    <div className='truncate max-w-xs cursor-pointer' title={row.original.title} onClick={navigateLink(`/enrichment/${row.original.id}`)}>
                        <div className='flex items-center gap-2 min-w-0'>
                            <span className='inline-flex items-center flex-shrink-0'>
                                {getStatusIcon(row.original.status, errorMsg(row.original))}
                            </span>
                            <span className='truncate'>{truncateText(row.original.title, 50)}</span>
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: 'user',
                id: 'user',
                header: ({ column }) => {
                    const filterValue = columnFilters.user as string;
                    return (
                        <div className="flex items-center gap-2">
                            <DataTableColumnHeader column={column} title="User" />
                            {filterValue && (
                                <span className='text-xs text-accent'>●</span>
                            )}
                        </div>
                    );
                },
                cell: ({ row }) => (
                    <div className='w-32'>{row.original.userDetail?.username || 'N/A'}</div>
                ),
            },
            {
                accessorKey: 'createdAt',
                id: 'createdAt',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Created At" />
                ),
                cell: ({ row }) => (
                    <div className='w-40'>
                        {row.original.createdAt
                            ? formatDate(new Date(row.original.createdAt))
                            : 'N/A'}
                    </div>
                ),
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const request = row.original;
                    const handleDelete = () => {
                        if (onRequestDelete) {
                            onRequestDelete();
                        }
                    };

                    return (
                        <div className='w-12 text-right' onClick={(e) => e.stopPropagation()}>
                            <div className='flex justify-end'>
                                <TableActionsButton>
                                    <DropdownMenuItem onClick={handleDelete} variant="destructive">
                                        <Trash width='18' height='18' />
                                        Delete
                                    </DropdownMenuItem>
                                </TableActionsButton>
                            </div>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [columnFilters, handleStatusChange, getStatusIcon, errorMsg, onRequestDelete],
    );

    // Handle row selection - convert number[] to string[]
    const handleRowSelectionChange = useCallback((selectedIds: string[]) => {
        if (setSelectedRequests) {
            setSelectedRequests(selectedIds.map(id => Number(id)));
        }
    }, [setSelectedRequests]);

    return (
        <div className='flex flex-col space-y-4'>
            {/* Compact Control Bar - Actions and Pagination */}
            <ActionBar
                left={
                    <>

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
                        <StatusHeaderDropdown
                            onStatusChange={handleStatusChange}
                            status={columnFilters.status}
                            statusOptions={['all', 'done', 'waiting', 'error', 'info']}
                        />
                    </>
                }
            />

            {/* Table */}
            <DataTable
                columns={columns}
                data={enrichmentRequests}
                loading={loading}
                emptyMessage='No enrichment requests found'
                enableRowSelection={true}
                selectedRows={selectedRequests.map(id => String(id))}
                onRowSelectionChange={handleRowSelectionChange}
                sorting={sorting}
                onSortingChange={handleSortingChange}
                manualPagination={true}
                manualSorting={true}
                bulkActions={[
                    {
                        id: 'delete',
                        label: 'Delete requests',
                        icon: <Trash width={18} height={18} />,
                        onClick: () => {
                            if (selectedRequests.length === 0) return;
                            setModal(ConfirmDeletionModal, {
                                onConfirm: onDeleteSelected,
                                text: `Are you sure you want to delete ${selectedRequests.length} request${selectedRequests.length > 1 ? 's' : ''}? This action is irreversible.`,
                            });
                        },
                        disabled: loading || enrichmentRequests.length === 0 || selectedRequests.length === 0,
                        variant: 'destructive',
                    },
                    {
                        id: 'rerun',
                        label: 'Rerun enrichments',
                        icon: <RefreshCircle width={18} height={18} />,
                        onClick: onRerunSelected,
                        disabled: loading || enrichmentRequests.length === 0 || selectedRequests.length === 0,
                    },
                ]}
                itemLabel="request"
                onRowClick={(request) => navigateLink(`/enrichment/${request.id}`)()}
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
