import { useModal } from '@/contexts/ui/ModalContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import type { Alert, StateSetter } from '@/types';
import { truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import TableCard from '@components/base/Card/TableCard';
import ListView, { DateRangeFilter } from '@components/base/ListView/ListView';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import Tooltip from '@components/base/Tooltip/Tooltip';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import type { BaseDigest } from '@services/cradle/models';
import { Search, Trash, Xmark } from 'iconoir-react';
import React, { useEffect, useRef, useState } from 'react';

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
    selectedDigests = [],
    setSelectedDigests = () => { },
    pageSize = 10,
    setPageSize = () => { },
    onColumnFilterChange = null,
    columnFilters = {},
    searchFilters = {},
    onSearchChange = () => { },
    onSearchSubmit = () => { },
}: DigestListProps) {
    const { setModal } = useModal();
    const { intelioApi } = useApi();
    const { executor } = useAPICall();
    const [isSearchExpanded, setIsSearchExpanded] = useState(!!searchFilters.title);
    const [searchQuery, setSearchQuery] = useState(searchFilters.title || '');
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isSearchExpanded && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchExpanded]);

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

    const columns: Array<{ key: string; label: string; filterType?: 'text' | 'date' }> =
        [
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'title', label: 'Title' },
            { key: 'user', label: 'User', filterType: 'text' as const },
            { key: 'warnings', label: 'Warnings' },
            { key: 'errors', label: 'Errors' },
            { key: 'createdAt', label: 'Created At', filterType: 'date' as const },
            { key: 'actions', label: 'Actions' },
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
                <td className='truncate w-24' title={digest.displayName}>
                    {truncateText(digest.displayName || '', 24)}
                </td>
                <td className='w-16'>
                    <span
                        className={getStatusBadgeClasses(digest.status || '')}
                    >
                        {digest.status
                            ? digest.status.charAt(0).toUpperCase() +
                            digest.status.slice(1)
                            : ''}
                    </span>
                </td>
                <td className='truncate max-w-xs' title={digest.title}>
                    {digest.title}
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
                <td className='w-8'>
                    <button
                        title='Delete Digest'
                        className='btn btn-ghost btn-xs text-red-600 hover:text-red-500  p-1'
                        onClick={() =>
                            setModal(ConfirmDeletionModal, {
                                text: 'Are you sure you want to delete this digest?',
                                onConfirm: () => handleDelete(digest.id!),
                            })
                        }
                    >
                        <Trash className='w-4 h-4' />
                    </button>
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

    const handleSearchSubmit = () => {
        const event = {
            target: { name: 'title', value: searchQuery },
        } as React.ChangeEvent<HTMLInputElement>;
        onSearchChange(event);
        if (onSearchSubmit) {
            onSearchSubmit(event);
        }
    };

    return (
        <>
            {!loading && (
                <TableCard>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
                        {/* Left: Actions */}
                        <div className='flex items-center gap-2 flex-shrink-0'>
                            <button
                                onClick={() => handleDeleteSelected(selectedDigests)}
                                disabled={digests.length === 0 || selectedDigests.length === 0}
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
                                            const event = {
                                                target: { name: 'title', value: e.target.value },
                                            } as React.ChangeEvent<HTMLInputElement>;
                                            onSearchChange(event);
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
                                        placeholder='Search by title...'
                                        className='flex-grow bg-transparent text-sm outline-none text-cradle-text-primary placeholder:text-cradle-text-muted rounded-none font-mono'
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => {
                                                setSearchQuery('');
                                                const event = {
                                                    target: { name: 'title', value: '' },
                                                } as React.ChangeEvent<HTMLInputElement>;
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
                            onPageSizeChange={(newSize) => {
                                setPageSize(newSize);
                                handlePageChange(1);
                            }}
                            disabled={digests.length === 0}
                        />
                    </div>
                </TableCard>
            )}

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
                setSelected={(ids) =>
                    setSelectedDigests(
                        ids.filter((id): id is string => typeof id === 'string'),
                    )
                }
                filterableColumns={filterableColumns}
                filterValues={columnFilters}
            />
        </>
    );
}

export default DigestList;
