import { useModal } from '@/contexts/ui/ModalContext';
import { useNotif } from '@/contexts/ui/NotificationContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { useTabContext } from '@/hooks/tabs/useTabContext';
import { Report } from '@/services/cradle';
import { capitalizeString, truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import TableCard from '@components/base/Card/TableCard';
import ListView, { SortDirection } from '@components/base/ListView/ListView';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import Tooltip from '@components/base/Tooltip/Tooltip';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import { Edit, Eye, PlusCircle, RefreshCircle, Trash } from 'iconoir-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

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
    const { params } = useTabContext();
    const report_id = params.report_id;
    const [searchParams, setSearchParams] = useSearchParams();
    const { notify } = useNotif();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState(
        searchParams.get('reports_sort_field') || 'created_at',
    );
    const [sortDirection, setSortDirection] = useState<SortDirection>(
        (searchParams.get('reports_sort_direction') as SortDirection) || 'desc',
    );
    const { reportsApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { profile } = useProfile();
    const { setModal } = useModal();
    const [selectedReports, setSelectedReports] = useState<string[]>([]);
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('reports_pagesize')) || 10,
    );
    const { execute } = useAPICall();

    // Mapping of table columns to API field names
    const sortFieldMapping: Record<string, string> = {
        title: 'title',
        author: 'user__username',
        strategy: 'strategy',
        createdAt: 'created_at',
    };

    const handleSort = (field: string, direction: SortDirection) => {
        setSortField(field);
        setSortDirection(direction);
        // Reset to first page when sorting changes
        setPage(1);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('reports_sort_field', field);
        newParams.set('reports_sort_direction', direction);
        setSearchParams(newParams, { replace: true });
    };

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            if (report_id) {
                const report = await execute(() =>
                    reportsApi.reportsRetrieve({ id: report_id }),
                );
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
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, [report_id, page, sortField, sortDirection, pageSize, execute, reportsApi]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

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
                            const successes = results.filter(
                                (r) => r.status === 'fulfilled',
                            ).length;
                            const failures = results.filter(
                                (r) => r.status === 'rejected',
                            ).length;

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

    const renderRow = (
        report: Report,
        index: number,
        selectProps: SelectProps = {},
    ) => {
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
                        {capitalizeString(report.status || '')}
                    </span>
                </td>
                <td className='truncate max-w-xs font-medium' title={report.title}>
                    {report.title}
                </td>
                <td className='truncate w-24' title={report?.strategyLabel}>
                    {truncateText(report?.strategyLabel, 24)}
                </td>
                <td className='w-36'>{formatDate(new Date(report.createdAt || ''))}</td>
                <td className='w-24'>{report?.anonymized ? 'Yes' : 'No'}</td>
                <td className='w-32'>
                    <div className='flex space-x-1'>
                        {report.status === 'done' && (
                            <button
                                onClick={() => {
                                    if (report?.reportUrl) {
                                        window.open(report?.reportUrl, '_blank');
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
                                <Eye width={18} height={18} />
                            </button>
                        )}
                        {report.status !== 'working' && (
                            <button
                                onClick={() => navigate(`/publish?report=${report.id}`)}
                                className='btn btn-ghost btn-xs text-green-600 hover:text-green-500'
                                title='Edit Report'
                            >
                                <Edit width={18} height={18} />
                            </button>
                        )}
                        {report.status === 'error' && (
                            <button
                                onClick={async () => {
                                    try {
                                        await reportsApi.reportsRetryCreate({
                                            id: report.id!,
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
                                <RefreshCircle width={18} height={18} />
                            </button>
                        )}
                        <button
                            onClick={() =>
                                setModal(ConfirmDeletionModal, {
                                    text: `Are you sure you want to delete this report?`,
                                    onConfirm: async () => {
                                        try {
                                            await reportsApi.reportsDestroy({
                                                id: report.id!,
                                            });
                                            fetchReports();
                                            notify({
                                                type: 'success',
                                                text: 'Report deleted successfully',
                                            });
                                        } catch (error) {
                                            console.error(
                                                'Delete report failed:',
                                                error,
                                            );
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
                            <Trash width={18} height={18} />
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
                            className='justify-center ml-2 text-[#FF8C00] hover:opacity-80 transition-opacity'
                            onClick={navigateLink('/publish')}
                        >
                            <PlusCircle width={24} height={24} />
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
                                <div className='flex items-center gap-2 flex-shrink-0'>
                                    <Tooltip content='Create new report'>
                                        <button
                                            className='flex items-center justify-center w-10 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors rounded-full'
                                            onClick={() => navigate('/publish')}
                                        >
                                            <PlusCircle
                                                className='text-[#FF8C00]'
                                                width={20}
                                                height={20}
                                            />
                                        </button>
                                    </Tooltip>

                                    <div className='h-8 w-px bg-cradle-border-accent' />

                                    <Tooltip content={selectedReports.length > 0 ? `Delete ${selectedReports.length} report${selectedReports.length > 1 ? 's' : ''}` : 'Select reports to delete'}>
                                        <button
                                            className='flex items-center gap-2 px-3 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full'
                                            onClick={() => {
                                                if (selectedReports.length > 0) {
                                                    actions[0].handler(selectedReports);
                                                }
                                            }}
                                            disabled={selectedReports.length === 0 || reports.length === 0}
                                        >
                                            <Trash
                                                className={selectedReports.length > 0 ? 'text-[#FF8C00]' : 'text-cradle-text-secondary'}
                                                width={20}
                                                height={20}
                                            />
                                            {selectedReports.length > 0 && (
                                                <span className='text-sm text-cradle-text-secondary font-mono'>
                                                    {selectedReports.length}
                                                </span>
                                            )}
                                        </button>
                                    </Tooltip>
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
                                        const newParams = new URLSearchParams(
                                            searchParams,
                                        );
                                        newParams.set('reports_page', '1');
                                        newParams.set(
                                            'reports_pagesize',
                                            String(newSize),
                                        );
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
                        emptyMessage='No reports found.'
                        tableClassName='table table-hover'
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
