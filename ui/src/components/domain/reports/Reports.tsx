import ConfirmDeletionModal from '@/components/dialogs/base/ConfirmDeletionModal';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import { ReportList } from '@/services/cradle';
import { capitalizeString, truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { ActionBar, ActionBarSearch } from '@components/base/ActionBar/ActionBar';
import { DateRangeFilter } from '@components/base/ListView/types';
import PageHeader from '@components/base/PageHeader';
import StatusHeaderDropdown from '@components/base/StatusHeaderDropdown/StatusHeaderDropdown';
import TableActionsButton from '@components/base/TableActionsButton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import {
    Download,
    Edit,
    Eye,
    InfoCircleSolid,
    RefreshCircle,
    Trash,
    WarningCircleSolid,
    WarningTriangleSolid,
} from 'iconoir-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/reports' });
    const { reportsApi } = useApi();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingReportIds, setDeletingReportIds] = useState<string[]>([]);
    const [singleDeleteModalOpen, setSingleDeleteModalOpen] = useState(false);
    const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const fetchReportMutation = useMutation({
        mutationFn: async ({
            id,
            downloadUrl,
        }: {
            id: string;
            downloadUrl: boolean;
        }) => {
            return await reportsApi.reportsRetrieve({ id, downloadUrl });
        },
        meta: {
            suppressNotification: true,
        },
    });
    const [page, setPage] = useState((search as any)?.reports_page || 1);
    const [sortField, setSortField] = useState(
        (search as any)?.reports_sort_field || 'created_at',
    );
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
        (search as any)?.reports_sort_direction || 'desc',
    );
    const [pageSize, setPageSize] = useState((search as any)?.reports_pagesize || 10);
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
        const searchAny = search as any;
        const pageFromParams = searchAny?.reports_page || 1;
        const sortFieldFromParams = searchAny?.reports_sort_field || 'created_at';
        const sortDirectionFromParams = searchAny?.reports_sort_direction || 'desc';
        const pageSizeFromParams = searchAny?.reports_pagesize || 10;

        if (pageFromParams !== page) setPage(pageFromParams);
        if (sortFieldFromParams !== sortField) setSortField(sortFieldFromParams);
        if (sortDirectionFromParams !== sortDirection)
            setSortDirection(sortDirectionFromParams);
        if (pageSizeFromParams !== pageSize) setPageSize(pageSizeFromParams);
    }, [search]);

    // Prepare query parameters
    const queryParams = useMemo(() => {
        const params: Record<string, any> = {
            page,
            page_size: pageSize,
        };
        const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
        params.order_by = orderBy;

        // Add filter parameters
        if (columnFilters.user) {
            params.user__username = columnFilters.user;
        }
        if (columnFilters.createdAt.from) {
            params.created_at__gte = columnFilters.createdAt.from;
        }
        if (columnFilters.createdAt.to) {
            params.created_at__lte = columnFilters.createdAt.to;
        }

        return params;
    }, [
        page,
        pageSize,
        sortField,
        sortDirection,
        columnFilters.user,
        columnFilters.createdAt.from,
        columnFilters.createdAt.to,
    ]);

    // Query for reports
    const { data: reportsData, isPending: loading } = useQuery({
        queryKey: queryKeys.reports.list({
            page,
            pageSize,
            sortField,
            sortDirection,
            statusFilter: columnFilters.status,
        }),
        queryFn: () =>
            reportsApi.reportsList({
                page: queryParams.page,
                pageSize: queryParams.page_size,
                orderBy: queryParams.order_by,
                search: searchQuery || undefined,
                // Note: Status filtering happens client-side until backend supports it
            }),
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch reports',
        },
    });

    // Client-side status filtering
    const reports = useMemo(() => {
        if (!reportsData?.results) return [];
        if (columnFilters.status && columnFilters.status !== 'all') {
            return reportsData.results.filter(
                (report) => report.status === columnFilters.status,
            );
        }
        return reportsData.results;
    }, [reportsData?.results, columnFilters.status]);

    const totalPages = reportsData?.totalPages || 1;
    const totalCount = reportsData?.count || 0;

    const resetToFirstPage = useCallback(() => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), reports_page: 1 } as any,
            replace: true,
        });
    }, [search, router, location.pathname]);

    const handlePageChange = (newPage: number) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), reports_page: newPage } as any,
            replace: true,
        });
    };

    // Handle pagination changes from DataTable
    const handlePaginationChange = useCallback(
        (pageIndex: number, newPageSize: number) => {
            const newPage = pageIndex + 1; // Convert 0-based to 1-based

            // Handle page size change
            if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
                setPage(1);
                const searchAny = search as any;
                const newSearch: any = {
                    ...searchAny,
                    reports_page: 1,
                    reports_pagesize: newPageSize,
                };
                router.navigate({
                    to: location.pathname as any,
                    search: newSearch as any,
                    replace: true,
                });
            }
            // Handle page change
            else if (newPage !== page) {
                handlePageChange(newPage);
            }
        },
        [page, pageSize, search, router, location.pathname, handlePageChange],
    );

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

            const newSearch: any = {
                ...(search as any),
                reports_page: 1,
            };
            if (sorting.length > 0) {
                const sort = sorting[0];
                const apiField = sortFieldMapping[sort.id] || sort.id;
                newSearch.reports_sort_field = apiField;
                newSearch.reports_sort_direction = sort.desc ? 'desc' : 'asc';
            }
            router.navigate({
                to: location.pathname as any,
                search: newSearch as any,
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => reportsApi.reportsDestroy({ id }),
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.reports.lists() }],
        },
    });

    const handleDelete = async (reportIds: string | string[]) => {
        const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];
        setDeletingReportIds(idsArray);
        setDeleteModalOpen(true);
    };

    const executeDelete = async (idsArray: string[]) => {
        try {
            // Send all delete requests in parallel
            const deletePromises = idsArray.map((id) => deleteMutation.mutateAsync(id));
            const results = await Promise.allSettled(deletePromises);

            // Count successes and failures
            const successes = results.filter((r) => r.status === 'fulfilled').length;
            const failures = results.filter((r) => r.status === 'rejected').length;

            if (failures === 0) {
                toast.success(
                    `${successes > 1 ? 'Reports' : 'Report'} deleted successfully`,
                );
            } else if (successes === 0) {
                toast.error(
                    `Failed to delete ${failures} report${failures > 1 ? 's' : ''}`,
                );
            } else {
                toast.info(
                    `Deleted ${successes} report${successes > 1 ? 's' : ''}, ${failures} failed`,
                );
            }

            setSelectedReports([]);
        } catch (error) {
            toast.error('An unexpected error occurred while deleting reports');
        }
    };

    // Retry mutation
    const retryMutation = useMutation({
        mutationFn: (id: string) => reportsApi.reportsRetryCreate({ id }),
        meta: {
            suppressNotification: true, // We handle toasts ourselves
            // Note: We don't invalidate queries here because retry is async and refetching causes a full table rerender
        },
    });

    const handleRetry = async (reportIds: string | string[]) => {
        const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];

        if (idsArray.length === 0) return;

        try {
            const retryPromises = idsArray.map((id) => retryMutation.mutateAsync(id));
            const results = await Promise.allSettled(retryPromises);

            const successes = results.filter((r) => r.status === 'fulfilled').length;
            const failures = results.filter((r) => r.status === 'rejected').length;

            if (failures === 0) {
                toast.success(
                    `Retry requested for ${successes} report${successes > 1 ? 's' : ''}.`,
                );
            } else if (successes === 0) {
                toast.error(
                    `Failed to retry ${failures} report${failures > 1 ? 's' : ''}.`,
                );
            } else {
                toast.info(
                    `Retry requested for ${successes} report${successes > 1 ? 's' : ''}, ${failures} failed.`,
                );
            }

            // Important: do NOT refetch here; retry is async and refetching causes a full table rerender.
            setSelectedReports([]);
        } catch (error) {
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
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), reports_page: 1 } as any,
            replace: true,
        });
    };

    const handleStatusChange = (status: string) => {
        setColumnFilters((prev) => ({
            ...prev,
            status,
        }));
        // Reset to first page when status filter changes
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), reports_page: 1 } as any,
            replace: true,
        });
    };

    // Convert sortField and sortDirection to TanStack Table sorting state
    const sorting = useMemo<SortingState>(() => {
        const columnId =
            Object.keys(sortFieldMapping).find(
                (key) => sortFieldMapping[key] === sortField,
            ) || sortField;

        return columnId
            ? [
                  {
                      id: columnId,
                      desc: sortDirection === 'desc',
                  },
              ]
            : [];
    }, [sortField, sortDirection]);

    // Define filterable columns with their handlers
    const filterableColumns: Record<string, (value: string | DateRangeFilter) => void> =
        {
            user: (value) => handleColumnFilterChange('user', value),
            createdAt: (value) => handleColumnFilterChange('createdAt', value),
        };

    const handleDownload = async (reportIds: string | string[]) => {
        const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];
        try {
            const reports = await Promise.all(
                idsArray.map((id) =>
                    fetchReportMutation.mutateAsync({ id, downloadUrl: true }),
                ),
            );

            reports.forEach((report) => {
                if (report.reportUrl) {
                    window.open(report.reportUrl, '_blank', 'noopener');
                } else {
                    toast.error('Report URL not found for report ' + report.title);
                }
            });

            toast.success(
                `${idsArray.length > 1 ? 'Reports' : 'Report'} downloaded successfully`,
            );
        } catch (error) {
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
        const tooltipColorClass =
            status === 'error'
                ? 'bg-destructive text-destructive-foreground'
                : status === 'warning'
                  ? 'bg-accent text-accent-foreground'
                  : '';

        if ((status === 'error' || status === 'warning') && errorMessage) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className='inline-flex items-center align-middle flex-shrink-0'>
                            {icon}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side='right' className={tooltipColorClass}>
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
                <TooltipContent side='right'>{tooltipContent}</TooltipContent>
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
                        onCheckedChange={(value) =>
                            table.toggleAllPageRowsSelected(!!value)
                        }
                        aria-label='Select all'
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label='Select row'
                        onClick={(e) => e.stopPropagation()}
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: 'title',
                id: 'title',
                header: () => <span>Title</span>,
                cell: ({ row }) => (
                    <div
                        className='text-foreground cursor-pointer'
                        onClick={async () => {
                            try {
                                const details = await fetchReportMutation.mutateAsync({
                                    id: row.original.id!,
                                    downloadUrl: false,
                                });
                                if (details.reportUrl) {
                                    window.open(details.reportUrl, '_blank');
                                } else {
                                    toast.error(
                                        'Report URL not found for report ' +
                                            details.title,
                                    );
                                }
                            } catch (error) {
                                // Error handled by mutation
                            }
                        }}
                    >
                        <div className='flex items-center gap-2 min-w-0'>
                            <span className='inline-flex items-center flex-shrink-0'>
                                {getStatusIcon(
                                    row.original.status,
                                    row.original.errorMessage || undefined,
                                )}
                            </span>
                            <span className='truncate'>
                                {truncateText(row.original.title, 50)}
                            </span>
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: 'strategy',
                id: 'strategy',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title='Strategy' />
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
                    <DataTableColumnHeader column={column} title='Anonymized' />
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
                        <div className='flex items-center gap-2'>
                            <DataTableColumnHeader column={column} title='Created At' />
                            {filterValue?.from && filterValue?.to && (
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
                        try {
                            const details = await fetchReportMutation.mutateAsync({
                                id: report.id!,
                                downloadUrl: false,
                            });
                            if (details.reportUrl) {
                                window.open(details.reportUrl, '_blank');
                            } else {
                                toast.error('No report location available');
                            }
                        } catch (error) {
                            // Error handled by mutation
                        }
                    };

                    const handleEdit = () => {
                        router.navigate({ to: `/publish?report=${report.id}` as any });
                    };

                    const handleRetry = async () => {
                        retryMutation.mutate(report.id!, {
                            onSuccess: () => {
                                toast.success('Retrying to build report!');
                            },
                            onError: () => {
                                toast.error('Failed to retry report');
                            },
                        });
                    };

                    const handleDelete = () => {
                        setDeletingReportId(report.id!);
                        setSingleDeleteModalOpen(true);
                    };

                    return (
                        <div
                            className='w-12 text-right'
                            onClick={(e) => e.stopPropagation()}
                        >
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
                                    <DropdownMenuItem
                                        onClick={handleDelete}
                                        variant='destructive'
                                    >
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
        [
            columnFilters,
            handleStatusChange,
            getStatusIcon,
            fetchReportMutation,
            reportsApi,
            router,
            deleteMutation,
            retryMutation,
        ],
    );

    // Handle row selection
    const handleRowSelectionChange = useCallback((selectedIds: string[]) => {
        setSelectedReports(selectedIds);
    }, []);

    return (
        <div className='w-full h-full'>
            <PageHeader title='Reports' description='Manage & View Your Reports' />

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
                            label: 'Download',
                            icon: <Download width={18} height={18} />,
                            onClick: () => handleDownload(selectedReports),
                            disabled:
                                loading ||
                                reports.length === 0 ||
                                selectedReports.length === 0,
                        },
                        {
                            id: 'retry',
                            label: 'Retry',
                            icon: <RefreshCircle width={18} height={18} />,
                            onClick: () => handleRetry(selectedReports),
                            disabled:
                                loading ||
                                reports.length === 0 ||
                                selectedReports.length === 0,
                        },
                        {
                            id: 'delete',
                            label: 'Delete',
                            icon: <Trash width={18} height={18} />,
                            onClick: () => handleDelete(selectedReports),
                            disabled:
                                loading ||
                                reports.length === 0 ||
                                selectedReports.length === 0,
                            variant: 'destructive',
                        },
                    ]}
                    itemLabel='report'
                    manualSorting={true}
                    pageCount={totalPages}
                    initialPageIndex={page - 1}
                    initialPageSize={pageSize}
                    onPaginationChange={handlePaginationChange}
                    showPagination={true}
                />
            </div>
            <ConfirmDeletionModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                text={`Are you sure you want to delete these ${deletingReportIds.length > 1 ? 'reports' : 'report'}? This action is irreversible.`}
                onConfirm={() => executeDelete(deletingReportIds)}
            />
            {deletingReportId && (
                <ConfirmDeletionModal
                    open={singleDeleteModalOpen}
                    onOpenChange={(open) => {
                        setSingleDeleteModalOpen(open);
                        if (!open) setDeletingReportId(null);
                    }}
                    text='Are you sure you want to delete this report?'
                    onConfirm={async () => {
                        if (deletingReportId) {
                            deleteMutation.mutate(deletingReportId, {
                                onSuccess: () => {
                                    toast.success('Report deleted successfully');
                                },
                                onError: () => {
                                    toast.error('Failed to delete report');
                                },
                            });
                        }
                    }}
                />
            )}
        </div>
    );
}
