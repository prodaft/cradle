import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Eye, RefreshCircle, Trash, Edit } from 'iconoir-react';

import {
    deleteReport,
    retryReport,
} from '../../services/publishService/publishService';
import { capitalizeString } from '../../utils/dashboardUtils/dashboardUtils';
import { useNavigate } from 'react-router-dom';

/**
 * ReportCard component - Displays details of a report.
 *
 * @function ReportCard
 * @param {Object} props - The props object
 * @param {Object} props.report - Report object
 * @param {Function} props.setAlert - Function to display alerts
 * @returns {ReportCard}
 */
export default function ReportCard({ report, setAlert }) {
    const [formattedDate, setFormattedDate] = useState('');
    const [localReport, setLocalReport] = useState(report);
    const [visible, setVisible] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        setFormattedDate(new Date(localReport.created_at).toLocaleString());
    }, [localReport]);

    /**
     * Attempt to view the report.
     */
    const handleView = async (reportId) => {
        try {
            if (localReport.report_url) {
                window.open(localReport.report_url, '_blank');
            } else {
                setAlert({
                    show: true,
                    message: 'No report location available',
                    color: 'red',
                });
            }
        } catch (error) {
            setAlert({ show: true, message: 'Failed to view report', color: 'red' });
        }
    };

    /**
     * Navigate to the edit page with the report id in query params.
     */
    const handleEdit = (reportId) => {
        navigate(`/publish?report=${reportId}`);
    };

    /**
     * Attempt to retry (re-generate) a report.
     */
    const handleRetry = async (reportId) => {
        try {
            await retryReport(reportId);
            setLocalReport({ ...localReport, status: 'working' });
            setAlert({
                show: true,
                message: 'Retrying to build report!',
                color: 'green',
            });
        } catch (error) {
            console.error('Retry report failed:', error);
            setAlert({ show: true, message: 'Failed to retry report', color: 'red' });
        }
    };

    /**
     * Attempt to delete the report.
     */
    const handleDelete = async (reportId) => {
        try {
            await deleteReport(reportId);
            setVisible(false);
            setAlert({
                show: true,
                message: 'Report deleted successfully',
                color: 'green',
            });
        } catch (error) {
            console.error('Delete report failed:', error);
            setAlert({ show: true, message: 'Failed to delete report', color: 'red' });
        }
    };

    if (!visible) return null;

    return (
        <div className='bg-gray-800 bg-opacity-75 p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 m-2'>
            <div className='flex justify-between items-center mb-2'>
                <div className='flex items-center space-x-2'>
                    <h2 className='text-lg font-bold text-white'>
                        {localReport.title}
                    </h2>
                    {localReport.strategy !== 'import' && (
                        <>
                            {localReport.status === 'done' && (
                                <>
                                    <button
                                        title='View Report'
                                        className='text-blue-400 hover:text-blue-300 transition-colors'
                                        onClick={() => handleView(localReport.id)}
                                    >
                                        <Eye className='w-5 h-5' />
                                    </button>
                                </>
                            )}
                            {localReport.status !== 'working' && (
                                <>
                                    <button
                                        title='Edit Report'
                                        className='text-green-400 hover:text-green-300 transition-colors'
                                        onClick={() => handleEdit(localReport.id)}
                                    >
                                        <Edit className='w-5 h-5' />
                                    </button>
                                </>
                            )}
                            {localReport.status === 'error' && (
                                <button
                                    title='Retry Report'
                                    className='text-yellow-400 hover:text-yellow-300 transition-colors'
                                    onClick={() => handleRetry(localReport.id)}
                                >
                                    <RefreshCircle className='w-5 h-5' />
                                </button>
                            )}
                        </>
                    )}

                    <button
                        title='Delete Report'
                        className='text-red-400 hover:text-red-300 transition-colors'
                        onClick={() => handleDelete(localReport.id)}
                    >
                        <Trash className='w-5 h-5' />
                    </button>
                </div>
                <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        localReport.status === 'done'
                            ? 'bg-green-500 text-white'
                            : localReport.status === 'error'
                              ? 'bg-red-500 text-white'
                              : 'bg-yellow-500 text-white'
                    }`}
                >
                    {localReport.status.charAt(0).toUpperCase() +
                        localReport.status.slice(1)}
                </span>
            </div>
            <div className='text-gray-300 text-sm space-y-1'>
                <p>
                    <strong>Strategy:</strong> {localReport.strategy_label}
                </p>
                <p>
                    <strong>Created On:</strong> {formattedDate}
                </p>
                <p>
                    <strong>Anonymized:</strong> {localReport.anonymized ? 'Yes' : 'No'}
                </p>

                {localReport.extra_data &&
                    Object.keys(localReport.extra_data).map((key) => (
                        <p>
                            <strong>{capitalizeString(key)}:</strong>{' '}
                            {localReport.extra_data[key]}
                        </p>
                    ))}

                {localReport.status === 'error' && (
                    <p className='text-red-300'>
                        <strong>Error:</strong> {localReport.error_message}
                    </p>
                )}
            </div>
        </div>
    );
}

ReportCard.propTypes = {
    report: PropTypes.object.isRequired,
    setAlert: PropTypes.func.isRequired,
};
