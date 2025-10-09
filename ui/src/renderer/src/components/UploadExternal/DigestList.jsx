import { Trash } from 'iconoir-react';
import React from 'react';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { deleteDigest } from '../../services/intelioService/intelioService';
import { truncateText } from '../../utils/dashboardUtils/dashboardUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import ActionBar from '../ActionBar/ActionBar';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';
import ListView from '../ListView/ListView';
import Pagination from '../Pagination/Pagination';
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
        { key: 'user', label: 'User' },
        { key: 'warnings', label: 'Warnings' },
        { key: 'errors', label: 'Errors' },
        { key: 'createdAt', label: 'Created At' },
        { key: 'actions', label: 'Actions' },
    ];

    const renderRow = (digest, index, selectProps = {}) => {
        const { enableMultiSelect, isSelected, onSelect } = selectProps;

        return (
            <tr key={digest.id}>
                {enableMultiSelect && (
                    <td className='w-12' onClick={(e) => e.stopPropagation()}>
                        <input
                            type='checkbox'
                            className='checkbox checkbox-sm'
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

    return (
        <>
            {!loading && digests.length > 0 && (
                <div className='flex items-center justify-between gap-4'>
                    <div className='flex-1'>
                        <ActionBar
                            actions={actions}
                            selectedItems={selectedDigests}
                            itemLabel='row'
                        />
                    </div>
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        pageSize={pageSize}
                        onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            handlePageChange(1);
                        }}
                    />
                    <div className='flex-1'></div>
                </div>
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
            />
        </>
    );
}

export default DigestList;
