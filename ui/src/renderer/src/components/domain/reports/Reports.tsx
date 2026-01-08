import { useModal } from '@/contexts/ui/ModalContext';
import { toast } from 'sonner';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import useAPICall from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { ReportList } from '@/services/cradle';
import { capitalizeString, truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { ActionBar, ActionBarSearch } from '@components/base/ActionBar/ActionBar';
import { DataTable, type BulkAction } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DateRangeFilter } from '@components/base/ListView/types';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import StatusHeaderDropdown from '@components/base/StatusHeaderDropdown/StatusHeaderDropdown';
import TableActionsButton from '@components/base/TableActionsButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import { Download, Edit, Eye, InfoCircleSolid, RefreshCircle, Trash, WarningCircleSolid, WarningTriangleSolid } from 'iconoir-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';

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
        const sortFieldFromParams =
            searchParams.get('reports_sort_field') || 'created_at';
        const sortDirectionFromParams =
            (searchParams.get('reports_sort_direction') as SortDirection) || 'desc';
        const pageSizeFromParams = Number(searchParams.get('reports_pagesize')) || 10;

        if (pageFromParams !== page) setPage(pageFromParams);
        if (sortFieldFromParams !== sortField) setSortField(sortFieldFromParams);
        if (sortDirectionFromParams !== sortDirection)
            setSortDirection(sortDirectionFromParams);
        if (pageSizeFromParams !== pageSize) setPageSize(pageSizeFromParams);
    }, [searchParams]);

    // Fetch reports when dependencies change
    useEffect(() => {
        fetchReports();
    }, [
        page,
        sortField,
        sortDirection,
        pageSize,
        columnFilters.status,
        columnFilters.user,
        columnFilters.createdAt.from,
        columnFilters.createdAt.to,
        searchQuery,
    ]);

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
                    (report) => report.status === columnFilters.status,
                );
            }

            setReports(filteredResults);
            setTotalPages(response.totalPages);
            setTotalCount(response.count || 0);
        } catch (error: any) {
            console.error('Failed to fetch reports', error);
            toast.error(`Error fetching reports: ${error.message}`);
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

    const handleSortingChange = useCallback(
        (sorting: SortingState) => {
            if (sorting.length === 0) {
                setSortField('created_at');
                setSortDirection('desc');
            } else {
                const sort = sorting[0];
                const apiField = sortFieldMapping[sort.id] || sort.id;
                setSortField(apiField);
                setSortDirection(sort.desc ? 'desc' : 'asc');
            }

            const newParams = new URLSearchParams(searchParams);
            newParams.set('reports_page', '1');
            if (sorting.length > 0) {
                const sort = sorting[0];
                const apiField = sortFieldMapping[sort.id] || sort.id;
                newParams.set('reports_sort_field', apiField);
                newParams.set('reports_sort_direction', sort.desc ? 'desc' : 'asc');
            }
            setSearchParams(newParams, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    const handleDelete = async (reportIds: string | string[]) => {
        const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];

        setModal(ConfirmDeletionModal, {
            text: `Are you sure you want to delete these ${idsArray.length > 1 ? 'reports' : 'report'}? This action is irreversible.`,
            onConfirm: async () => {
                try {
                    await Promise.all(
                        idsArray.map((id) => reportsApi.reportsDestroy({ id })),
                    );
                    toast.success(`${idsArray.length > 1 ? 'Reports' : 'Report'} deleted successfully`);
                    fetchReports();
                    setSelectedReports([]);
                } catch (error) {
                    console.error('Delete failed:', error);
                    toast.error('Failed to delete report(s)');
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
                toast.success(`Retry requested for ${successes} report${successes > 1 ? 's' : ''}.`);
            } else if (successes === 0) {
                toast.error(`Failed to retry ${failures} report${failures > 1 ? 's' : ''}.`);
            } else {
                toast.info(`Retry requested for ${successes} report${successes > 1 ? 's' : ''}, ${failures} failed.`);
            }

            // Important: do NOT refetch here; retry is async and refetching causes a full table rerender.
            setSelectedReports([]);
        } catch (error) {
            console.error('Retry failed:', error);
            toast.error('Failed to retry report(s).');
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

    // Convert sortField and sortDirection to TanStack Table sorting state
    const sorting = useMemo<SortingState>(() => {
        const columnId = Object.keys(sortFieldMapping).find(
            (key) => sortFieldMapping[key] === sortField
        ) || sortField;
        
        return columnId ? [{
            id: columnId,
            desc: sortDirection === 'desc',
        }] : [];
    }, [sortField, sortDirection]);

    // Define filterable columns with their handlers
    const filterableColumns: Record<string, (value: string | DateRangeFilter) => void> =
        {
            user: (value) => handleColumnFilterChange('user', value),
            createdAt: (value) => handleColumnFilterChange('createdAt', value),
        };

    const handleDownload = async (reportIds: string | string[]) => {
        const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];
        const promises = idsArray.map((id) =>
            execute(() => reportsApi.reportsRetrieve({ id, downloadUrl: true })),
        );
        const reports = await Promise.all(promises);

        try {
            reports.forEach((report) => {
                if (report.reportUrl) {
                    window.open(report.reportUrl, '_blank', 'noopener');
                } else {
                    toast.error('Report URL not found for report ' + report.title);
                }
            });

            toast.success(`${idsArray.length > 1 ? 'Reports' : 'Report'} downloaded successfully`);
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Failed to download report(s)');
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
                            className='text-primary'
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
                    return (
                        <InfoCircleSolid
                            className='text-primary'
                            width='18'
                            height='18'
                        />
                    );
                case 'warning':
                    return (
                        <WarningTriangleSolid
                            className='text-muted-foreground'
                            width='18'
                            height='18'
                        />
                    );
                case 'error':
                    return (
                        <WarningCircleSolid
                            className='text-destructive'
                            width='18'
                            height='18'
                        />
                    );
                default:
                    return null;
            }
        })();

        const tooltipContent = errorMessage || capitalizeString(status);
        const tooltipColorClass = status === 'error' ? 'bg-destructive text-destructive-foreground' : status === 'warning' ? 'bg-accent text-accent-foreground' : '';

        if ((status === 'error' || status === 'warning') && errorMessage) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className='inline-flex items-center align-middle flex-shrink-0'>
                            {icon}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className={tooltipColorClass}>
                        {tooltipContent}
                    </TooltipContent>
                </Tooltip>
            );
        }

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className='inline-flex items-center align-middle flex-shrink-0'>
                        {icon}
                    </span>
                </TooltipTrigger>
                <TooltipContent side="right">
                    {tooltipContent}
                </TooltipContent>
            </Tooltip>
        );
    };

    // Memoize columns to prevent recreation on every render
    const columns = useMemo<ColumnDef<ReportList>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && 'indeterminate')
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                        onClick={(e) => e.stopPropagation()}
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: 'title',
                id: 'title',
                header: () => (
                    <span>Title</span>
                ),
                cell: ({ row }) => (
                    <div className='text-foreground cursor-pointer' onClick={async () => {
                        let details = await execute(() => reportsApi.reportsRetrieve({ id: row.original.id!, downloadUrl: false }));
                        if (details.reportUrl) {
                            window.open(details.reportUrl, '_blank');
                        } else {
                            toast.error('Report URL not found for report ' + details.title);
                        }
                    }}>
                        <div className='flex items-center gap-2 min-w-0'>
                            <span className='inline-flex items-center flex-shrink-0'>
                                {getStatusIcon(row.original.status, row.original.errorMessage || undefined)}
                            </span>
                            <span className='truncate'>{truncateText(row.original.title, 50)}</span>
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: 'strategy',
                id: 'strategy',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Strategy" />
                ),
                cell: ({ row }) => (
                    <div className='text-foreground'>
                        {capitalizeString(row.original.strategy || 'N/A')}
                    </div>
                ),
            },
            {
                accessorKey: 'anonymized',
                id: 'anonymized',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Anonymized" />
                ),
                cell: ({ row }) => (
                    <div className='text-foreground'>
                        {row.original.anonymized ? 'Yes' : 'No'}
                    </div>
                ),
            },
            {
                accessorKey: 'createdAt',
                id: 'createdAt',
                header: ({ column }) => {
                    const filterValue = columnFilters.createdAt as DateRangeFilter;
                    return (
                        <div className="flex items-center gap-2">
                            <DataTableColumnHeader column={column} title="Created At" />
                            {(filterValue?.from && filterValue?.to) && (
                                <span className='text-xs text-accent'>●</span>
                            )}
                        </div>
                    );
                },
                cell: ({ row }) => (
                    <div className='text-foreground'>
                        {formatDate(new Date(row.original.createdAt || ''))}
                    </div>
                ),
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const report = row.original;
                    const handleView = async () => {
                        let details = await execute(() => reportsApi.reportsRetrieve({ id: report.id!, downloadUrl: false }));
                        if (details.reportUrl) {
                            window.open(details.reportUrl, '_blank');
                        } else {
                            toast.error('No report location available');
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
                            toast.success('Retrying to build report!');
                        } catch (error) {
                            console.error('Retry report failed:', error);
                            toast.error('Failed to retry report');
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
                                    toast.success('Report deleted successfully');
                                } catch (error) {
                                    console.error('Delete report failed:', error);
                                    toast.error('Failed to delete report');
                                }
                            },
                        });
                    };

                    return (
                        <div className='w-12 text-right' onClick={(e) => e.stopPropagation()}>
                            <div className='flex justify-end'>
                                <TableActionsButton>
                                    {report.status === 'done' && (
                                        <DropdownMenuItem onClick={handleView}>
                                            <Eye width='18' height='18' />
                                            View Report
                                        </DropdownMenuItem>
                                    )}
                                    {report.status !== 'working' && (
                                        <DropdownMenuItem onClick={handleEdit}>
                                            <Edit width='18' height='18' />
                                            Edit Report
                                        </DropdownMenuItem>
                                    )}
                                    {report.status === 'error' && (
                                        <DropdownMenuItem onClick={handleRetry}>
                                            <RefreshCircle width='18' height='18' />
                                            Retry
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDelete} variant="destructive">
                                        <Trash width='18' height='18' />
                                        Delete
                                    </DropdownMenuItem>
                                </TableActionsButton>
                            </div>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [columnFilters, handleStatusChange, getStatusIcon, execute, reportsApi, fetchReports, navigate, setModal],
    );

    // Handle row selection
    const handleRowSelectionChange = useCallback((selectedIds: string[]) => {
        setSelectedReports(selectedIds);
    }, []);

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>Reports</h2>
                    <p className='text-muted-foreground'>Manage & View Your Reports</p>
                </div>
            </div>

            {/* Content Area */}
            <div className='flex flex-col space-y-4 p-4'>
                <ActionBar
                    left={
                        <>
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
                    right={
                        <>
                            <StatusHeaderDropdown
                                onStatusChange={handleStatusChange}
                                status={columnFilters.status}
                                statusOptions={['all', 'done', 'working', 'error']}
                            />
                        </>
                    }
                />

                <DataTable
                    columns={columns}
                    data={reports}
                    loading={loading}
                    emptyMessage='No reports found.'
                    enableRowSelection={true}
                    selectedRows={selectedReports}
                    onRowSelectionChange={handleRowSelectionChange}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    manualPagination={true}
                    bulkActions={[
                        {
                            id: 'download',
                            label: 'Download reports',
                            icon: <Download width={18} height={18} />,
                            onClick: () => handleDownload(selectedReports),
                            disabled: loading || reports.length === 0 || selectedReports.length === 0,
                        },
                        {
                            id: 'delete',
                            label: 'Delete reports',
                            icon: <Trash width={18} height={18} />,
                            onClick: () => handleDelete(selectedReports),
                            disabled: loading || reports.length === 0 || selectedReports.length === 0,
                            variant: 'destructive',
                        },
                        {
                            id: 'retry',
                            label: 'Retry reports',
                            icon: <RefreshCircle width={18} height={18} />,
                            onClick: () => handleRetry(selectedReports),
                            disabled: loading || reports.length === 0 || selectedReports.length === 0,
                        },
                    ]}
                    itemLabel="report"
                    manualSorting={true}
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
