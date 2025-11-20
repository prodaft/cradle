import {
    Edit,
    Eye,
    PlusCircle,
    RefreshCircle,
    Trash,
} from 'iconoir-react';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useModal } from '@/contexts/ui/ModalContext';
import { useNotif } from '@/contexts/ui/NotificationContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import {
    truncateText
} from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import ActionsTable from '@components/domain/activity/ActionsTable';
import ListView from '@components/base/ListView/ListView';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import TableCard from '@components/base/Card/TableCard';

interface Report {
    id: string;
    title: string;
    status: string;
    strategy: string;
    strategy_label: string;
    anonymized: boolean;
    created_at: string;
    report_url?: string;
}

interface Action {
    value: string;
    label: string;
    handler: (selectedIds: string[]) => void;
}

interface Column {
    key: string;
    label: string;
    className?: string;
}

interface SelectProps {
    enableMultiSelect?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
}

export default function ReportList() {
    const { report_id } = useParams<{ report_id?: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const { notify } = useNotif();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState(searchParams.get('reports_sort_field') || 'created_at');
    const [sortDirection, setSortDirection] = useState(searchParams.get('reports_sort_direction') || 'desc');
    const { reportsApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { profile } = useProfile();
    const { setModal } = useModal();
    const [selectedReports, setSelectedReports] = useState<string[]>([]);
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('reports_pagesize')) ||
        10
    );

    // Mapping of table columns to API field names
    const sortFieldMapping: Record<string, string> = {
        title: 'title',
        author: 'user__username',
        strategy: 'strategy',
        createdAt: 'created_at',
    };

    const handleSort = (field: string, direction: string) => {
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

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    // Define actions for the ActionBar
    const actions: Action[] = [
        {
            value: 'delete',
            label: 'Delete',
            handler: async (selectedIds: string[]) => {
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
                                notify({
                                    type: 'success',
                                    text: `Successfully deleted ${successes} report${successes > 1 ? 's' : ''}`,
                                });
                            } else if (successes === 0) {
                                notify({
                                    type: 'error',
                                    text: `Failed to delete ${failures} report${failures > 1 ? 's' : ''}`,
                                });
                            } else {
                                notify({
                                    type: 'info',
                                    text: `Deleted ${successes} report${successes > 1 ? 's' : ''}, ${failures} failed`,
                                });
                            }

                            // Refresh the reports list
                            setSelectedReports([]);
                            fetchReports();
                        } catch (error) {
                            notify({
                                type: 'error',
                                text: 'An unexpected error occurred while deleting reports',
                            });
                        }
                    },
                    text: `Are you sure you want to delete ${selectedIds.length} report${selectedIds.length > 1 ? 's' : ''}? This action is irreversible.`,
                });
            },
        },
    ];

    const columns: Column[] = [
        { key: 'status', label: 'Status' },
        { key: 'title', label: 'Title', className: 'truncate font-medium' },
        { key: 'strategy', label: 'Strategy', className: 'truncate w-24' },
        { key: 'createdAt', label: 'Created At', className: 'w-36' },
        { key: 'anonymized', label: 'Anonymized' },
        { key: 'actions', label: 'Actions' },
    ];

    const renderRow = (report: Report, index: number, selectProps: SelectProps = {}) => {
        const { enableMultiSelect, isSelected, onSelect } = selectProps;

        return (
            <tr key={report.id}>
                {enableMultiSelect && onSelect && (
                    <td className='w-12' onClick={(e) => e.stopPropagation()}>
                        <div className='flex items-center'>
                            <input
                                type='checkbox'
                                className='cradle-checkbox'
                                checked={isSelected}
                                onChange={onSelect}
                            />
                        </div>
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
                                                notify({
                                                    type: 'error',
                                                    text: 'No report location available',
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
                                                notify({
                                                    type: 'success',
                                                    text: 'Retrying to build report!',
                                                });
                                            } catch (error) {
                                                console.error('Retry report failed:', error);
                                                notify({
                                                    type: 'error',
                                                    text: 'Failed to retry report',
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
                                            notify({
                                                type: 'success',
                                                text: 'Report deleted successfully',
                                            });
                                        } catch (error) {
                                            console.error('Delete report failed:', error);
                                            notify({
                                                type: 'error',
                                                text: 'Failed to delete report',
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
                <div className='text-gray-400'>
                    {/* Individual report view - ReportCard component not yet converted */}
                    <p>Report details view not yet implemented</p>
                </div>
            ) : (
                <p className='text-gray-400'>No reports found.</p>
            )}
        </div>
    );
}
