import { Trash } from 'iconoir-react';
import React from 'react';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { deleteDigest } from '../../services/intelioService/intelioService';
import { truncateText } from '../../utils/dashboardUtils/dashboardUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import ActionBar from '../ActionBar/ActionBar';
import ActionsTable from '../ActionsTable/ActionsTable';
import TableCard from '../TableCard/TableCard';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';
import ListView from '../ListView/ListView';
import Pagination from '../Pagination/Pagination';
import PaginationWrapper from '../PaginationWrapper/PaginationWrapper';
import DigestCard from './DigestCard';

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
    setSelectedDigests = () => {},
    pageSize = 10,
    setPageSize = () => {},
    onColumnFilterChange = null,
    columnFilters = {},
    searchFilters = {},
    onSearchChange = () => {},
    onSearchSubmit = () => {},
}) {
    const { setModal } = useModal();

    // Mapping of table columns to API field names
    const sortFieldMapping = {
        title: 'title',
        type: 'digest_type',
        createdAt: 'created_at',
        user: 'user__username',
    };

    const handleDelete = async (digestId) => {
        try {
            await deleteDigest(digestId);
            setAlert({
                show: true,
                message: 'Digest deleted successfully',
                color: 'green',
            });
            if (onDigestDelete) onDigestDelete();
        } catch (error) {
            console.error('Delete digest failed:', error);
            setAlert({ show: true, message: 'Failed to delete digest', color: 'red' });
        }
    };

    const columns = [
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'title', label: 'Title' },
        { key: 'user', label: 'User', filterType: 'text' },
        { key: 'warnings', label: 'Warnings' },
        { key: 'errors', label: 'Errors' },
        { key: 'createdAt', label: 'Created At', filterType: 'date' },
        { key: 'actions', label: 'Actions' },
    ];

    // Define filterable columns with their handlers
    const filterableColumns = onColumnFilterChange ? {
        user: (value) => onColumnFilterChange('user', value),
        createdAt: (value) => onColumnFilterChange('createdAt', value),
    } : {};

    const renderRow = (digest, index, selectProps = {}) => {
        const { enableMultiSelect, isSelected, onSelect } = selectProps;

        return (
            <tr key={digest.id}>
                {enableMultiSelect && (
                    <td className='w-12' onClick={(e) => e.stopPropagation()}>
                        <input
                            type='checkbox'
                            className='cradle-checkbox'
                            checked={isSelected}
                            onChange={onSelect}
                        />
                    </td>
                )}
            <td className='truncate w-24' title={digest.display_name}>
                {truncateText(digest.display_name, 24)}
            </td>
            <td className='w-16'>
                <span
                    className={`badge ${
                        digest.status === 'done'
                            ? 'badge-success'
                            : digest.status === 'error'
                              ? 'badge-error'
                              : 'badge-secondary'
                    }`}
                >
                    {digest.status.charAt(0).toUpperCase() + digest.status.slice(1)}
                </span>
            </td>
            <td className='truncate max-w-xs' title={digest.title}>
                {digest.title}
            </td>
            <td className='truncate w-32' title={digest.user_detail.username}>
                {truncateText(digest.user_detail.username, 16)}
            </td>
            <td className='w-8'>
                <span
                    className={`badge badge-warning ${digest.warnings?.length > 0 ? 'tooltip tooltip-left tooltip-warning' : ''}`}
                    data-tooltip={
                        digest.warnings?.length > 0
                            ? digest.warnings.slice(0, 10).join('\n') +
                              (digest.warnings.length > 10 ? '\n...' : '')
                            : undefined
                    }
                >
                    {digest.warnings?.length || 0}
                </span>
            </td>
            <td className='w-8'>
                <span
                    className={`badge badge-error ${digest.errors?.length > 0 ? 'tooltip tooltip-left tooltip-error' : ''}`}
                    data-tooltip={
                        digest.errors?.length > 0
                            ? digest.errors.slice(0, 10).join(', ') +
                              (digest.errors.length > 10 ? ', ...' : '')
                            : undefined
                    }
                >
                    {digest.errors?.length || 0}
                </span>
            </td>
            <td className='w-36'>{formatDate(new Date(digest.created_at))}</td>
            <td className='w-8'>
                <button
                    title='Delete Digest'
                    className='btn btn-ghost btn-xs text-red-600 hover:text-red-500  p-1'
                    onClick={() =>
                        setModal(ConfirmDeletionModal, {
                            title: 'Delete Digest',
                            message: 'Are you sure you want to delete this digest?',
                            onConfirm: () => handleDelete(digest.id),
                        })
                    }
                >
                    <Trash className='w-4 h-4' />
                </button>
            </td>
        </tr>
        );
    };

    const renderCard = (digest) => (
        <DigestCard
            key={digest.id}
            localDigest={digest}
            setAlert={setAlert}
            onDelete={onDigestDelete}
        />
    );

    // Define actions for the ActionBar
    const actions = [
        {
            value: 'delete',
            label: 'Delete',
            handler: async (selectedIds) => {
                setModal(ConfirmDeletionModal, {
                    onConfirm: async () => {
                        try {
                            // Send all delete requests in parallel
                            const deletePromises = selectedIds.map(id => deleteDigest(id));
                            const results = await Promise.allSettled(deletePromises);

                            // Count successes and failures
                            const successes = results.filter(r => r.status === 'fulfilled').length;
                            const failures = results.filter(r => r.status === 'rejected').length;

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
            },
        },
    ];

    // Search component for the actions bar
    const searchComponent = (
        <div className='flex items-stretch gap-2 min-w-[280px]'>
            <div className='relative flex-1'>
                <input
                    type='text'
                    name='title'
                    placeholder='Search by title'
                    className='cradle-search text-sm py-2 px-3 w-full pr-8 h-full'
                    value={searchFilters.title || ''}
                    onChange={onSearchChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && onSearchSubmit) {
                            onSearchSubmit(e);
                        }
                    }}
                />
                {searchFilters.title && (
                    <button
                        onClick={() => {
                            const event = { target: { name: 'title', value: '' } };
                            onSearchChange(event);
                            if (onSearchSubmit) {
                                onSearchSubmit(event);
                            }
                        }}
                        className='absolute right-2 top-1/2 -translate-y-1/2 p-1 cradle-btn cradle-btn-secondary rounded'
                        title='Clear search'
                    >
                        <svg className='w-4 h-4 cradle-text-tertiary' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                )}
            </div>
            <button
                onClick={onSearchSubmit}
                className='cradle-btn cradle-btn-secondary px-3 py-2 hover:cradle-bg-secondary rounded flex items-center justify-center'
                title='Search'
            >
                <svg width="1.5em" height="1.5em" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor" className='w-4 h-4'>
                    <path d="M17 17L21 21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M3 11C3 15.4183 6.58172 19 11 19C13.213 19 15.2161 18.1015 16.6644 16.6493C18.1077 15.2022 19 13.2053 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            </button>
        </div>
    );

    return (
        <>
            {!loading && (
                <TableCard>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
                        {/* Left: Actions and Search */}
                        <div className='flex items-center gap-4 flex-shrink-0'>
                            <ActionsTable
                                actions={actions}
                                selectedItems={selectedDigests}
                                itemLabel='row'
                                disabled={digests.length === 0}
                            />
                            {searchComponent}
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
                renderCard={renderCard}
                loading={loading}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                sortFieldMapping={sortFieldMapping}
                emptyMessage="No digests found!"
                tableClassName="table table-zebra"
                enableMultiSelect={true}
                setSelected={setSelectedDigests}
                filterableColumns={filterableColumns}
                filterValues={columnFilters}
            />
        </>
    );
}

export default DigestList;
