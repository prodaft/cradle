import React from 'react';
import DigestCard from './DigestCard';
import Pagination from '../Pagination/Pagination';

function DigestList({
    digests,
    loading,
    page,
    totalPages,
    handlePageChange,
    setAlert,
    onDigestDelete,
}) {
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
            {digests.map((digest) => (
                <DigestCard
                    key={digest.id}
                    localDigest={digest}
                    setAlert={setAlert}
                    onDelete={onDigestDelete}
                />
            ))}
            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />
        </>
    );
}

export default DigestList;
