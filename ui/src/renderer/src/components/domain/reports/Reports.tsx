import { useModal } from '@/contexts/ui/ModalContext';
import { useNotif } from '@/contexts/ui/NotificationContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import useAPICall from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { Report } from '@/services/cradle';
import { capitalizeString, truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import TableCard from '@components/base/Card/TableCard';
import ListView, {
    DateRangeFilter,
    SortDirection,
} from '@components/base/ListView/ListView';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import StatusHeaderDropdown from '@components/base/StatusHeaderDropdown/StatusHeaderDropdown';
import Tooltip from '@components/base/Tooltip/Tooltip';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import { Download, InfoCircleSolid, RefreshCircle, Search, Trash, WarningCircleSolid, WarningTriangleSolid, Xmark } from 'iconoir-react';
import { useEffect, useRef, useState } from 'react';
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
    onSelect?: (report: Report) => void;
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
    const [reports, setReports] = useState<Report[]>([]);
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
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
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

    useEffect(() => {
        fetchReports();
    }, [page, sortField, sortDirection, pageSize, columnFilters, searchQuery]);

    useEffect(() => {
        if (isSearchExpanded && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchExpanded]);

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
        setPage(newPage);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('reports_page', String(newPage));
        setSearchParams(newParams, { replace: true });
    };

    const handleSort = (newSortField: string, newSortDirection: SortDirection) => {
        setSortField(newSortField);
        setSortDirection(newSortDirection);
        setPage(1);

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

        try {
            const retryPromises = idsArray.map((id) =>
                execute(() => reportsApi.reportsRetryCreate({ id }))
            );
            const results = await Promise.allSettled(retryPromises);

            const successes = results.filter((r) => r.status === 'fulfilled').length;
            const failures = results.filter((r) => r.status === 'rejected').length;

            if (failures === 0) {
                notify({
                    type: 'success',
                    text: `Successfully retrying ${successes} report${successes > 1 ? 's' : ''}!`,
                });
            } else if (successes === 0) {
                notify({
                    type: 'error',
                    text: `Failed to retry ${failures} report${failures > 1 ? 's' : ''}`,
                });
            } else {
                notify({
                    type: 'info',
                    text: `Retrying ${successes} report${successes > 1 ? 's' : ''}, ${failures} failed`,
                });
            }

            setSelectedReports([]);
            fetchReports();
        } catch (error) {
            console.error('Retry failed:', error);
            notify({
                type: 'error',
                text: 'Failed to retry report(s)',
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
        setPage(1); // Reset to first page when filters change
    };

    const handleStatusChange = (status: string) => {
        setColumnFilters((prev) => ({
            ...prev,
            status,
        }));
        setPage(1);
    };

    const columns: Array<{
        key: string;
        label: string | React.ReactNode;
        sortable?: boolean;
        filterType?: 'text' | 'date';
    }> = [
            {
                key: 'status',
                label: <StatusHeaderDropdown
                    onStatusChange={handleStatusChange}
                    status={columnFilters.status}
                    statusOptions={['all', 'done', 'working', 'error']}
                />,
                sortable: false
            },
            { key: 'title', label: 'Title', sortable: true },
            { key: 'strategy', label: 'Strategy', sortable: true },
            { key: 'anonymized', label: 'Anonymized', sortable: true },
            {
                key: 'createdAt',
                label: 'Created At',
                sortable: true,
                filterType: 'date' as const,
            },
        ];

    // Define filterable columns with their handlers
    const filterableColumns: Record<string, (value: string | DateRangeFilter) => void> =
    {
        user: (value) => handleColumnFilterChange('user', value),
        createdAt: (value) => handleColumnFilterChange('createdAt', value),
    };

    const handleDownload = async (reportIds: string | string[]) => {
        const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];

        try {
            // Download each report
            for (const id of idsArray) {
                const report = reports.find((r) => r.id === id);
                if (report && report.reportUrl) {
                    // Fetch the file content
                    window.open(report.reportUrl, '_blank', 'noopener');
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

    const handleSearchSubmit = () => {
        setPage(1);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('reports_page', '1');
        setSearchParams(newParams, { replace: true });
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

    const renderRow = (
        report: Report,
        index: number,
        selectProps: SelectProps = {},
    ) => {
        const { enableMultiSelect, isSelected, onSelect } = selectProps;

        const handleRowClick = () => {
            if (report.reportUrl) {
                window.open(report.reportUrl, '_blank');
            }
        };

        return (
            <tr
                key={report.id}
                className={`cursor-pointer ${report.reportUrl ? 'hover:cursor-pointer' : 'cursor-default'}`}
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
                <td className='w-20'>
                    <div className='flex items-center'>
                        {getStatusIcon(report.status, report.errorMessage || undefined)}
                    </div>
                </td>
                <td className='cradle-text-primary'>
                    {truncateText(report.title, 50)}
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
                {!loading && (
                    <TableCard>
                        <div className='flex flex-wrap items-center justify-between gap-4'>
                            {/* Left: Actions */}
                            <div className='flex items-center gap-2 flex-shrink-0'>
                                <Tooltip content={selectedReports.length > 0 ? `Download ${selectedReports.length} report${selectedReports.length > 1 ? 's' : ''}` : 'Select reports to download'}>
                                    <button
                                        onClick={() => handleDownload(selectedReports)}
                                        disabled={reports.length === 0 || selectedReports.length === 0}
                                        className='flex items-center gap-2 px-3 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full'
                                    >
                                        <Download
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
                                <Tooltip content={selectedReports.length > 0 ? `Delete ${selectedReports.length} report${selectedReports.length > 1 ? 's' : ''}` : 'Select reports to delete'}>
                                    <button
                                        onClick={() => handleDelete(selectedReports)}
                                        disabled={reports.length === 0 || selectedReports.length === 0}
                                        className='flex items-center gap-2 px-3 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full'
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
                                <Tooltip content={selectedReports.length > 0 ? `Retry ${selectedReports.length} report${selectedReports.length > 1 ? 's' : ''}` : 'Select reports to retry'}>
                                    <button
                                        onClick={() => handleRetry(selectedReports)}
                                        disabled={reports.length === 0 || selectedReports.length === 0}
                                        className='flex items-center gap-2 px-3 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full'
                                    >
                                        <RefreshCircle
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
                                <div className='h-8 w-px bg-cradle-border-accent'></div>
                                {!isSearchExpanded ? (
                                    <button
                                        onClick={() => setIsSearchExpanded(true)}
                                        className='flex items-center justify-center w-10 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary rounded-full'
                                        title='Search'
                                    >
                                        <Search className='w-4 h-4' />
                                    </button>
                                ) : (
                                    <div className='flex items-center gap-2 min-w-[280px] bg-cradle-bg-elevated border border-cradle-border-accent h-10 px-2 rounded-full'>
                                        <button
                                            onClick={() => {
                                                handleSearchSubmit();
                                            }}
                                            className='p-1 flex-shrink-0 transition-colors text-cradle-text-muted hover:text-cradle-text-primary'
                                            title='Search'
                                        >
                                            <Search className='w-4 h-4' />
                                        </button>
                                        <input
                                            ref={searchInputRef}
                                            type='text'
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleSearchSubmit();
                                                }
                                                if (e.key === 'Escape') {
                                                    if (!searchQuery) {
                                                        setIsSearchExpanded(false);
                                                    }
                                                }
                                            }}
                                            onBlur={() => {
                                                if (!searchQuery) {
                                                    setIsSearchExpanded(false);
                                                }
                                            }}
                                            placeholder='Search reports...'
                                            className='flex-grow bg-transparent text-sm outline-none text-cradle-text-primary placeholder:text-cradle-text-muted rounded-none font-mono'
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    handleSearchSubmit();
                                                }}
                                                className='p-1 flex-shrink-0 text-cradle-text-muted hover:text-cradle-text-primary transition-colors'
                                                title='Clear search'
                                            >
                                                <Xmark className='w-4 h-4' />
                                            </button>
                                        )}
                                    </div>
                                )}
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
                    emptyMessage='No reports found.'
                    tableClassName='table table-hover'
                    enableMultiSelect={true}
                    setSelected={setSelectedReports}
                    filterableColumns={filterableColumns}
                    filterValues={columnFilters}
                />
            </div>
        </div>
    );
}
