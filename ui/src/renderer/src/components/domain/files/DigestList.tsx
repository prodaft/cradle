import { useModal } from '@/contexts/ui/ModalContext';
import { Button } from '@/components/ui/button';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import type { Alert, StateSetter } from '@/types';
import { truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { ActionBar, ActionBarSearch } from '@components/base/ActionBar/ActionBar';
import { DataTable, type BulkAction } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DateRangeFilter } from '@components/base/ListView/types';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import StatusHeaderDropdown from '@components/base/StatusHeaderDropdown/StatusHeaderDropdown';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import type { BaseDigest } from '@services/cradle/models';
import { InfoCircleSolid, PlusCircle, Trash, WarningCircleSolid, WarningTriangleSolid } from 'iconoir-react';
import React, { useCallback, useMemo, useState } from 'react';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';

interface DataTypeOption {
    value: string;
    label: string;
    inferEntities: boolean;
}

interface DigestListProps {
    digests: BaseDigest[];
    loading: boolean;
    page: number;
    totalPages: number;
    handlePageChange: (page: number) => void;
    setAlert: StateSetter<Alert>;
    onDigestDelete?: () => void;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    onSort: (field: string, direction: 'asc' | 'desc') => void;
    selectedDigests?: string[];
    setSelectedDigests?: StateSetter<string[]>;
    pageSize?: number;
    setPageSize?: (size: number) => void;
    onColumnFilterChange?:
        | ((column: string, value: string | DateRangeFilter) => void)
        | null;
    columnFilters?: Record<string, any>;
    searchFilters?: Record<string, string>;
    onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSearchSubmit?: (e: React.FormEvent | React.MouseEvent) => void;
    dataTypeOptions?: DataTypeOption[];
    onUpload?: () => void;
}

function DigestList({
    digests,
    loading,
    page,
    totalPages,
    handlePageChange,
    setAlert,
    onDigestDelete,
    sortField = 'created_at',
    sortDirection = 'desc',
    onSort,
    selectedDigests: externalSelectedDigests,
    setSelectedDigests: externalSetSelectedDigests,
    pageSize = 10,
    setPageSize = () => {},
    onColumnFilterChange = null,
    columnFilters = {},
    searchFilters = {},
    onSearchChange = () => {},
    onSearchSubmit = () => {},
    dataTypeOptions = [],
    onUpload,
}: DigestListProps) {
    const { setModal } = useModal();
    const { intelioApi } = useApi();
    const { executor } = useAPICall();

    // Internal state for selection when no external state is provided
    const [internalSelectedDigests, setInternalSelectedDigests] = useState<string[]>(
        [],
    );

    // Use external state if provided, otherwise use internal state
    const selectedDigests = externalSelectedDigests ?? internalSelectedDigests;
    const setSelectedDigests = useMemo(
        () => externalSetSelectedDigests ?? setInternalSelectedDigests,
        [externalSetSelectedDigests],
    );

    // Mapping of table columns to API field names
    const sortFieldMapping: Record<string, string> = {
        title: 'title',
        type: 'digest_type',
        createdAt: 'created_at',
        user: 'user__username',
    };

    const handleDelete = executor(
        async (digestId: string) => {
            await intelioApi.intelioDigestDestroy({ id: digestId });
            setAlert({
                show: true,
                message: 'Digest deleted successfully',
                color: 'green',
            });
            if (onDigestDelete) onDigestDelete();
        },
        {
            onError: (error) => {
                console.error('Delete digest failed:', error);
                setAlert({
                    show: true,
                    message: 'Failed to delete digest',
                    color: 'red',
                });
            },
        },
    );

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
            if (newSorting.length === 0) {
                onSort('created_at', 'desc');
            } else {
                const sort = newSorting[0];
                const apiField = sortFieldMapping[sort.id] || sort.id;
                onSort(apiField, sort.desc ? 'desc' : 'asc');
            }
        },
        [onSort],
    );

    // Define filterable columns with their handlers
    const filterableColumns: Record<string, (value: string | DateRangeFilter) => void> =
        onColumnFilterChange
            ? {
                  user: (value) => {
                      if (typeof value === 'string') {
                          onColumnFilterChange('user', value);
                      }
                  },
                  createdAt: (value) => {
                      if (typeof value !== 'string') {
                          onColumnFilterChange('createdAt', value);
                      }
                  },
              }
            : {};

    interface SelectProps {
        enableMultiSelect?: boolean;
        isSelected?: boolean;
        onSelect?: () => void;
    }

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

        const statusCapitalized = status.charAt(0).toUpperCase() + status.slice(1);
        const tooltipContent = errorMessage || statusCapitalized;
        const tooltipColorClass = status === 'error' ? 'bg-red-500 text-white' : status === 'waiting' ? 'bg-yellow-500 text-white' : '';

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
    const columns = useMemo<ColumnDef<BaseDigest>[]>(
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
                    <div className='truncate max-w-xs' title={row.original.title}>
                        <div className='flex items-center gap-2 min-w-0'>
                            <span className='inline-flex items-center flex-shrink-0'>
                                {getStatusIcon(row.original.status, (row.original as any).errorMessage)}
                            </span>
                            <span className='truncate'>{row.original.title}</span>
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: 'type',
                id: 'type',
                header: 'Type',
                cell: ({ row }) => (
                    <div className='truncate w-24' title={row.original.displayName}>
                        {truncateText(row.original.displayName || '', 24)}
                    </div>
                ),
                enableSorting: false,
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
                                <span className='text-xs text-orange-600 dark:text-orange-400'>●</span>
                            )}
                        </div>
                    );
                },
                cell: ({ row }) => (
                    <div className='truncate w-32' title={row.original.userDetail?.username}>
                        {truncateText(row.original.userDetail?.username || '', 16)}
                    </div>
                ),
            },
            {
                accessorKey: 'warnings',
                id: 'warnings',
                header: 'Warnings',
                cell: ({ row }) => (
                    <div className='w-8'>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span
                                    className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white shadow-sm bg-yellow-600'
                                >
                                    {row.original.warnings?.length || 0}
                                </span>
                            </TooltipTrigger>
                            {row.original.warnings?.length > 0 && (
                                <TooltipContent side='left' className='bg-yellow-500 text-white'>
                                    {row.original.warnings.slice(0, 10).join('\n') +
                                        (row.original.warnings.length > 10 ? '...' : '')}
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'errors',
                id: 'errors',
                header: 'Errors',
                cell: ({ row }) => (
                    <div className='w-8'>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span
                                    className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white shadow-sm bg-red-600'
                                >
                                    {row.original.errors?.length || 0}
                                </span>
                            </TooltipTrigger>
                            {row.original.errors?.length > 0 && (
                                <TooltipContent side='left' className='bg-red-500 text-white'>
                                    {row.original.errors.slice(0, 10).join('\n') +
                                        (row.original.errors.length > 10 ? '\n...' : '')}
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'createdAt',
                id: 'createdAt',
                header: ({ column }) => {
                    const filterValue = columnFilters.createdAt as DateRangeFilter;
                    return (
                        <div className="flex items-center gap-2">
                            <DataTableColumnHeader column={column} title="Created At" />
                            {(filterValue?.from && filterValue?.to) && (
                                <span className='text-xs text-orange-600 dark:text-orange-400'>●</span>
                            )}
                        </div>
                    );
                },
                cell: ({ row }) => (
                    <div className='w-36'>
                        {row.original.createdAt ? formatDate(row.original.createdAt) : 'N/A'}
                    </div>
                ),
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const digest = row.original;
                    return (
                        <div className='w-8 text-right' onClick={(e) => e.stopPropagation()}>
                            <div className='flex justify-end'>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant='ghost'
                                            size='icon-sm'
                                            className='text-red-600 hover:text-red-500 p-1'
                                            onClick={() =>
                                                setModal(ConfirmDeletionModal, {
                                                    text: 'Are you sure you want to delete this digest?',
                                                    onConfirm: () => handleDelete(digest.id!),
                                                })
                                            }
                                        >
                                            <Trash width='18' height='18' />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Delete Digest
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [columnFilters, handleStatusChange, getStatusIcon, setModal, handleDelete],
    );

    // Handle row selection
    const handleRowSelectionChange = useCallback((selectedIds: string[]) => {
        setSelectedDigests(selectedIds);
    }, [setSelectedDigests]);

    const handleDeleteSelected = async (selectedIds: string[]) => {
        setModal(ConfirmDeletionModal, {
            onConfirm: async () => {
                try {
                    // Send all delete requests in parallel
                    const deletePromises = selectedIds.map((id) =>
                        intelioApi.intelioDigestDestroy({ id }),
                    );
                    const results = await Promise.allSettled(deletePromises);

                    // Count successes and failures
                    const successes = results.filter(
                        (r) => r.status === 'fulfilled',
                    ).length;
                    const failures = results.filter(
                        (r) => r.status === 'rejected',
                    ).length;

                    if (failures === 0) {
                        setAlert({
                            show: true,
                            color: 'green',
                            message: `Successfully deleted ${successes} digest${successes > 1 ? 's' : ''}`,
                        });
                    } else if (successes === 0) {
                        setAlert({
                            show: true,
                            color: 'red',
                            message: `Failed to delete ${failures} digest${failures > 1 ? 's' : ''}`,
                        });
                    } else {
                        setAlert({
                            show: true,
                            color: 'amber',
                            message: `Deleted ${successes} digest${successes > 1 ? 's' : ''}, ${failures} failed`,
                        });
                    }

                    // Refresh the digests list
                    setSelectedDigests([]);
                    if (onDigestDelete) onDigestDelete();
                } catch (error) {
                    setAlert({
                        show: true,
                        color: 'red',
                        message: 'An unexpected error occurred while deleting digests',
                    });
                }
            },
            text: `Are you sure you want to delete ${selectedIds.length} digest${selectedIds.length > 1 ? 's' : ''}? This action is irreversible.`,
        });
    };

    return (
        <>
            <ActionBar
                left={
                    <>

                        <ActionBarSearch
                            placeholder='Search by title...'
                            initialValue={searchFilters.title || ''}
                            defaultExpanded={Boolean(searchFilters.title)}
                            debounceMs={300}
                            onDebouncedChange={(value) => {
                                const event = {
                                    preventDefault: () => {},
                                    target: { name: 'title', value },
                                } as React.ChangeEvent<HTMLInputElement>;
                                onSearchChange(event);
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
                            status={columnFilters.status || 'all'}
                            statusOptions={['all', 'done', 'working', 'error']}
                        />
                    </>
                }
            />

            <DataTable
                columns={columns}
                data={digests}
                loading={loading}
                emptyMessage='No digests found!'
                enableRowSelection={true}
                selectedRows={selectedDigests}
                onRowSelectionChange={handleRowSelectionChange}
                sorting={sorting}
                onSortingChange={handleSortingChange}
                manualPagination={true}
                bulkActions={[
                    {
                        id: 'delete',
                        label: 'Delete digests',
                        icon: <Trash width={18} height={18} />,
                        onClick: () => handleDeleteSelected(selectedDigests),
                        disabled: loading || digests.length === 0 || selectedDigests.length === 0,
                        variant: 'destructive',
                    },
                ]}
                itemLabel="digest"
                manualSorting={true}
            />

            <PaginationWrapper
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    handlePageChange(1);
                }}
                disabled={digests.length === 0}
                selectedCount={selectedDigests.length}
                totalRows={digests.length}
            />
        </>
    );
}

export default DigestList;
