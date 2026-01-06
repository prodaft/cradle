import { useModal } from '@/contexts/ui/ModalContext';
import { useNotif } from '@/contexts/ui/NotificationContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import useAPICall from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { ReportList } from '@/services/cradle';
import { capitalizeString, truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { ActionBar, ActionBarDivider, ActionBarSearch, CollapsibleActionGroup } from '@components/base/ActionBar/ActionBar';
import ListView, {
    DateRangeFilter,
    SortDirection,
} from '@components/base/ListView/ListView';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import StatusHeaderDropdown from '@components/base/StatusHeaderDropdown/StatusHeaderDropdown';
import TableActionsButton from '@components/base/TableActionsButton';
import Tooltip from '@components/base/Tooltip/Tooltip';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import { Download, Edit, Eye, InfoCircleSolid, RefreshCircle, Trash, WarningCircleSolid, WarningTriangleSolid } from 'iconoir-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface ColumnFilters {
    [key: string]: string | DateRangeFilter | undefined;
    status: string;
    user: string;
    createdAt: DateRangeFilter;
}

interface SelectProps {
    enableMultiSelect?: boolean;
    isSelected?: boolean;
    onSelect?: (report: ReportList) => void;
}

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
    const { execute } = useAPICall();
    const [reports, setReports] = useState<ReportList[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(Number(searchParams.get('reports_page')) || 1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [sortField, setSortField] = useState(
        searchParams.get('reports_sort_field') || 'created_at',
    );
    const [sortDirection, setSortDirection] = useState<SortDirection>(
        (searchParams.get('reports_sort_direction') as SortDirection) || 'desc',
    );
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('reports_pagesize')) || 10,
    );
    const [selectedReports, setSelectedReports] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        status: 'all',
        user: '',
        createdAt: { from: '', to: '' },
    });

    const sortFieldMapping: Record<string, string> = {
        title: 'title',
        strategy: 'strategy',
        anonymized: 'anonymized',
        createdAt: 'created_at',
        user: 'user__username',
    };

    // Sync URL params to state (for browser back/forward)
    useEffect(() => {
        const pageFromParams = Number(searchParams.get('reports_page')) || 1;
        const sortFieldFromParams = searchParams.get('reports_sort_field') || 'created_at';
        const sortDirectionFromParams = (searchParams.get('reports_sort_direction') as SortDirection) || 'desc';
        const pageSizeFromParams = Number(searchParams.get('reports_pagesize')) || 10;

        if (pageFromParams !== page) setPage(pageFromParams);
        if (sortFieldFromParams !== sortField) setSortField(sortFieldFromParams);
        if (sortDirectionFromParams !== sortDirection) setSortDirection(sortDirectionFromParams);
        if (pageSizeFromParams !== pageSize) setPageSize(pageSizeFromParams);
    }, [searchParams]);

    // Fetch reports when dependencies change
    useEffect(() => {
        fetchReports();
    }, [page, sortField, sortDirection, pageSize, columnFilters.status, columnFilters.user, columnFilters.createdAt.from, columnFilters.createdAt.to, searchQuery]);

    const resetToFirstPage = useCallback(() => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('reports_page', '1');
        setSearchParams(newParams, { replace: true });
    }, [searchParams, setSearchParams]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const queryParams: Record<string, any> = {
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
                search: searchQuery || undefined,
                // Note: Status filtering happens client-side until backend supports it
            });

            // Client-side status filtering
            let filteredResults = response.results;
            if (columnFilters.status && columnFilters.status !== 'all') {
                filteredResults = response.results.filter(
                    (report) => report.status === columnFilters.status
                );
            }

            setReports(filteredResults);
            setTotalPages(response.totalPages);
            setTotalCount(response.count || 0);
        } catch (error: any) {
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

    const handlePageChange = (newPage: number) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('reports_page', String(newPage));
        setSearchParams(newParams, { replace: true });
    };

    const handleSort = (newSortField: string, newSortDirection: SortDirection) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('reports_sort_field', newSortField);
        newParams.set('reports_sort_direction', newSortDirection);
        newParams.set('reports_page', '1');
        setSearchParams(newParams, { replace: true });
    };

    const handleDelete = async (reportIds: string | string[]) => {
        const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];

        setModal(ConfirmDeletionModal, {
            text: `Are you sure you want to delete these ${idsArray.length > 1 ? 'reports' : 'report'}? This action is irreversible.`,
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

    const handleRetry = async (reportIds: string | string[]) => {
        const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];

        if (idsArray.length === 0) return;

        try {
            const retryPromises = idsArray.map((id) =>
                execute(() => reportsApi.reportsRetryCreate({ id })),
            );
            const results = await Promise.allSettled(retryPromises);

            const successes = results.filter((r) => r.status === 'fulfilled').length;
            const failures = results.filter((r) => r.status === 'rejected').length;

            if (failures === 0) {
                notify({
                    type: 'success',
                    text: `Retry requested for ${successes} report${successes > 1 ? 's' : ''}.`,
                });
            } else if (successes === 0) {
                notify({
                    type: 'error',
                    text: `Failed to retry ${failures} report${failures > 1 ? 's' : ''}.`,
                });
            } else {
                notify({
                    type: 'info',
                    text: `Retry requested for ${successes} report${successes > 1 ? 's' : ''}, ${failures} failed.`,
                });
            }

            // Important: do NOT refetch here; retry is async and refetching causes a full table rerender.
            setSelectedReports([]);
        } catch (error) {
            console.error('Retry failed:', error);
            notify({
                type: 'error',
                text: 'Failed to retry report(s).',
            });
        }
    };

    const handleColumnFilterChange = (
        column: string,
        value: string | DateRangeFilter,
    ) => {
        setColumnFilters((prev) => ({
            ...prev,
            [column]: value,
        }));
        // Reset to first page when filters change
        const newParams = new URLSearchParams(searchParams);
        newParams.set('reports_page', '1');
        setSearchParams(newParams, { replace: true });
    };

    const handleStatusChange = (status: string) => {
        setColumnFilters((prev) => ({
            ...prev,
            status,
        }));
        // Reset to first page when status filter changes
        const newParams = new URLSearchParams(searchParams);
        newParams.set('reports_page', '1');
        setSearchParams(newParams, { replace: true });
    };

    const columns: Array<{
        key: string;
        label: string | React.ReactNode;
        sortable?: boolean;
        filterType?: 'text' | 'date';
    }> = [
            {
                key: 'title',
                label: (
                    <div className='flex items-center gap-2'>
                        <StatusHeaderDropdown
                            onStatusChange={handleStatusChange}
                            status={columnFilters.status}
                            statusOptions={['all', 'done', 'working', 'error']}
                        />
                        <span>Title</span>
                    </div>
                ),
                sortable: true,
            },
            { key: 'strategy', label: 'Strategy', sortable: true },
            { key: 'anonymized', label: 'Anonymized', sortable: true },
            {
                key: 'createdAt',
                label: 'Created At',
                sortable: true,
                filterType: 'date' as const,
            },
            { key: 'actions', label: '', sortable: false },
        ];

    // Define filterable columns with their handlers
    const filterableColumns: Record<string, (value: string | DateRangeFilter) => void> =
    {
        user: (value) => handleColumnFilterChange('user', value),
        createdAt: (value) => handleColumnFilterChange('createdAt', value),
    };

    const handleDownload = async (reportIds: string | string[]) => {
        const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];
        const promises = idsArray.map((id) => execute(() => reportsApi.reportsRetrieve({ id, downloadUrl: true })));
        const reports = await Promise.all(promises);

        try {
            reports.forEach((report) => {
                if (report.reportUrl) {
                    window.open(report.reportUrl, '_blank', 'noopener');
                } else {
                    notify({
                        type: 'error',
                        text: 'Report URL not found for report ' + report.title,
                    });
                }
            });

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
                <Tooltip content={tooltipContent} color={tooltipColor} showArrow={true} side="right">
                    <span className='inline-flex items-center align-middle flex-shrink-0'>
                        {icon}
                    </span>
                </Tooltip>
            );
        }

        return (
            <Tooltip content={tooltipContent} showArrow={true} side="right">
                <span className='inline-flex items-center align-middle flex-shrink-0'>
                    {icon}
                </span>
            </Tooltip>
        );
    };

    // Row Actions Button Component
    const RowActionsButton = ({ report }: { report: ReportList }) => {
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
        report: ReportList,
        index: number,
        selectProps: SelectProps = {},
    ) => {
        const { enableMultiSelect, isSelected, onSelect } = selectProps;

        const handleRowClick = async () => {
            let details = await execute(() => reportsApi.reportsRetrieve({ id: report.id!, downloadUrl: false }));
            if (details.reportUrl) {
                window.open(details.reportUrl, '_blank');
            } else {
                notify({
                    type: 'error',
                    text: 'Report URL not found for report ' + details.title,
                });
            }
        };

        return (
            <tr
                key={report.id}
                className={`cursor-pointer`}
                onClick={handleRowClick}
            >
                {enableMultiSelect && onSelect && (
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
                <td className='cradle-text-primary'>
                    <div className='flex items-center gap-2 min-w-0'>
                        <span className='inline-flex items-center flex-shrink-0'>
                            {getStatusIcon(report.status, report.errorMessage || undefined)}
                        </span>
                        <span className='truncate'>{truncateText(report.title, 50)}</span>
                    </div>
                </td>
                <td className='cradle-text-secondary'>
                    {capitalizeString(report.strategy || 'N/A')}
                </td>
                <td className='cradle-text-secondary'>
                    {report.anonymized ? 'Yes' : 'No'}
                </td>
                <td className='cradle-text-secondary'>
                    {formatDate(new Date(report.createdAt || ''))}
                </td>
                <td className='w-12 text-right' onClick={(e) => e.stopPropagation()}>
                    <div className='flex justify-end'>
                        <RowActionsButton report={report} />
                    </div>
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
                <div className="flex items-center gap-1.5 px-3 h-7 text-xs font-mono rounded-full border border-[#FF8C00]/30 bg-[#FF8C00]/10 text-[#FF8C00]">
                    <span className="font-semibold">
                        {reports.length === totalCount || (reports.length === 0 && totalCount === 0)
                            ? totalCount
                            : `${reports.length}/${totalCount}`}
                    </span>
                    <span className="opacity-70">reports</span>
                </div>
            </div>

            {/* Content Area */}
            <div className='flex flex-col space-y-4 p-4'>
                <ActionBar
                    left={
                        <>
                            <CollapsibleActionGroup
                                selectedCount={selectedReports.length}
                                itemLabel='report'
                                actions={[
                                    {
                                        id: 'download',
                                        tooltip: selectedReports.length > 0
                                            ? `Download ${selectedReports.length} report${selectedReports.length > 1 ? 's' : ''}`
                                            : 'Select reports to download',
                                        icon: <Download width={20} height={20} />,
                                        onClick: () => handleDownload(selectedReports),
                                        disabled: loading || reports.length === 0 || selectedReports.length === 0,
                                        iconActive: selectedReports.length > 0,
                                    },
                                    {
                                        id: 'delete',
                                        tooltip: selectedReports.length > 0
                                            ? `Delete ${selectedReports.length} report${selectedReports.length > 1 ? 's' : ''}`
                                            : 'Select reports to delete',
                                        icon: <Trash width={20} height={20} />,
                                        onClick: () => handleDelete(selectedReports),
                                        disabled: loading || reports.length === 0 || selectedReports.length === 0,
                                        iconActive: selectedReports.length > 0,
                                    },
                                    {
                                        id: 'retry',
                                        tooltip: selectedReports.length > 0
                                            ? `Retry ${selectedReports.length} report${selectedReports.length > 1 ? 's' : ''}`
                                            : 'Select reports to retry',
                                        icon: <RefreshCircle width={20} height={20} />,
                                        onClick: () => handleRetry(selectedReports),
                                        disabled: loading || reports.length === 0 || selectedReports.length === 0,
                                        iconActive: selectedReports.length > 0,
                                    },
                                ]}
                            />
                            <ActionBarDivider />
                            <ActionBarSearch
                                placeholder='Search reports...'
                                debounceMs={300}
                                onDebouncedChange={(v) => {
                                    setSearchQuery(v);
                                    resetToFirstPage();
                                }}
                                onSubmit={() => resetToFirstPage()}
                                onClear={() => resetToFirstPage()}
                            />
                        </>
                    }
                />

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
                    selectedIds={selectedReports}
                    setSelected={setSelectedReports}
                    filterableColumns={filterableColumns}
                    filterValues={columnFilters}
                />

                <PaginationWrapper
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    pageSize={pageSize}
                    onPageSizeChange={(newSize) => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('reports_page', '1');
                        newParams.set('reports_pagesize', String(newSize));
                        setSearchParams(newParams, { replace: true });
                    }}
                    disabled={reports.length === 0}
                    selectedCount={selectedReports.length}
                    totalRows={totalCount}
                />
            </div>
        </div>
    );
}
