import {
    Edit,
    Eye,
    PlusCircle,
    RefreshCircle,
    Trash,
} from 'iconoir-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import {
    getReport,
    getReports,
    importReport,
} from '../../services/publishService/publishService';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import ListView from '../ListView/ListView';

import { useModal } from '../../contexts/ModalContext/ModalContext.jsx';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import {
    deleteReport,
    retryReport,
} from '../../services/publishService/publishService';
import {
    capitalizeString,
    truncateText,
} from '../../utils/dashboardUtils/dashboardUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';

/**
 * ReportCard component - Displays details of a report.
 *
 * @function ReportCard
 * @param {Object} props - The props object
 * @param {Object} props.report - Report object
 * @param {Function} props.setAlert - Function to display alerts
 * @returns {ReportCard}
 */
export function ReportCard({ report, setAlert }) {
    const [formattedDate, setFormattedDate] = useState('');
    const [localReport, setLocalReport] = useState(report);
    const [visible, setVisible] = useState(true);
    const { navigate, navigateLink } = useCradleNavigate();
    const { setModal } = useModal();

    useEffect(() => {
        setFormattedDate(formatDate(new Date(localReport.created_at)));
    }, [localReport]);

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

    const handleEdit = (reportId) => {
        navigate(`/publish?report=${reportId}`);
    };

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
        <div className='bg-white dark:bg-gray-800 dark:bg-opacity-75 p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 m-2'>
            <div className='flex justify-between items-center mb-2'>
                <div className='flex items-center space-x-2'>
                    <h2 className='text-lg font-bold text-gray-900 dark:text-white'>
                        {localReport.title}
                    </h2>
                    {localReport.strategy !== 'import' && (
                        <>
                            {localReport.status === 'done' && (
                                <button
                                    title='View Report'
                                    className='text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors'
                                    onClick={() => handleView(localReport.id)}
                                >
                                    <Eye className='w-5 h-5' />
                                </button>
                            )}
                            {localReport.status !== 'working' && (
                                <button
                                    title='Edit Report'
                                    className='text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 transition-colors'
                                    onClick={() => handleEdit(localReport.id)}
                                >
                                    <Edit className='w-5 h-5' />
                                </button>
                            )}
                            {localReport.status === 'error' && (
                                <button
                                    title='Retry Report'
                                    className='text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 dark:hover:text-yellow-300 transition-colors'
                                    onClick={() => handleRetry(localReport.id)}
                                >
                                    <RefreshCircle className='w-5 h-5' />
                                </button>
                            )}
                        </>
                    )}
                    <button
                        title='Delete Report'
                        className='text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 transition-colors'
                        onClick={() =>
                            setModal(ConfirmDeletionModal, {
                                text: `Are you sure you want to delete this report?`,
                                onConfirm: () => handleDelete(localReport.id),
                            })
                        }
                    >
                        <Trash className='w-5 h-5' />
                    </button>
                </div>
                <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${localReport.status === 'done'
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
            <div className='text-gray-700 dark:text-gray-300 text-sm space-y-1'>
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
                    Object.keys(localReport.extra_data).map((key) => {
                        if (key === 'warnings') {
                            return (
                                <div
                                    key={key}
                                    className='text-yellow-700 dark:text-yellow-300'
                                >
                                    <p>
                                        <strong>Warnings:</strong>
                                    </p>
                                    <ul className='list-disc list-inside ml-4 space-y-1'>
                                        {Array.isArray(localReport.extra_data[key]) ? (
                                            localReport.extra_data[key].map(
                                                (warning, index) => (
                                                    <li key={index}>{warning}</li>
                                                ),
                                            )
                                        ) : (
                                            <li>{localReport.extra_data[key]}</li>
                                        )}
                                    </ul>
                                </div>
                            );
                        }
                        return (
                            <p key={key}>
                                <strong>{capitalizeString(key)}:</strong>{' '}
                                {localReport.extra_data[key]}
                            </p>
                        );
                    })}
                {localReport.status === 'error' && (
                    <p className='text-red-700 dark:text-red-300'>
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

export default function ReportList({ setAlert = null }) {
    const { report_id } = useParams();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');
    const { navigate, navigateLink } = useCradleNavigate();
    const { profile } = useProfile();
    const { setModal } = useModal();

    let [alert, setAlertState] = useState({ show: false, message: '', color: 'red' });

    if (!setAlert) {
        setAlert = setAlertState;
    }

    // Mapping of table columns to API field names
    const sortFieldMapping = {
        title: 'title',
        author: 'user__username',
        strategy: 'strategy',
        createdAt: 'created_at',
    };

    const handleSort = (field, direction) => {
        setSortField(field);
        setSortDirection(direction);
        // Reset to first page when sorting changes
        setPage(1);
    };

    useEffect(() => {
        fetchReports();
    }, [report_id, page, sortField, sortDirection]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            if (report_id) {
                const response = await getReport(report_id);
                setReports([response.data]);
            } else {
                const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
                const response = await getReports({
                    page,
                    page_size: profile?.compact_mode ? 25 : 10,
                    order_by: orderBy,
                });
                setReports(response.data.results);
                setTotalPages(response.data.total_pages);
            }
        } catch (error) {
            console.error('Failed to fetch reports', error);
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const columns = [
        { key: 'status', label: 'Status' },
        { key: 'title', label: 'Title', className: 'truncate font-medium' },
        { key: 'strategy', label: 'Strategy', className: 'truncate w-24' },
        { key: 'createdAt', label: 'Created At', className: 'w-36' },
        { key: 'anonymized', label: 'Anonymized' },
        { key: 'actions', label: 'Actions' },
    ];

    const renderRow = (report) => (
        <tr key={report.id}>
            <td className='w-8'>
                <span
                    className={`badge text-white ${
                        report.status === 'done'
                            ? 'bg-green-500'
                            : report.status === 'error'
                                ? 'bg-red-500'
                                : 'bg-yellow-500'
                    }`}
                >
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </span>
            </td>
            <td className='truncate max-w-xs font-medium' title={report.title}>
                {report.title}
            </td>
            <td className='truncate w-24' title={report.strategy_label}>
                {truncateText(report.strategy_label, 24)}
            </td>
            <td className='w-36'>{formatDate(new Date(report.created_at))}</td>
            <td className='w-24'>{report.anonymized ? 'Yes' : 'No'}</td>
            <td className='w-32'>
                <div className='flex space-x-1'>
                    {report.strategy !== 'import' && (
                        <>
                            {report.status === 'done' && (
                                <button
                                    onClick={() => {
                                        if (report.report_url) {
                                            window.open(report.report_url, '_blank');
                                        } else {
                                            setAlert({
                                                show: true,
                                                message: 'No report location available',
                                                color: 'red',
                                            });
                                        }
                                    }}
                                    className='btn btn-ghost btn-xs text-blue-600 hover:text-blue-500'
                                    title='View Report'
                                >
                                    <Eye className='w-4 h-4' />
                                </button>
                            )}
                            {report.status !== 'working' && (
                                <button
                                    onClick={() => navigate(`/publish?report=${report.id}`)}
                                    className='btn btn-ghost btn-xs text-green-600 hover:text-green-500'
                                    title='Edit Report'
                                >
                                    <Edit className='w-4 h-4' />
                                </button>
                            )}
                            {report.status === 'error' && (
                                <button
                                    onClick={async () => {
                                        try {
                                            await retryReport(report.id);
                                            fetchReports();
                                            setAlert({
                                                show: true,
                                                message: 'Retrying to build report!',
                                                color: 'green',
                                            });
                                        } catch (error) {
                                            console.error('Retry report failed:', error);
                                            setAlert({
                                                show: true,
                                                message: 'Failed to retry report',
                                                color: 'red',
                                            });
                                        }
                                    }}
                                    className='btn btn-ghost btn-xs text-yellow-600 hover:text-yellow-500'
                                    title='Retry Report'
                                >
                                    <RefreshCircle className='w-4 h-4' />
                                </button>
                            )}
                        </>
                    )}
                    <button
                        onClick={() =>
                            setModal(ConfirmDeletionModal, {
                                text: `Are you sure you want to delete this report?`,
                                onConfirm: async () => {
                                    try {
                                        await deleteReport(report.id);
                                        fetchReports();
                                        setAlert({
                                            show: true,
                                            message: 'Report deleted successfully',
                                            color: 'green',
                                        });
                                    } catch (error) {
                                        console.error('Delete report failed:', error);
                                        setAlert({
                                            show: true,
                                            message: 'Failed to delete report',
                                            color: 'red',
                                        });
                                    }
                                },
                            })
                        }
                        className='btn btn-ghost btn-xs text-red-600 hover:text-red-500'
                        title='Delete Report'
                    >
                        <Trash className='w-4 h-4' />
                    </button>
                </div>
            </td>
        </tr>
    );

    const renderCard = (report) => (
        <ReportCard key={report.id} report={report} setAlert={setAlert} />
    );

    const handleImportClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                importReport(file)
                    .then((response) => {
                        console.log('Report imported successfully', response);
                        // Optionally refresh the list or display a success message
                        fetchReports();
                    })
                    .catch((error) => {
                        console.error('Failed to import report', error);
                        setAlert({
                            show: true,
                            message: 'Failed to import report',
                            color: 'red',
                        });
                    });
            }
        };
        input.click();
    };

    return (
        <div className='w-full h-full flex flex-col space-y-3'>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <h1 className='text-3xl font-semibold mb-4'>
                {report_id ? (
                    'Report Details'
                ) : (
                    <div className='flex items-center'>
                        Reports
                        <button
                            className='justify-center ml-2'
                            onClick={navigateLink('/publish')}
                        >
                            <PlusCircle width={24} />
                        </button>
                    </div>
                )}
            </h1>

            {!report_id ? (
                <ListView
                    data={reports}
                    columns={columns}
                    renderRow={renderRow}
                    renderCard={renderCard}
                    loading={loading}
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sortFieldMapping={sortFieldMapping}
                    emptyMessage="No reports found."
                    tableClassName="table table-zebra"
                />
            ) : loading ? (
                <p className='text-gray-300'>Loading reports...</p>
            ) : reports.length > 0 ? (
                reports.map((report) => (
                    <ReportCard key={report.id} report={report} setAlert={setAlert} />
                ))
            ) : (
                <p className='text-gray-400'>No reports found.</p>
            )}
        </div>
    );
}
