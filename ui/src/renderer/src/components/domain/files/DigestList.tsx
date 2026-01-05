import { useModal } from '@/contexts/ui/ModalContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import type { Alert, StateSetter } from '@/types';
import { truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { ActionBar, ActionBarDivider, ActionBarSearch, CollapsibleActionGroup } from '@components/base/ActionBar/ActionBar';
import ListView, { DateRangeFilter } from '@components/base/ListView/ListView';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import StatusHeaderDropdown from '@components/base/StatusHeaderDropdown/StatusHeaderDropdown';
import Tooltip from '@components/base/Tooltip/Tooltip';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import UploadDigestModal from '@components/modals/files/UploadDigestModal';
import type { BaseDigest } from '@services/cradle/models';
import { InfoCircleSolid, PlusCircle, Trash, WarningCircleSolid, WarningTriangleSolid } from 'iconoir-react';
import React, { useMemo, useState } from 'react';

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
    setPageSize = () => { },
    onColumnFilterChange = null,
    columnFilters = {},
    searchFilters = {},
    onSearchChange = () => { },
    onSearchSubmit = () => { },
    dataTypeOptions = [],
    onUpload,
}: DigestListProps) {
    const { setModal } = useModal();
    const { intelioApi } = useApi();
    const { executor } = useAPICall();

    // Internal state for selection when no external state is provided
    const [internalSelectedDigests, setInternalSelectedDigests] = useState<string[]>([]);

    // Use external state if provided, otherwise use internal state
    const selectedDigests = externalSelectedDigests ?? internalSelectedDigests;
    const setSelectedDigests = useMemo(
        () => externalSetSelectedDigests ?? setInternalSelectedDigests,
        [externalSetSelectedDigests]
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

    const columns: Array<{ key: string; label: string | React.ReactNode; filterType?: 'text' | 'date'; sortable?: boolean }> =
        [
            {
                key: 'title',
                label: (
                    <div className='flex items-center gap-2'>
                        <StatusHeaderDropdown
                            onStatusChange={handleStatusChange}
                            status={columnFilters.status || 'all'}
                            statusOptions={['all', 'done', 'working', 'error']}
                        />
                        <span>Title</span>
                    </div>
                ),
            },
            {
                key: 'type',
                label: 'Type',
            },
            { key: 'user', label: 'User', filterType: 'text' as const },
            { key: 'warnings', label: 'Warnings' },
            { key: 'errors', label: 'Errors' },
            { key: 'createdAt', label: 'Created At', filterType: 'date' as const },
            { key: 'actions', label: '', sortable: false },
        ];

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
                    return <InfoCircleSolid className='text-blue-500' width='18' height='18' />;
                default:
                    return null;
            }
        })();

        const statusCapitalized = status.charAt(0).toUpperCase() + status.slice(1);
        const tooltipContent = errorMessage || statusCapitalized;
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
        digest: BaseDigest,
        index: number,
        selectProps: SelectProps = {},
    ) => {
        const { enableMultiSelect, isSelected, onSelect } = selectProps;

        return (
            <tr key={digest.id}>
                {enableMultiSelect && (
                    <td className='w-12' onClick={(e) => e.stopPropagation()}>
                        <div className='flex items-center'>
                            <input
                                type='checkbox'
                                className='cradle-checkbox'
                                checked={isSelected}
                                onChange={onSelect}
                            />
                        </div>
                    </td>
                )}
                <td className='truncate max-w-xs' title={digest.title}>
                    <div className='flex items-center gap-2 min-w-0'>
                        <span className='inline-flex items-center flex-shrink-0'>
                            {getStatusIcon(digest.status, (digest as any).errorMessage)}
                        </span>
                        <span className='truncate'>{digest.title}</span>
                    </div>
                </td>
                <td className='truncate w-24' title={digest.displayName}>
                    {truncateText(digest.displayName || '', 24)}
                </td>
                <td className='truncate w-32' title={digest.userDetail?.username}>
                    {truncateText(digest.userDetail?.username || '', 16)}
                </td>
                <td className='w-8'>
                    <Tooltip
                        content={
                            digest.warnings?.length > 0
                                ? digest.warnings.slice(0, 10).join('\n') +
                                (digest.warnings.length > 10 ? '...' : '')
                                : undefined
                        }
                        side='left'
                        color='warning'
                    >
                        <span
                            className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white shadow-sm bg-yellow-600'
                        >
                            {digest.warnings?.length || 0}
                        </span>
                    </Tooltip>
                </td>
                <td className='w-8'>
                    <Tooltip
                        content={
                            digest.errors?.length > 0
                                ? digest.errors.slice(0, 10).join('\n') +
                                (digest.errors.length > 10 ? '\n...' : '')
                                : undefined
                        }
                        side='left'
                        color='error'
                    >
                        <span
                            className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white shadow-sm bg-red-600'
                        >
                            {digest.errors?.length || 0}
                        </span>
                    </Tooltip>
                </td>
                <td className='w-36'>
                    {digest.createdAt ? formatDate(digest.createdAt) : 'N/A'}
                </td>
                <td className='w-8 text-right'>
                    <div className='flex justify-end'>
                    <Tooltip content='Delete Digest'>
                        <button
                            className='btn btn-ghost btn-xs text-red-600 hover:text-red-500  p-1'
                            onClick={() =>
                                setModal(ConfirmDeletionModal, {
                                    text: 'Are you sure you want to delete this digest?',
                                    onConfirm: () => handleDelete(digest.id!),
                                })
                            }
                        >
                            <Trash width='18' height='18' />
                        </button>
                    </Tooltip>
                    </div>
                </td>
            </tr>
        );
    };

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
                        message:
                            'An unexpected error occurred while deleting digests',
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
                        <CollapsibleActionGroup
                            selectedCount={selectedDigests.length}
                            itemLabel='digest'
                            actions={[
                                {
                                    id: 'delete',
                                    tooltip: selectedDigests.length > 0
                                        ? `Delete ${selectedDigests.length} digest${selectedDigests.length > 1 ? 's' : ''}`
                                        : 'Select digests to delete',
                                    icon: <Trash width={20} height={20} />,
                                    onClick: () => handleDeleteSelected(selectedDigests),
                                    disabled: loading || digests.length === 0 || selectedDigests.length === 0,
                                    iconActive: selectedDigests.length > 0,

                                },
                            ]}
                        />

                        <ActionBarDivider />

                        <ActionBarSearch
                            placeholder='Search by title...'
                            initialValue={searchFilters.title || ''}
                            defaultExpanded={Boolean(searchFilters.title)}
                            debounceMs={300}
                            onDebouncedChange={(value) => {
                                const event = {
                                    preventDefault: () => { },
                                    target: { name: 'title', value },
                                } as React.ChangeEvent<HTMLInputElement>;
                                onSearchChange(event);
                            }}
                            onSubmit={(value) => {
                                const event = {
                                    preventDefault: () => { },
                                    target: { name: 'title', value },
                                } as any;
                                onSearchSubmit(event);
                            }}
                        />
                    </>
                }
                right={
                    <>
                        <Tooltip content='Upload new digest'>
                            <button
                                type='button'
                                onClick={() => {
                                    setModal(UploadDigestModal, {
                                        dataTypeOptions,
                                        onUpload: onUpload || onDigestDelete,
                                    });
                                }}
                                disabled={loading}
                                className='flex items-center gap-1.5 px-4 h-9 text-sm rounded-full border border-[#FF8C00]/30 bg-[#FF8C00]/10 text-[#FF8C00] hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                New
                            </button>
                        </Tooltip>
                    </>
                }
            />

            <ListView
                data={digests}
                columns={columns}
                renderRow={renderRow}
                loading={loading}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                sortFieldMapping={sortFieldMapping}
                emptyMessage='No digests found!'
                tableClassName='table table-zebra'
                enableMultiSelect={true}
                selectedIds={selectedDigests}
                setSelected={(ids) =>
                    setSelectedDigests(
                        ids.filter((id): id is string => typeof id === 'string'),
                    )
                }
                filterableColumns={filterableColumns}
                filterValues={columnFilters}
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
