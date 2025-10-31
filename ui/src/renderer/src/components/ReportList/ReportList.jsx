import {
    Edit,
    Eye,
    PlusCircle,
    RefreshCircle,
    Trash,
} from 'iconoir-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useModal } from '../../contexts/ModalContext/ModalContext.jsx';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useApi from '../../hooks/useApi/useApi';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import {
    capitalizeString,
    truncateText,
} from '../../utils/dashboardUtils/dashboardUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import ActionsTable from '../ActionsTable/ActionsTable';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import ListView from '../ListView/ListView';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';
import PaginationWrapper from '../PaginationWrapper/PaginationWrapper';
import TableCard from '../TableCard/TableCard';

export default function ReportList({ setAlert = null }) {
    const { report_id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState(searchParams.get('reports_sort_field') || 'created_at');
    const [sortDirection, setSortDirection] = useState(searchParams.get('reports_sort_direction') || 'desc');
    const { reportsApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { profile } = useProfile();
    const { setModal } = useModal();
    const [selectedReports, setSelectedReports] = useState([]);
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('reports_pagesize')) ||
        25
    );

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
        const newParams = new URLSearchParams(searchParams);
        newParams.set('reports_sort_field', field);
        newParams.set('reports_sort_direction', direction);
        setSearchParams(newParams, { replace: true });
    };

    useEffect(() => {
        fetchReports();
    }, [report_id, page, sortField, sortDirection, pageSize]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            if (report_id) {
                const report = await reportsApi.reportsRetrieve({ id: report_id });
                setReports([report]);
            } else {
                const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
                const response = await reportsApi.reportsList({
                    page,
                    pageSize: pageSize,
                    orderBy,
                });
                setReports(response.results);
                setTotalPages(response.totalPages);
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
                            const deletePromises = selectedIds.map((id) =>
                                reportsApi.reportsDestroy({ id }),
                            );
                            const results = await Promise.allSettled(deletePromises);

                            // Count successes and failures
                            const successes = results.filter(r => r.status === 'fulfilled').length;
                            const failures = results.filter(r => r.status === 'rejected').length;

                            if (failures === 0) {
                                setAlert({
                                    show: true,
                                    color: 'green',
                                    message: `Successfully deleted ${successes} report${successes > 1 ? 's' : ''}`,
                                });
                            } else if (successes === 0) {
                                setAlert({
                                    show: true,
                                    color: 'red',
                                    message: `Failed to delete ${failures} report${failures > 1 ? 's' : ''}`,
                                });
                            } else {
                                setAlert({
                                    show: true,
                                    color: 'amber',
                                    message: `Deleted ${successes} report${successes > 1 ? 's' : ''}, ${failures} failed`,
                                });
                            }

                            // Refresh the reports list
                            setSelectedReports([]);
                            fetchReports();
                        } catch (error) {
                            setAlert({
                                show: true,
                                color: 'red',
                                message: 'An unexpected error occurred while deleting reports',
                            });
                        }
                    },
                    text: `Are you sure you want to delete ${selectedIds.length} report${selectedIds.length > 1 ? 's' : ''}? This action is irreversible.`,
                });
            },
        },
    ];

    const columns = [
        { key: 'status', label: 'Status' },
        { key: 'title', label: 'Title', className: 'truncate font-medium' },
        { key: 'strategy', label: 'Strategy', className: 'truncate w-24' },
        { key: 'createdAt', label: 'Created At', className: 'w-36' },
        { key: 'anonymized', label: 'Anonymized' },
        { key: 'actions', label: 'Actions' },
    ];

    const renderRow = (report, index, selectProps = {}) => {
        const { enableMultiSelect, isSelected, onSelect } = selectProps;

        return (
            <tr key={report.id}>
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
                <td className='w-8'>
                    <span
                        className={`badge text-white ${report.status === 'done'
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
                                                await reportsApi.reportsRetryCreate({
                                                    id: report.id,
                                                    reportRequest: {},
                                                });
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
                                            await reportsApi.reportsDestroy({ id: report.id });
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
                <>
                    {!loading && (
                        <TableCard>
                            <div className='flex flex-wrap items-center justify-between gap-4'>
                                {/* Left: Actions */}
                                <div className='flex items-center gap-4 flex-shrink-0'>
                                    <ActionsTable
                                        actions={actions}
                                        selectedItems={selectedReports}
                                        itemLabel='row'
                                        disabled={reports.length === 0}
                                    />
                                </div>

                                {/* Right: Pagination */}
                                <PaginationWrapper
                                    currentPage={page}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                    pageSize={pageSize}
                                    onPageSizeChange={(newSize) => {
                                        setPageSize(newSize);
                                        setPage(1);
                                        const newParams = new URLSearchParams(searchParams);
                                        newParams.set('reports_page', '1');
                                        newParams.set('reports_pagesize', String(newSize));
                                        setSearchParams(newParams, { replace: true });
                                    }}
                                    disabled={reports.length === 0}
                                />
                            </div>
                        </TableCard>
                    )}

                    <ListView
                        data={reports}
                        columns={columns}
                        renderRow={renderRow}
                        loading={loading}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        sortFieldMapping={sortFieldMapping}
                        emptyMessage="No reports found."
                        tableClassName="table table-zebra"
                        enableMultiSelect={true}
                        setSelected={setSelectedReports}
                    />
                </>
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
