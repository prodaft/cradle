import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlusCircle } from 'iconoir-react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import { getReports, deleteReport, retryReport } from '../../services/publishService/publishService';
import { useModal } from '../../contexts/ModalContext/ModalContext.jsx';
import { useEffect } from 'react';
import ListView from '../ListView/ListView';
import Pagination from '../Pagination/Pagination';
import ActionBar from '../ActionBar/ActionBar';
import ActionsTable from '../ActionsTable/ActionsTable';
import TableCard from '../TableCard/TableCard';
import PaginationWrapper from '../PaginationWrapper/PaginationWrapper';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import { capitalizeString, truncateText } from '../../utils/dashboardUtils/dashboardUtils';

/**
 * Reports component - Displays reports for management
 *
 * @returns {JSX.Element} Reports
 */
export default function Reports() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const { navigate, navigateLink } = useCradleNavigate();
    const { profile } = useProfile();
    const { setModal } = useModal();
    
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(Number(searchParams.get('reports_page')) || 1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState(searchParams.get('reports_sort_field') || 'created_at');
    const [sortDirection, setSortDirection] = useState(searchParams.get('reports_sort_direction') || 'desc');
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('reports_pagesize')) ||
        20
    );
    const [selectedReports, setSelectedReports] = useState([]);
    const [columnFilters, setColumnFilters] = useState({
        user: '',
        createdAt: { from: '', to: '' },
    });

    const sortFieldMapping = {
        title: 'title',
        status: 'status',
        createdAt: 'created_at',
        user: 'user__username',
    };

    useEffect(() => {
        fetchReports();
    }, [page, sortField, sortDirection, pageSize, columnFilters]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const queryParams = {
                page,
                page_size: pageSize,
            };
            const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
            queryParams.order_by = orderBy;

            // Add filter parameters
            if (columnFilters.user) {
                queryParams.user__username = columnFilters.user;
            }
            if (columnFilters.createdAt.from) {
                queryParams.created_at__gte = columnFilters.createdAt.from;
            }
            if (columnFilters.createdAt.to) {
                queryParams.created_at__lte = columnFilters.createdAt.to;
            }

            const response = await getReports(queryParams);
            setReports(response.data.results);
            setTotalPages(response.data.total_pages);
        } catch (error) {
            console.error('Failed to fetch reports', error);
            setAlert({
                color: 'red',
                message: `Error fetching reports: ${error.message}`,
                show: true,
            });
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('reports_page', String(newPage));
        setSearchParams(newParams, { replace: true });
    };

    const handleSort = (newSortField, newSortDirection) => {
        setSortField(newSortField);
        setSortDirection(newSortDirection);
        setPage(1);

        const newParams = new URLSearchParams(searchParams);
        newParams.set('reports_sort_field', newSortField);
        newParams.set('reports_sort_direction', newSortDirection);
        newParams.set('reports_page', '1');
        setSearchParams(newParams, { replace: true });
    };

    const handleDelete = async (reportIds) => {
        const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];
        
        setModal(ConfirmDeletionModal, {
            itemName: idsArray.length > 1 ? `${idsArray.length} reports` : 'report',
            onConfirm: async () => {
                try {
                    await Promise.all(idsArray.map(id => deleteReport(id)));
                    setAlert({
                        show: true,
                        message: `${idsArray.length > 1 ? 'Reports' : 'Report'} deleted successfully`,
                        color: 'green',
                    });
                    fetchReports();
                    setSelectedReports([]);
                } catch (error) {
                    console.error('Delete failed:', error);
                    setAlert({
                        show: true,
                        message: 'Failed to delete report(s)',
                        color: 'red',
                    });
                }
            },
        });
    };

    const handleRetry = async (reportId) => {
        try {
            await retryReport(reportId);
            setAlert({
                show: true,
                message: 'Retrying to build report!',
                color: 'green',
            });
            fetchReports();
        } catch (error) {
            console.error('Retry failed:', error);
            setAlert({
                show: true,
                message: 'Failed to retry report',
                color: 'red',
            });
        }
    };

    const handleColumnFilterChange = (column, value) => {
        setColumnFilters(prev => ({
            ...prev,
            [column]: value,
        }));
        setPage(1); // Reset to first page when filters change
    };

    const columns = [
        { key: 'title', label: 'Title', sortable: true },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'user', label: 'User', sortable: true, filterType: 'text' },
        { key: 'createdAt', label: 'Created At', sortable: true, filterType: 'date' },
        { key: 'actions', label: 'Actions', sortable: false },
    ];

    // Define filterable columns with their handlers
    const filterableColumns = {
        user: (value) => handleColumnFilterChange('user', value),
        createdAt: (value) => handleColumnFilterChange('createdAt', value),
    };

    const actions = [
        {
            label: 'Delete',
            onClick: (items) => handleDelete(items.map(item => item.id)),
            variant: 'danger',
        },
    ];

    const renderRow = (report, index, selectProps = {}) => {
        const { enableMultiSelect, isSelected, onSelect } = selectProps;
        const statusColors = {
            completed: 'text-green-500',
            working: 'text-blue-500',
            failed: 'text-red-500',
        };

        return (
            <tr key={report.id}>
                {enableMultiSelect && (
                    <td className='w-12' onClick={(e) => e.stopPropagation()}>
                        <input
                            type='checkbox'
                            checked={isSelected}
                            onChange={() => onSelect(report)}
                            className='cradle-checkbox'
                        />
                    </td>
                )}
                <td className='cradle-text-primary'>{truncateText(report.title, 50)}</td>
                <td className={statusColors[report.status] || 'cradle-text-secondary'}>
                    {capitalizeString(report.status)}
                </td>
                <td className='cradle-text-secondary'>{report.user?.username || 'N/A'}</td>
                <td className='cradle-text-secondary'>
                    {formatDate(new Date(report.created_at))}
                </td>
                <td>
                    <div className='flex gap-2'>
                        {report.report_url && (
                            <button
                                onClick={() => window.open(report.report_url, '_blank')}
                                className='cradle-btn cradle-btn-sm cradle-btn-secondary'
                            >
                                View
                            </button>
                        )}
                        <button
                            onClick={() => navigate(`/publish?report=${report.id}`)}
                            className='cradle-btn cradle-btn-sm cradle-btn-secondary'
                        >
                            Edit
                        </button>
                        {report.status === 'failed' && (
                            <button
                                onClick={() => handleRetry(report.id)}
                                className='cradle-btn cradle-btn-sm cradle-btn-secondary'
                            >
                                Retry
                            </button>
                        )}
                        <button
                            onClick={() => handleDelete(report.id)}
                            className='cradle-btn cradle-btn-sm cradle-btn-danger'
                        >
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className='w-full h-full'>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            
            {/* Page Header */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        Reports
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                        Manage & View Your Reports
                    </p>
                </div>
                <button
                    className='cradle-btn cradle-btn-primary flex items-center gap-2'
                    onClick={navigateLink('/publish')}
                >
                    <PlusCircle width={20} height={20} />
                    <span>New Report</span>
                </button>
            </div>

            {/* Content Area */}
            <div className='flex flex-col space-y-4 p-4'>
                {!loading && (
                    <TableCard>
                        <div className='flex flex-wrap items-center justify-between gap-4'>
                            {/* Left: Actions */}
                            <div className='flex items-center gap-4 flex-shrink-0'>
                                <ActionsTable
                                    actions={actions}
                                    selectedItems={selectedReports}
                                    itemLabel='report'
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
                    filterableColumns={filterableColumns}
                    filterValues={columnFilters}
                />
            </div>
        </div>
    );
}

