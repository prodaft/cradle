import React, { useState, useEffect } from 'react';
import { Trash } from 'iconoir-react';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import { deleteDigest } from '../../services/intelioService/intelioService';

function DigestCard({ localDigest, setAlert, onDelete }) {
    const [formattedDate, setFormattedDate] = useState('');
    const [visible, setVisible] = useState(true);
    const [showErrors, setShowErrors] = useState(false);
    const [showWarnings, setShowWarnings] = useState(false);

    useEffect(() => {
        setFormattedDate(formatDate(new Date(localDigest.created_at)));
    }, [localDigest]);

    const handleDelete = async () => {
        try {
            await deleteDigest(localDigest.id);
            setVisible(false);
            setAlert({
                show: true,
                message: 'Digest deleted successfully',
                color: 'green',
            });
            if (onDelete) onDelete();
        } catch (error) {
            console.error('Delete digest failed:', error);
            setAlert({ show: true, message: 'Failed to delete digest', color: 'red' });
        }
    };

    if (!visible) return null;

    return (
        <div className='bg-white dark:bg-gray-800 dark:bg-opacity-75 p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 m-2'>
            <div className='flex justify-between items-center mb-2'>
                <div className='flex items-center space-x-2'>
                    <h2 className='text-lg font-bold text-gray-900 dark:text-white'>
                        {localDigest.title}
                    </h2>
                    <button
                        title='Delete Digest'
                        className='text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 transition-colors'
                        onClick={handleDelete}
                    >
                        <Trash className='w-5 h-5' />
                    </button>
                </div>
                <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        localDigest.status === 'done'
                            ? 'bg-green-500 text-white'
                            : localDigest.status === 'error'
                              ? 'bg-red-500 text-white'
                              : 'bg-yellow-500 text-white'
                    }`}
                >
                    {localDigest.status.charAt(0).toUpperCase() +
                        localDigest.status.slice(1)}
                </span>
            </div>
            <div className='text-gray-700 dark:text-gray-300 text-sm space-y-1'>
                <p>
                    <strong>Type:</strong> {localDigest.display_name}
                </p>
                {localDigest.entity_detail && (
                    <p>
                        <strong>Entity:</strong> {localDigest.entity_detail.subtype}:
                        {localDigest.entity_detail.name}
                    </p>
                )}
                <p>
                    <strong>User:</strong> {localDigest.user_detail.username}
                </p>
                <p>
                    <strong>Created On:</strong> {formattedDate}
                </p>
                {localDigest.num_relations > 0 && (
                    <p>
                        <strong>Relations:</strong> {localDigest.num_relations}
                    </p>
                )}
                {localDigest.num_notes > 0 && (
                    <p>
                        <strong>Notes:</strong> {localDigest.num_notes}
                    </p>
                )}
                {localDigest.num_files > 0 && (
                    <p>
                        <strong>Files:</strong> {localDigest.num_files}
                    </p>
                )}

                {localDigest.errors && localDigest.errors.length > 0 && (
                    <div className='mt-2'>
                        <button
                            className='flex items-center w-full text-left text-red-700 dark:text-red-300 hover:text-red-600 dark:hover:text-red-200 transition-colors'
                            onClick={() => setShowErrors(!showErrors)}
                        >
                            <span
                                className={`mr-2 transform transition-transform duration-200 ${
                                    showErrors ? 'rotate-90' : ''
                                }`}
                            >
                                ▶
                            </span>

                            <strong className='mr-2'>
                                Errors: {localDigest.errors.length}
                            </strong>
                        </button>
                        {showErrors && (
                            <ul className='list-disc pl-5 text-red-700 dark:text-red-300 mt-1'>
                                {localDigest.errors.map((error, index) => (
                                    <li key={`error-${index}`}>{error}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {localDigest.warnings && localDigest.warnings.length > 0 && (
                    <div className='mt-2'>
                        <button
                            onClick={() => setShowWarnings(!showWarnings)}
                            className='flex items-center text-yellow-600 dark:text-yellow-300 hover:text-yellow-500 dark:hover:text-yellow-200 transition-colors'
                        >
                            <span
                                className={`mr-2 transform transition-transform duration-200 ${
                                    showWarnings ? 'rotate-90' : ''
                                }`}
                            >
                                ▶
                            </span>
                            <strong className='mr-2'>
                                Warnings: {localDigest.warnings.length}
                            </strong>
                        </button>
                        {showWarnings && (
                            <ul className='list-disc pl-5 text-yellow-600 dark:text-yellow-300 mt-1'>
                                {localDigest.warnings.map((warning, index) => (
                                    <li key={`warning-${index}`}>{warning}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default DigestCard;
