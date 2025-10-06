import { Trash } from 'iconoir-react';
import React from 'react';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { deleteDigest } from '../../services/intelioService/intelioService';
import { truncateText } from '../../utils/dashboardUtils/dashboardUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';
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
        { key: 'status', label: 'Status' },
        { key: 'title', label: 'Title' },
        { key: 'type', label: 'Type' },
        { key: 'createdAt', label: 'Created At' },
        { key: 'user', label: 'User' },
        { key: 'warnings', label: 'Warnings' },
        { key: 'errors', label: 'Errors' },
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
            <td className='truncate w-24' title={digest.display_name}>
                {truncateText(digest.display_name, 24)}
            </td>
            <td className='w-36'>{formatDate(new Date(digest.created_at))}</td>
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
            <td className='w-8'>
                <button
                    title='Delete Digest'
                    className='btn btn-ghost btn-xs text-red-600 hover:text-red-500 transition-colors p-1'
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

    const [selectedAction, setSelectedAction] = React.useState('');
    const [isApplyingAction, setIsApplyingAction] = React.useState(false);

    const handleApplyAction = async () => {
        if (!selectedAction || selectedDigests.length === 0) return;

        setIsApplyingAction(true);

        // Dummy async function
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setIsApplyingAction(false);
        console.log('Applied action:', selectedAction, 'to digests:', selectedDigests);
    };

    const actionBar = (
        <div className='flex items-center gap-3'>
            <select
                className='select select-sm select-bordered w-48'
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                disabled={selectedDigests.length === 0}
            >
                <option value=''>Select action...</option>
                <option value='delete'>Delete</option>
                <option value='export'>Export</option>
            </select>
            <span className='text-sm text-gray-600 dark:text-gray-400'>
                {selectedDigests.length} row{selectedDigests.length !== 1 ? 's' : ''} selected
            </span>
            <button
                className='btn btn-sm btn-primary'
                onClick={handleApplyAction}
                disabled={!selectedAction || selectedDigests.length === 0 || isApplyingAction}
            >
                {isApplyingAction ? (
                    <>
                        <span className='loading loading-spinner loading-sm'></span>
                        Applying...
                    </>
                ) : (
                    'Apply'
                )}
            </button>
        </div>
    );

    return (
        <>
            {!loading && digests.length > 0 && (
                <div className='flex items-center justify-between gap-4'>
                    <div className='flex-1'>{actionBar}</div>
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

            {!loading && digests.length > 0 && (
                <div className='flex items-center justify-between gap-4'>
                    <div className='flex-1'>{actionBar}</div>
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
        </>
    );
}

export default DigestList;
