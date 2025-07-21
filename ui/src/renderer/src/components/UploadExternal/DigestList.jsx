import React from 'react';
import DigestCard from './DigestCard';
import Pagination from '../Pagination/Pagination';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { Trash } from 'iconoir-react';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';
import { deleteDigest } from '../../services/intelioService/intelioService';
import { formatDate } from '../../utils/dateUtils/dateUtils';

function DigestList({
    digests,
    loading,
    page,
    totalPages,
    handlePageChange,
    setAlert,
    onDigestDelete,
}) {
    const { profile } = useProfile();
    const { setModal } = useModal();

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
                                <th className=''>Status</th>
                                <th className=''>Title</th>
                                <th className=''>Type</th>
                                <th className=''>Created At</th>
                                <th className=''>User</th>
                                <th className=''>Warnings</th>
                                <th className=''>Errors</th>
                                <th className='w-16'>Actions</th>
                            </tr>
                        </thead>
                        <tbody className=''>
                            {digests.map((digest) => (
                                <tr key={digest.id}>
                                    <td className=''>
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
                                    <td className=''>{digest.title}</td>
                                    <td className=''>{digest.display_name}</td>
                                    <td className=''>
                                        {formatDate(new Date(digest.created_at))}
                                    </td>
                                    <td className=''>{digest.user_detail.username}</td>
                                    <td className=''>
                                        <span
                                            className={`badge badge-warning ${digest.warnings?.length > 0 ? 'tooltip tooltip-top' : ''}`}
                                            data-tooltip={
                                                digest.warnings?.length > 0
                                                    ? digest.warnings.join(', ')
                                                    : undefined
                                            }
                                        >
                                            {digest.warnings?.length || 0}
                                        </span>
                                    </td>
                                    <td className=''>
                                        <span
                                            className={`badge badge-error ${digest.errors?.length > 0 ? 'tooltip tooltip-top' : ''}`}
                                            data-tooltip={
                                                digest.errors?.length > 0
                                                    ? digest.errors.join(', ')
                                                    : undefined
                                            }
                                        >
                                            {digest.errors?.length || 0}
                                        </span>
                                    </td>
                                    <td className='w-16'>
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
