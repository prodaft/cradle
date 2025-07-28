import { Sort, SortDown, SortUp, Trash } from 'iconoir-react';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import { deleteDigest } from '../../services/intelioService/intelioService';
import { truncateText } from '../../utils/dashboardUtils/dashboardUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';
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
}) {
    const { profile } = useProfile();
    const { setModal } = useModal();

    // Mapping of table columns to API field names
    const sortFieldMapping = {
        title: 'title',
        type: 'digest_type',
        createdAt: 'created_at',
        user: 'user__username',
    };

    const handleSort = (column) => {
        const newSortField = sortFieldMapping[column];
        if (!newSortField || !onSort) return;

        if (sortField === newSortField) {
            // Toggle direction if same field
            const newDirection = sortDirection === 'desc' ? 'asc' : 'desc';
            onSort(newSortField, newDirection);
        } else {
            // New field, default to descending for timestamp fields, ascending for others
            const newDirection = newSortField.includes('created_at') ? 'desc' : 'asc';
            onSort(newSortField, newDirection);
        }
    };

    const getSortIcon = (column, className) => {
        const fieldName = sortFieldMapping[column];
        if (!fieldName || sortField !== fieldName) {
            return <Sort className={className} />;
        }

        return sortDirection === 'desc' ? (
            <SortDown className={className} />
        ) : (
            <SortUp className={className} />
        );
    };

    const SortableTableHeader = ({ column, children, className = '' }) => (
        <th
            className={`cursor-pointer select-none ${className}`}
            onClick={() => handleSort(column)}
        >
            <div className='flex items-center justify-between !border-b-0 !border-t-0'>
                <span className='!border-b-0 !border-t-0'>{children}</span>
                {getSortIcon(
                    column,
                    'w-4 h-4 text-zinc-600 dark:text-zinc-400 !border-b-0 !border-t-0',
                )}
            </div>
        </th>
    );

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
    if (loading) {
        return (
            <div className='flex justify-center w-full pt-4'>
                <div className='spinner-dot-pulse spinner-xl'>
                    <div className='spinner-pulse-dot'></div>
                </div>
            </div>
        );
    }

    if (digests.length === 0) {
        return (
            <div className='flex justify-center w-full'>
                <p className='text-gray-400'>No digests found!</p>
            </div>
        );
    }

    return (
        <>
            {profile?.compact_mode ? (
                <div className='overflow-x-auto w-full'>
                    <table className='table table-zebra'>
                        <thead className=''>
                            <tr>
                                <th>Status</th>
                                <SortableTableHeader column='title'>
                                    Title
                                </SortableTableHeader>
                                <SortableTableHeader column='type'>
                                    Type
                                </SortableTableHeader>
                                <SortableTableHeader column='createdAt'>
                                    Created At
                                </SortableTableHeader>
                                <SortableTableHeader column='user'>
                                    User
                                </SortableTableHeader>
                                <th>Warnings</th>
                                <th>Errors</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody className=''>
                            {digests.map((digest) => (
                                <tr key={digest.id}>
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
                                            {digest.status.charAt(0).toUpperCase() +
                                                digest.status.slice(1)}
                                        </span>
                                    </td>
                                    <td
                                        className='truncate max-w-xs'
                                        title={digest.title}
                                    >
                                        {digest.title}
                                    </td>
                                    <td
                                        className='truncate w-24'
                                        title={digest.display_name}
                                    >
                                        {truncateText(digest.display_name, 24)}
                                    </td>
                                    <td className='w-36'>
                                        {formatDate(new Date(digest.created_at))}
                                    </td>
                                    <td
                                        className='truncate w-32'
                                        title={digest.user_detail.username}
                                    >
                                        {truncateText(digest.user_detail.username, 16)}
                                    </td>
                                    <td className='w-8'>
                                        <span
                                            className={`badge badge-warning ${digest.warnings?.length > 0 ? 'tooltip tooltip-left tooltip-warning' : ''}`}
                                            data-tooltip={
                                                digest.warnings?.length > 0
                                                    ? digest.warnings
                                                          .slice(0, 10)
                                                          .join('\n') +
                                                      (digest.warnings.length > 10
                                                          ? '\n...'
                                                          : '')
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
                                                    ? digest.errors
                                                          .slice(0, 10)
                                                          .join(', ') +
                                                      (digest.errors.length > 10
                                                          ? ', ...'
                                                          : '')
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
                                                    message:
                                                        'Are you sure you want to delete this digest?',
                                                    onConfirm: () =>
                                                        handleDelete(digest.id),
                                                })
                                            }
                                        >
                                            <Trash className='w-4 h-4' />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                digests.map((digest) => (
                    <DigestCard
                        key={digest.id}
                        localDigest={digest}
                        setAlert={setAlert}
                        onDelete={onDigestDelete}
                    />
                ))
            )}
            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />
        </>
    );
}

export default DigestList;
