import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useModal } from '@/contexts/ModalContext/ModalContext.jsx';
import { useNotif } from '@/contexts/NotificationContext/NotificationContext';
import { useProfile } from '@/contexts/ProfileContext/ProfileContext';
import useApi from '@/hooks/useApi/useApi';
import useCradleNavigate from '@/hooks/useCradleNavigate/useCradleNavigate';
import { capitalizeString, truncateText } from '@/utils/dashboardUtils/dashboardUtils';
import { formatDate } from '@/utils/dateUtils/dateUtils';
import ActionsTable from '../ActionsTable/ActionsTable';
import ListView from '../ListView/ListView';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';
import PaginationWrapper from '../PaginationWrapper/PaginationWrapper';
import TableCard from '../TableCard/TableCard';

/**
 * Reports component - Displays reports for management
 *
 * @returns {JSX.Element} Reports
 */
export default function Reports() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { notify } = useNotif();
    const { reportsApi } = useApi();
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
        10
    );
    const [selectedReports, setSelectedReports] = useState([]);
    const [columnFilters, setColumnFilters] = useState({
        user: '',
        createdAt: { from: '', to: '' },
    });

    const sortFieldMapping = {
        title: 'title',
        status: 'status',
        strategy: 'strategy',
        anonymized: 'anonymized',
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

            const response = await reportsApi.reportsList({
                page: queryParams.page,
                pageSize: queryParams.page_size,
                orderBy: queryParams.order_by,
                search: queryParams.search,
            });
            setReports(response.results);
            setTotalPages(response.totalPages);
        } catch (error) {
            console.error('Failed to fetch reports', error);
            notify({
                type: 'error',
                text: `Error fetching reports: ${error.message}`,
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
                    await Promise.all(
                        idsArray.map((id) => reportsApi.reportsDestroy({ id })),
                    );
                    notify({
                        type: 'success',
                        text: `${idsArray.length > 1 ? 'Reports' : 'Report'} deleted successfully`,
                    });
                    fetchReports();
                    setSelectedReports([]);
                } catch (error) {
                    console.error('Delete failed:', error);
                    notify({
                        type: 'error',
                        text: 'Failed to delete report(s)',
                    });
                }
            },
        });
    };

    const handleRetry = async (reportId) => {
        try {
            await reportsApi.reportsRetryCreate({ id: reportId, reportRequest: {} });
            notify({
                type: 'success',
                text: 'Retrying to build report!',
            });
            fetchReports();
        } catch (error) {
            console.error('Retry failed:', error);
            notify({
                type: 'error',
                text: 'Failed to retry report',
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
        { key: 'status', label: 'Status', sortable: true },
        { key: 'title', label: 'Title', sortable: true },
        { key: 'strategy', label: 'Strategy', sortable: true },
        { key: 'anonymized', label: 'Anonymized', sortable: true },
        { key: 'createdAt', label: 'Created At', sortable: true, filterType: 'date' },
    ];

    // Define filterable columns with their handlers
    const filterableColumns = {
        user: (value) => handleColumnFilterChange('user', value),
        createdAt: (value) => handleColumnFilterChange('createdAt', value),
    };

    const handleDownload = async (reportIds) => {
        const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];

        try {
            // Download each report
            for (const id of idsArray) {
                const report = reports.find(r => r.id === id);
                if (report && report.report_url) {
                    // Fetch the file content
                    const response = await fetch(report.report_url);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch report: ${response.statusText}`);
                    }

                    // Get the file content as blob
                    const blob = await response.blob();

                    // Create download link
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;

                    // Set filename with proper extension
                    const extension = report.strategy === 'json' ? 'json' :
                        report.strategy === 'plain' ? 'txt' : 'html';
                    link.download = `${report.title || 'report'}.${extension}`;

                    // Trigger download
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Clean up the object URL
                    window.URL.revokeObjectURL(url);
                }
            }

            notify({
                type: 'success',
                text: `${idsArray.length > 1 ? 'Reports' : 'Report'} downloaded successfully`,
            });
        } catch (error) {
            console.error('Download failed:', error);
            notify({
                type: 'error',
                text: 'Failed to download report(s)',
            });
        }
    };

    const actions = [
        {
            value: 'download',
            label: 'Download',
            handler: (items) => handleDownload(items),
        },
        {
            value: 'delete',
            label: 'Delete',
            handler: (items) => handleDelete(items),
        },
    ];

    const renderRow = (report, index, selectProps = {}) => {
        const { enableMultiSelect, isSelected, onSelect } = selectProps;
        const statusColors = {
            completed: 'text-green-500',
            working: 'text-blue-500',
            failed: 'text-red-500',
        };

        const handleRowClick = () => {
            if (report.report_url) {
                window.open(report.report_url, '_blank');
            }
        };

        return (
            <tr
                key={report.id}
                className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${report.report_url ? 'hover:cursor-pointer' : 'cursor-default'}`}
                onClick={handleRowClick}
            >
                {enableMultiSelect && (
                    <td className='w-12' onClick={(e) => e.stopPropagation()}>
                        <div className='flex items-center'>
                            <input
                                type='checkbox'
                                checked={isSelected}
                                onChange={() => onSelect(report)}
                                className='cradle-checkbox'
                            />
                        </div>
                    </td>
                )}
                <td className={statusColors[report.status] || 'cradle-text-secondary'}>
                    {capitalizeString(report.status)}
                </td>
                <td className='cradle-text-primary'>{truncateText(report.title, 50)}</td>
                <td className='cradle-text-secondary'>{capitalizeString(report.strategy || 'N/A')}</td>
                <td className='cradle-text-secondary'>{report.anonymized ? 'Yes' : 'No'}</td>
                <td className='cradle-text-secondary'>
                    {formatDate(new Date(report.created_at))}
                </td>
            </tr>
        );
    };

    return (
        <div className='w-full h-full'>
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

