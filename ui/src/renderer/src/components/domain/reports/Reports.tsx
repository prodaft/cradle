import { useModal } from '@/contexts/ui/ModalContext';
import { useNotif } from '@/contexts/ui/NotificationContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
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
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import { Search, Xmark } from 'iconoir-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface ColumnFilters {
    [key: string]: string | DateRangeFilter | undefined;
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
        user: '',
        createdAt: { from: '', to: '' },
    });

    const sortFieldMapping: Record<string, string> = {
        title: 'title',
        status: 'status',
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
            });
            setReports(response.results);
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

    const handleRetry = async (reportId: string) => {
        try {
            await reportsApi.reportsRetryCreate({ id: reportId });
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

    const columns: Array<{
        key: string;
        label: string;
        sortable?: boolean;
        filterType?: 'text' | 'date';
    }> = [
        { key: 'status', label: 'Status', sortable: true },
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
                    const response = await fetch(report.reportUrl);
                    if (!response.ok) {
                        throw new Error(
                            `Failed to fetch report: ${response.statusText}`,
                        );
                    }

                    // Get the file content as blob
                    const blob = await response.blob();

                    // Create download link
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;

                    // Set filename with proper extension
                    const extension =
                        report.strategy === 'json'
                            ? 'json'
                            : report.strategy === 'plain'
                              ? 'txt'
                              : 'html';
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

    const handleSearchSubmit = () => {
        setPage(1);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('reports_page', '1');
        setSearchParams(newParams, { replace: true });
    };

    const renderRow = (
        report: Report,
        index: number,
        selectProps: SelectProps = {},
    ) => {
        const { enableMultiSelect, isSelected, onSelect } = selectProps;
        const statusColors: Record<string, string> = {
            completed: 'text-green-500',
            working: 'text-blue-500',
            failed: 'text-red-500',
        };

        const handleRowClick = () => {
            if (report.reportUrl) {
                window.open(report.reportUrl, '_blank');
            }
        };

        return (
            <tr
                key={report.id}
                className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${report.reportUrl ? 'hover:cursor-pointer' : 'cursor-default'}`}
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
                <td
                    className={
                        report.status
                            ? statusColors[report.status]
                            : 'cradle-text-secondary'
                    }
                >
                    {capitalizeString(report.status || '')}
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
                                <button
                                    onClick={() => handleDownload(selectedReports)}
                                    disabled={reports.length === 0 || selectedReports.length === 0}
                                    className='flex items-center gap-2 px-3 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full'
                                >
                                    <svg
                                        width='18'
                                        height='18'
                                        viewBox='0 0 24 24'
                                        strokeWidth='1.5'
                                        fill='none'
                                        xmlns='http://www.w3.org/2000/svg'
                                        color='currentColor'
                                        className='text-cradle-text-secondary'
                                    >
                                        <path
                                            d='M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15'
                                            stroke='currentColor'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        ></path>
                                        <path
                                            d='M12 3V16M12 16L16 11.625M12 16L8 11.625'
                                            stroke='currentColor'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        ></path>
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleDelete(selectedReports)}
                                    disabled={reports.length === 0 || selectedReports.length === 0}
                                    className='flex items-center gap-2 px-3 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full'
                                >
                                    <svg
                                        width='18'
                                        height='18'
                                        viewBox='0 0 24 24'
                                        strokeWidth='1.5'
                                        fill='none'
                                        xmlns='http://www.w3.org/2000/svg'
                                        color='currentColor'
                                        className='text-cradle-text-secondary'
                                    >
                                        <path
                                            d='M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9'
                                            stroke='currentColor'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        ></path>
                                        <path
                                            d='M21 6L15.375 6M3 6L8.625 6M8.625 6V4C8.625 2.89543 9.52043 2 10.625 2H13.375C14.4796 2 15.375 2.89543 15.375 4V6M8.625 6L15.375 6'
                                            stroke='currentColor'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        ></path>
                                    </svg>
                                </button>
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
                    tableClassName='table table-zebra'
                    enableMultiSelect={true}
                    setSelected={setSelectedReports}
                    filterableColumns={filterableColumns}
                    filterValues={columnFilters}
                />
            </div>
        </div>
    );
}
