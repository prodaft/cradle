import type { SortDirection } from '@/components/base/ListView/types';
import ConfirmDeletionModal from '@/components/dialogs/base/ConfirmDeletionModal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import { ReportList as ReportListModel } from '@/services/cradle';
import { capitalizeString, truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { ActionBar, ActionBarButton } from '@components/base/ActionBar/ActionBar';
import StatusHeaderDropdown from '@components/base/StatusHeaderDropdown/StatusHeaderDropdown';
import TableActionsButton from '@components/base/TableActionsButton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    useParams,
    useRouter,
    useRouterState,
    useSearch,
} from '@tanstack/react-router';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import {
    Edit,
    Eye,
    InfoCircleSolid,
    PlusCircle,
    RefreshCircle,
    Trash,
    WarningCircleSolid,
    WarningTriangleSolid,
} from 'iconoir-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import OfflineIndicator from '../../feedback/OfflineIndicator';

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
    const { report_id } = useParams({ strict: false });
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/reports/$report_id' });
    const [page, setPage] = useState(1);
    const [sortField, setSortField] = useState(
        (search as any)?.reports_sort_field || 'created_at',
    );
    const [sortDirection, setSortDirection] = useState<SortDirection>(
        (search as any)?.reports_sort_direction || 'desc',
    );
    const { reportsApi } = useApi();
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
    const [selectedReports, setSelectedReports] = useState<string[]>([]);
    const [pageSize, setPageSize] = useState((search as any)?.reports_pagesize || 10);
    const [statusFilter, setStatusFilter] = useState('all');
    const queryClient = useQueryClient();

    const fetchReportDetailsMutation = useMutation({
        mutationFn: async (id: string) => {
            return await reportsApi.reportsRetrieve({ id, downloadUrl: false });
        },
        meta: {
            suppressNotification: true,
        },
    });

    // Mapping of table columns to API field names
    const sortFieldMapping: Record<string, string> = {
        title: 'title',
        author: 'user__username',
        strategy: 'strategy',
        createdAt: 'created_at',
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

            // Reset to first page when sorting changes
            setPage(1);
            const newSearch: any = {
                ...search,
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
                search: newSearch,
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    // Query for single report
    const {
        data: singleReport,
        isPending: isPendingSingle,
        isPaused: isPausedSingle,
    } = useQuery({
        queryKey: queryKeys.reports.detail(report_id || ''),
        queryFn: () => reportsApi.reportsRetrieve({ id: report_id! }),
        enabled: !!report_id,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    // Query for reports list
    const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
    const {
        data: reportsData,
        isPending: isPendingList,
        isPaused: isPausedList,
    } = useQuery({
        queryKey: queryKeys.reports.list({
            page,
            pageSize,
            sortField,
            sortDirection,
        }),
        queryFn: () =>
            reportsApi.reportsList({
                page,
                pageSize: pageSize,
                orderBy,
            }),
        enabled: !report_id,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    // Client-side status filtering
    const reports = useMemo(() => {
        if (report_id && singleReport) {
            return [singleReport];
        }
        if (!reportsData) {
            return [];
        }
        let filteredResults = reportsData.results;
        if (statusFilter && statusFilter !== 'all') {
            filteredResults = reportsData.results.filter(
                (report) => report.status === statusFilter,
            );
        }
        return filteredResults;
    }, [report_id, singleReport, reportsData, statusFilter]);

    const totalPages = reportsData?.totalPages || 1;
    const loading = report_id
        ? isPendingSingle && !isPausedSingle
        : isPendingList && !isPausedList;
    const isPaused = report_id ? isPausedSingle : isPausedList;

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
    }, [search, page, sortField, sortDirection, pageSize]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    // Handle pagination changes from DataTable
    const handlePaginationChange = useCallback(
        (pageIndex: number, newPageSize: number) => {
            const newPage = pageIndex + 1; // Convert 0-based to 1-based

            // Handle page size change
            if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
                setPage(1);
            }
            // Handle page change
            else if (newPage !== page) {
                handlePageChange(newPage);
            }
        },
        [page, pageSize],
    );

    const handleStatusChange = (status: string) => {
        setStatusFilter(status);
        setPage(1);
    };

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => reportsApi.reportsDestroy({ id }),
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.reports.lists() }],
        },
    });

    // Retry mutation
    const retryMutation = useMutation({
        mutationFn: (id: string) => reportsApi.reportsRetryCreate({ id }),
        // Note: We don't invalidate queries here because retry is async and refetching causes a full table rerender
        invalidateQueries: [],
    });

    const executeBulkDelete = async (selectedIds: string[]) => {
        try {
            // Send all delete requests in parallel
            const deletePromises = selectedIds.map((id) =>
                deleteMutation.mutateAsync(id),
            );
            const results = await Promise.allSettled(deletePromises);

            // Count successes and failures
            const successes = results.filter((r) => r.status === 'fulfilled').length;
            const failures = results.filter((r) => r.status === 'rejected').length;

            if (failures === 0) {
                toast.success(
                    `Successfully deleted ${successes} report${successes > 1 ? 's' : ''}`,
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

            // Clear selection
            setSelectedReports([]);
        } catch (error) {
            toast.error('An unexpected error occurred while deleting reports');
        }
    };

    // Define actions for the ActionBar
    const actions: Action[] = [
        {
            value: 'delete',
            label: 'Delete',
            handler: async (selectedIds: string[]) => {
                setBulkDeleteModalOpen(true);
            },
        },
    ];

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
                    <TooltipContent className={tooltipColorClass}>
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
                <TooltipContent>{tooltipContent}</TooltipContent>
            </Tooltip>
        );
    };

    // Memoize columns to prevent recreation on every render
    const columns = useMemo<ColumnDef<ReportListModel>[]>(
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
                id: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <div className='w-20'>
                        <div className='flex items-center'>
                            {getStatusIcon(
                                row.original.status,
                                row.original.errorMessage || undefined,
                            )}
                        </div>
                    </div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'title',
                id: 'title',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title='Title' />
                ),
                cell: ({ row }) => (
                    <div
                        className='truncate max-w-xs font-medium'
                        title={row.original.title}
                    >
                        {row.original.title}
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
                    <div className='truncate w-24' title={row.original?.strategyLabel}>
                        {truncateText(row.original?.strategyLabel, 24)}
                    </div>
                ),
            },
            {
                accessorKey: 'createdAt',
                id: 'createdAt',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title='Created At' />
                ),
                cell: ({ row }) => (
                    <div className='w-36'>
                        {formatDate(new Date(row.original.createdAt || ''))}
                    </div>
                ),
            },
            {
                accessorKey: 'anonymized',
                id: 'anonymized',
                header: 'Anonymized',
                cell: ({ row }) => (
                    <div className='w-24'>
                        {row.original?.anonymized ? 'Yes' : 'No'}
                    </div>
                ),
                enableSorting: false,
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const report = row.original;
                    const handleView = async () => {
                        try {
                            const details =
                                await fetchReportDetailsMutation.mutateAsync(
                                    report.id!,
                                );
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
                        router.navigate({
                            to: '/publish' as any,
                            search: { report: report.id } as any,
                        });
                    };

                    const handleRetry = () => {
                        retryMutation.mutate(report.id!, {
                            onSuccess: () => {
                                queryClient.invalidateQueries({
                                    queryKey: queryKeys.reports.lists(),
                                });
                            },
                        });
                    };

                    const handleDelete = () => {
                        setDeletingReportId(report.id!);
                        setDeleteModalOpen(true);
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
            handleStatusChange,
            statusFilter,
            getStatusIcon,
            fetchReportDetailsMutation,
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
        <div className='w-full h-full flex flex-col space-y-3'>
            <h1 className='text-3xl font-semibold mb-4'>
                {report_id ? (
                    'Report Details'
                ) : (
                    <div className='flex items-center'>
                        Reports
                        <Button
                            variant='ghost'
                            size='icon'
                            className='justify-center ml-2 text-primary hover:bg-muted hover:text-foreground'
                            onClick={() => router.navigate({ to: '/publish' as any })}
                        >
                            <PlusCircle width={24} height={24} />
                        </Button>
                    </div>
                )}
            </h1>

            {!report_id ? (
                <>
                    {!loading && (
                        <ActionBar
                            left={
                                <ActionBarButton
                                    tooltip='Create new report'
                                    variant='circle'
                                    icon={<PlusCircle width={18} height={18} />}
                                    iconActive={true}
                                    onClick={() =>
                                        router.navigate({ to: '/publish' as any })
                                    }
                                />
                            }
                            right={
                                <>
                                    <StatusHeaderDropdown
                                        onStatusChange={handleStatusChange}
                                        status={statusFilter}
                                        statusOptions={[
                                            'all',
                                            'done',
                                            'working',
                                            'error',
                                        ]}
                                    />
                                </>
                            }
                        />
                    )}

                    {isPaused && (
                        <div className='mb-4'>
                            <OfflineIndicator />
                        </div>
                    )}

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
                        manualSorting={true}
                        pageCount={totalPages}
                        initialPageIndex={page - 1}
                        initialPageSize={pageSize}
                        onPaginationChange={handlePaginationChange}
                        showPagination={true}
                        bulkActions={[
                            {
                                id: 'delete',
                                label: 'Delete',
                                icon: <Trash width={18} height={18} />,
                                onClick: () => {
                                    if (selectedReports.length > 0) {
                                        actions[0].handler(selectedReports);
                                    }
                                },
                                disabled:
                                    selectedReports.length === 0 ||
                                    reports.length === 0,
                                variant: 'destructive',
                            },
                        ]}
                        itemLabel='report'
                    />
                </>
            ) : isPaused ? (
                <div className='mb-4'>
                    <OfflineIndicator />
                </div>
            ) : loading ? (
                <p className='text-muted-foreground'>Loading reports...</p>
            ) : reports.length > 0 ? (
                <div className='text-muted-foreground'>
                    {/* Individual report view - ReportCard component not yet converted */}
                    <p>Report details view not yet implemented</p>
                </div>
            ) : (
                <p className='text-muted-foreground'>No reports found.</p>
            )}
            <ConfirmDeletionModal
                open={bulkDeleteModalOpen}
                onOpenChange={setBulkDeleteModalOpen}
                text={`Are you sure you want to delete ${selectedReports.length} report${selectedReports.length > 1 ? 's' : ''}? This action is irreversible.`}
                onConfirm={() => executeBulkDelete(selectedReports)}
            />
            {deletingReportId && (
                <ConfirmDeletionModal
                    open={deleteModalOpen}
                    onOpenChange={(open) => {
                        setDeleteModalOpen(open);
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
