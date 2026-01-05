import { useModal } from '@/contexts/ui/ModalContext';
import { useNotif } from '@/contexts/ui/NotificationContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { useTabContext } from '@/hooks/tabs/useTabContext';
import { ReportList as ReportListModel } from '@/services/cradle';
import { capitalizeString, truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { ActionBar, CollapsibleActionGroup } from '@components/base/ActionBar/ActionBar';
import ListView, { SortDirection } from '@components/base/ListView/ListView';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import StatusHeaderDropdown from '@components/base/StatusHeaderDropdown/StatusHeaderDropdown';
import TableActionsButton from '@components/base/TableActionsButton';
import Tooltip from '@components/base/Tooltip/Tooltip';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import { Edit, Eye, InfoCircleSolid, PlusCircle, RefreshCircle, Trash, WarningCircleSolid, WarningTriangleSolid } from 'iconoir-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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

interface Action {
    value: string;
    label: string;
    handler: (selectedIds: string[]) => Promise<void>;
}

export default function ReportList() {
    const { params } = useTabContext();
    const report_id = params.report_id;
    const [searchParams, setSearchParams] = useSearchParams();
    const { notify } = useNotif();
    const [reports, setReports] = useState<ReportListModel[]>([]);
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
    const [statusFilter, setStatusFilter] = useState('all');
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

                // Client-side status filtering
                let filteredResults = response.results;
                if (statusFilter && statusFilter !== 'all') {
                    filteredResults = response.results.filter(
                        (report) => report.status === statusFilter
                    );
                }

                setReports(filteredResults);
                setTotalPages(response.totalPages);
            }
        } catch (error) {
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, [report_id, page, sortField, sortDirection, pageSize, statusFilter, execute, reportsApi]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleStatusChange = (status: string) => {
        setStatusFilter(status);
        setPage(1);
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

    const columns: Array<{
        key: string;
        label: string | React.ReactNode;
        className?: string;
        sortable?: boolean;
    }> = [
            {
                key: 'status',
                label: <StatusHeaderDropdown
                    onStatusChange={handleStatusChange}
                    status={statusFilter}
                    statusOptions={['all', 'done', 'working', 'error']}
                />,
                sortable: false
            },
            { key: 'title', label: 'Title', className: 'truncate font-medium' },
            { key: 'strategy', label: 'Strategy', className: 'truncate w-24' },
            { key: 'createdAt', label: 'Created At', className: 'w-36' },
            { key: 'anonymized', label: 'Anonymized' },
            { key: 'actions', label: '', sortable: false },
        ];

    const getStatusIcon = (status?: string, errorMessage?: string) => {
        if (!status) return null;

        const icon = (() => {
            switch (status) {
                case 'done':
                    return (
                        <svg
                            width='18'
                            height='18'
                            viewBox='0 0 24 24'
                            fill='none'
                            xmlns='http://www.w3.org/2000/svg'
                            className='text-green-500'
                        >
                            <path
                                d='M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            />
                        </svg>
                    );
                case 'working':
                    return <InfoCircleSolid className='text-blue-500' width='18' height='18' />;
                case 'warning':
                    return (
                        <WarningTriangleSolid
                            className='text-amber-500'
                            width='18'
                            height='18'
                        />
                    );
                case 'error':
                    return (
                        <WarningCircleSolid
                            className='text-red-500'
                            width='18'
                            height='18'
                        />
                    );
                default:
                    return null;
            }
        })();

        const tooltipContent = errorMessage || capitalizeString(status);
        const tooltipColor = status === 'error' ? 'error' : status === 'warning' ? 'warning' : 'primary';

        if ((status === 'error' || status === 'warning') && errorMessage) {
            return (
                <Tooltip content={tooltipContent} color={tooltipColor} showArrow={false}>
                    <span className='inline-flex items-center align-middle flex-shrink-0'>
                        {icon}
                    </span>
                </Tooltip>
            );
        }

        return (
            <Tooltip content={tooltipContent} showArrow={false}>
                <span className='inline-flex items-center align-middle flex-shrink-0'>
                    {icon}
                </span>
            </Tooltip>
        );
    };

    // Row Actions Button Component
    const RowActionsButton = ({ report }: { report: ReportListModel }) => {
        const menuButtonClasses = 'w-full text-left px-4 py-2 text-sm cradle-text-secondary border border-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors rounded-lg flex items-center gap-2';

        const handleView = async () => {
            let details = await execute(() => reportsApi.reportsRetrieve({ id: report.id!, downloadUrl: false }));
            if (details.reportUrl) {
                window.open(details.reportUrl, '_blank');
            } else {
                notify({
                    type: 'error',
                    text: 'No report location available',
                });
            }
        };

        const handleEdit = () => {
            navigate(`/publish?report=${report.id}`);
        };

        const handleRetry = async () => {
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
        };

        const handleDelete = () => {
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
                        console.error('Delete report failed:', error);
                        notify({
                            type: 'error',
                            text: 'Failed to delete report',
                        });
                    }
                },
            });
        };

        return (
            <TableActionsButton>
                {report.status === 'done' && (
                    <button
                        onClick={handleView}
                        className={menuButtonClasses}
                    >
                        <Eye width='18' height='18' />
                        View Report
                    </button>
                )}
                {report.status !== 'working' && (
                    <button
                        onClick={handleEdit}
                        className={menuButtonClasses}
                    >
                        <Edit width='18' height='18' />
                        Edit Report
                    </button>
                )}
                {report.status === 'error' && (
                    <button
                        onClick={handleRetry}
                        className={menuButtonClasses}
                    >
                        <RefreshCircle width='18' height='18' />
                        Retry
                    </button>
                )}
                <div className='border-t border-gray-600/40 dark:border-gray-500/40 my-1 -mx-1' />
                <button
                    onClick={handleDelete}
                    className='w-full text-left px-4 py-2 text-sm text-red-500 border border-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors rounded-lg flex items-center gap-2'
                >
                    <Trash width='18' height='18' className='text-red-500' />
                    Delete
                </button>
            </TableActionsButton>
        );
    };

    const renderRow = (
        report: ReportListModel,
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
                <td className='w-20'>
                    <div className='flex items-center'>
                        {getStatusIcon(report.status, report.errorMessage || undefined)}
                    </div>
                </td>
                <td className='truncate max-w-xs font-medium' title={report.title}>
                    {report.title}
                </td>
                <td className='truncate w-24' title={report?.strategyLabel}>
                    {truncateText(report?.strategyLabel, 24)}
                </td>
                <td className='w-36'>{formatDate(new Date(report.createdAt || ''))}</td>
                <td className='w-24'>{report?.anonymized ? 'Yes' : 'No'}</td>
                <td className='w-12 text-right'>
                    <div className='flex justify-end'>
                        <RowActionsButton report={report} />
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
                            className='justify-center ml-2 text-[#FF8C00] hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors'
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
                        <ActionBar
                            left={
                                <CollapsibleActionGroup
                                    selectedCount={selectedReports.length}
                                    itemLabel='report'
                                    actions={[
                                        {
                                            id: 'create',
                                            tooltip: 'Create new report',
                                            icon: <PlusCircle width={20} height={20} />,
                                            onClick: () => navigate('/publish'),
                                            iconActive: true,
                                            alwaysVisible: true,
                                        },
                                        {
                                            id: 'delete',
                                            tooltip: selectedReports.length > 0
                                                ? `Delete ${selectedReports.length} report${selectedReports.length > 1 ? 's' : ''}`
                                                : 'Select reports to delete',
                                            icon: <Trash width={20} height={20} />,
                                            onClick: () => {
                                                if (selectedReports.length > 0) {
                                                    actions[0].handler(selectedReports);
                                                }
                                            },
                                            disabled: selectedReports.length === 0 || reports.length === 0,
                                            iconActive: selectedReports.length > 0,

                                        },
                                    ]}
                                />
                            }
                        />
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
                        selectedCount={selectedReports.length}
                        totalRows={reports.length}
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
