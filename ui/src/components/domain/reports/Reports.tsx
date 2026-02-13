import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import ConfirmDeletionDialog from '@/components/dialogs/base/ConfirmDeletionDialog';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/ui/action-bar';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/use-api';
import { queryKeys } from '@/hooks/query';
import { ReportList } from '@/services/cradle';
import { parseAPIError } from '@/utils/api';
import { truncateText } from '@/utils/dashboard';
import { ActionBarSearch } from '@components/base/ActionBar/ActionBar';
import { DateRangeFilter } from '@components/base/ListView/types';
import PageHeader from '@components/base/PageHeader';
import StatusHeaderDropdown from '@components/base/StatusHeaderDropdown/StatusHeaderDropdown';
import { ArrowsClockwiseIcon, DownloadIcon, TrashIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    type SortingState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { startCase } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { StatusIcon, type StatusType } from '../notes/StatusIcon';

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
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingReportIds, setDeletingReportIds] = useState<string[]>([]);
    const [singleDeleteDialogOpen, setSingleDeleteDialogOpen] = useState(false);
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
    const [pageSize, setPageSize] = useState((search as any)?.reports_pagesize || 20);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchQuery, setSearchQuery] = useState('');

    const selectedReportIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );
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
        const pageSizeFromParams = searchAny?.reports_pagesize || 20;

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
            search: searchQuery || undefined,
        }),
        queryFn: () =>
            reportsApi.reportsList({
                page: queryParams.page,
                pageSize: queryParams.page_size,
                orderBy: queryParams.order_by,
                search: searchQuery || undefined,
                status:
                    columnFilters.status && columnFilters.status !== 'all'
                        ? columnFilters.status
                        : undefined,
            }),
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch reports',
        },
    });

    const reports = reportsData?.results ?? [];

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
        setDeleteDialogOpen(true);
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

            setRowSelection({});
        } catch (error) {
            const parsed = await parseAPIError(error);
            toast.error(parsed.detail);
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
            setRowSelection({});
        } catch (error) {
            const parsed = await parseAPIError(error);
            toast.error(parsed.detail);
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
            const parsed = await parseAPIError(error);
            toast.error(parsed.detail);
        }
    };

    const getStatusIcon = (status?: string, errorMessage?: string) => {
        if (!status) return null;

        const tooltipContent = errorMessage || startCase(status);
        const tooltipColorClass =
            status === 'error'
                ? '[--tooltip-bg:var(--destructive)] [--tooltip-fg:var(--destructive-foreground)] whitespace-pre-line'
                : status === 'warning'
                  ? '[--tooltip-bg:var(--chart-4)] [--tooltip-fg:var(--foreground)] whitespace-pre-line'
                  : '';

        if ((status === 'error' || status === 'warning') && errorMessage) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className='inline-flex items-center flex-shrink-0'>
                            <StatusIcon status={status as StatusType} />
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
                    <span className='inline-flex items-center flex-shrink-0'>
                        <StatusIcon status={status as StatusType} />
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
                size: 28,
                minSize: 28,
                maxSize: 28,
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
                header: 'Title',
                cell: ({ row }) => (
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
                ),
            },
            {
                accessorKey: 'strategy',
                id: 'strategy',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Strategy' />
                ),
                cell: ({ row }) => (
                    <div className='text-foreground'>
                        {startCase(row.original.strategy || 'N/A')}
                    </div>
                ),
            },
            {
                accessorKey: 'anonymized',
                id: 'anonymized',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Anonymized' />
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
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Created At' />
                ),
                cell: ({ row }) => (
                    <div className='w-36'>
                        {row.original.createdAt
                            ? format(
                                  new Date(row.original.createdAt),
                                  'dd/MM/yyyy, HH:mm',
                              )
                            : 'N/A'}
                    </div>
                ),
            },
        ],
        [columnFilters, getStatusIcon],
    );

    const onTableSortingChange = useCallback(
        (updater: SortingState | ((prev: SortingState) => SortingState)) => {
            const nextSorting =
                typeof updater === 'function' ? updater(sorting) : updater;
            handleSortingChange(nextSorting);
        },
        [handleSortingChange, sorting],
    );

    const table = useReactTable({
        data: reports,
        columns,
        state: {
            sorting,
            rowSelection,
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
        },
        getRowId: (row, index) => String(row.id ?? index),
        onSortingChange: onTableSortingChange,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: (updater) => {
            const currentPagination = {
                pageIndex: page - 1,
                pageSize,
            };
            const nextPagination =
                typeof updater === 'function' ? updater(currentPagination) : updater;
            handlePaginationChange(nextPagination.pageIndex, nextPagination.pageSize);
        },
        getCoreRowModel: getCoreRowModel(),
        enableRowSelection: true,
        manualPagination: true,
        manualSorting: true,
        pageCount: totalPages,
    });

    return (
        <div className='w-full h-full space-y-4'>
            <PageHeader title='Reports' description='Manage & View Your Reports' />

            {/* Content Area */}
            <div className='flex flex-col space-y-4 px-4 pb-4'>
                {loading ? (
                    <div className='flex min-h-[200px] items-center justify-center'>
                        <Spinner className='size-10' />
                    </div>
                ) : (
                    <DataTable
                        table={table}
                        showViewOptions
                        onRowClick={async (report) => {
                            try {
                                const details = await fetchReportMutation.mutateAsync({
                                    id: report.id!,
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
                        <div className='flex items-center gap-2'>
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
                            <StatusHeaderDropdown
                                onStatusChange={handleStatusChange}
                                status={columnFilters.status}
                                statusOptions={['all', 'done', 'working', 'error']}
                            />
                        </div>
                    </DataTable>
                )}
            </div>
            <ActionBar
                open={selectedReportIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) setRowSelection({});
                }}
            >
                <ActionBarSelection>
                    {selectedReportIds.length} report
                    {selectedReportIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={() => handleDownload(selectedReportIds)}
                        disabled={
                            loading ||
                            reports.length === 0 ||
                            selectedReportIds.length === 0
                        }
                    >
                        <DownloadIcon size={18} weight='bold' />
                        Download
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={() => handleRetry(selectedReportIds)}
                        disabled={
                            loading ||
                            reports.length === 0 ||
                            selectedReportIds.length === 0
                        }
                    >
                        <ArrowsClockwiseIcon size={18} weight='bold' />
                        Retry
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={() => handleDelete(selectedReportIds)}
                        disabled={
                            loading ||
                            reports.length === 0 ||
                            selectedReportIds.length === 0
                        }
                        className='text-destructive'
                    >
                        <TrashIcon size={18} weight='bold' />
                        Delete
                    </ActionBarItem>
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose className='px-2 text-sm'>Clear</ActionBarClose>
            </ActionBar>
            <ConfirmDeletionDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                text={`Are you sure you want to delete ${deletingReportIds.length} ${deletingReportIds.length > 1 ? 'reports' : 'report'}? This action is irreversible.`}
                onConfirm={() => executeDelete(deletingReportIds)}
            />
            {deletingReportId && (
                <ConfirmDeletionDialog
                    open={singleDeleteDialogOpen}
                    onOpenChange={(open) => {
                        setSingleDeleteDialogOpen(open);
                        if (!open) setDeletingReportId(null);
                    }}
                    text='Are you sure you want to delete this report?'
                    onConfirm={async () => {
                        if (deletingReportId) {
                            deleteMutation.mutate(deletingReportId, {
                                onSuccess: () => {
                                    toast.success('Report deleted successfully');
                                },
                            });
                        }
                    }}
                />
            )}
        </div>
    );
}
