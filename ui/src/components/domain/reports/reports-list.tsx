import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/custom/action-bar';
import { DataTable } from '@/components/custom/data-table/data-table';
import { DataTableColumnHeader } from '@/components/custom/data-table/data-table-column-header';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryKeys } from '@/hooks/query';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import { truncateText } from '@/utils/dashboard';
import { ActionBarSearch } from '@components/base/action-bar/action-bar';
import PageHeader from '@components/base/page-header';
import StatusHeaderDropdown from '@components/base/status-header-dropdown/status-header-dropdown';
import { ArrowsClockwiseIcon, DownloadIcon, TrashIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components, operations } from '@services/openapi/schema';
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
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { StatusIcon, type StatusType } from '../notes/status-icon';

type ReportList = components['schemas']['ReportList'];

type ReportsListQuery = NonNullable<operations['reports_list']['parameters']['query']>;

const SORT_FIELD_MAPPING: Record<string, string> = {
    title: 'title',
    strategy: 'strategy',
    anonymized: 'anonymized',
    created_at: 'created_at',
    user: 'user__username',
};

const renderStatusIcon = (status?: string, errorMessage?: string) => {
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

/**
 * `/reports` route: reports index with URL-backed filters (combined shell + table).
 */
export default function ReportsList() {
    useDockPanelTab({ title: 'Reports', icon: 'reports' });
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/reports' });
    const searchAny = search as any;
    const page = Number(searchAny?.reports_page ?? 1) || 1;
    const sortField = (searchAny?.reports_sort_field ?? 'created_at') as string;
    const sortDirection: 'asc' | 'desc' = (searchAny?.reports_sort_direction ??
        'desc') as 'asc' | 'desc';
    const pageSize = Number(searchAny?.reports_pagesize ?? 20) || 20;

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingReportIds, setDeletingReportIds] = useState<string[]>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const queryClient = useQueryClient();

    const fetchReportMutation = useMutation({
        mutationFn: async ({
            id,
            downloadUrl,
        }: {
            id: string;
            downloadUrl: boolean;
        }) => {
            const { data, error, response } = await fetchClient.GET('/reports/{id}/', {
                params: {
                    path: { id },
                    query: {
                        download_url: downloadUrl,
                    },
                },
            });
            if (error) throw { response, error };
            return data!;
        },
        meta: {
            suppressNotification: true,
        },
    });

    const selectedReportIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const orderBy = useMemo(
        () => (sortDirection === 'desc' ? `-${sortField}` : sortField),
        [sortDirection, sortField],
    );

    const reportsListQuery = useMemo((): ReportsListQuery => {
        return Object.fromEntries(
            Object.entries({
                page,
                page_size: pageSize,
                order_by: orderBy,
                search: searchQuery || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
            }).filter(([, v]) => v !== undefined),
        ) as ReportsListQuery;
    }, [page, pageSize, orderBy, searchQuery, statusFilter]);

    const { data: reportsData, isLoading } = useQuery({
        queryKey: queryKeys.reports.list({
            page,
            pageSize,
            sortField,
            sortDirection,
            statusFilter,
            search: searchQuery || undefined,
        }),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET('/reports/', {
                params: {
                    query: reportsListQuery,
                },
            });
            if (error) throw { response, error };
            return data!;
        },
        meta: {
            showErrorToast: true,
        },
    });

    const reports = reportsData?.results ?? [];

    const totalPages = reportsData?.total_pages || 1;

    const resetToFirstPage = useCallback(() => {
        router.navigate({
            to: location.pathname as any,
            search: { ...searchAny, reports_page: 1 } as any,
            replace: true,
        });
    }, [searchAny, router, location.pathname]);

    const handlePageChange = useCallback(
        (newPage: number) => {
            router.navigate({
                to: location.pathname as any,
                search: { ...searchAny, reports_page: newPage } as any,
                replace: true,
            });
        },
        [searchAny, router, location.pathname],
    );

    const handlePaginationChange = useCallback(
        (pageIndex: number, newPageSize: number) => {
            const newPage = pageIndex + 1;
            if (newPageSize !== pageSize) {
                router.navigate({
                    to: location.pathname as any,
                    search: {
                        ...searchAny,
                        reports_page: 1,
                        reports_pagesize: newPageSize,
                    } as any,
                    replace: true,
                });
            } else if (newPage !== page) {
                handlePageChange(newPage);
            }
        },
        [page, pageSize, searchAny, router, location.pathname, handlePageChange],
    );

    const handleSortingChange = useCallback(
        (sorting: SortingState) => {
            const newSearch: any = {
                ...searchAny,
                reports_page: 1,
            };
            if (sorting.length === 0) {
                newSearch.reports_sort_field = 'created_at';
                newSearch.reports_sort_direction = 'desc';
            } else {
                const sort = sorting[0];
                if (!sort) {
                    newSearch.reports_sort_field = 'created_at';
                    newSearch.reports_sort_direction = 'desc';
                } else {
                    const apiField = SORT_FIELD_MAPPING[sort.id] || sort.id;
                    newSearch.reports_sort_field = apiField;
                    newSearch.reports_sort_direction = sort.desc ? 'desc' : 'asc';
                }
            }
            router.navigate({
                to: location.pathname as any,
                search: newSearch as any,
                replace: true,
            });
        },
        [searchAny, router, location.pathname],
    );

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error, response } = await fetchClient.DELETE('/reports/{id}/', {
                params: { path: { id } },
            });
            if (error) throw { response, error };
        },
        meta: { suppressNotification: true },
    });

    const handleDelete = async (reportIds: string | string[]) => {
        const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];
        setDeletingReportIds(idsArray);
        setDeleteDialogOpen(true);
    };

    const executeDelete = async (idsArray: string[]) => {
        try {
            const deletePromises = idsArray.map((id) => deleteMutation.mutateAsync(id));
            const results = await Promise.allSettled(deletePromises);

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

            await queryClient.invalidateQueries({
                queryKey: queryKeys.reports.lists(),
            });

            setRowSelection({});
        } catch (error) {
            const parsed = await parseAPIError(error);
            toast.error(getDisplayMessage(parsed));
        } finally {
            setDeleteDialogOpen(false);
            setDeletingReportIds([]);
        }
    };

    const retryMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error, response } = await fetchClient.POST('/reports/{id}/retry/', {
                params: { path: { id } },
            });
            if (error) throw { response, error };
        },
        meta: {
            suppressNotification: true,
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

            setRowSelection({});
        } catch (error) {
            const parsed = await parseAPIError(error);
            toast.error(getDisplayMessage(parsed));
        }
    };

    const handleStatusChange = useCallback(
        (status: string) => {
            setStatusFilter(status);
            resetToFirstPage();
        },
        [resetToFirstPage],
    );

    const sorting = useMemo<SortingState>(() => {
        const columnId =
            Object.keys(SORT_FIELD_MAPPING).find(
                (key) => SORT_FIELD_MAPPING[key] === sortField,
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

    const handleDownload = async (reportIds: string | string[]) => {
        const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];
        try {
            const reports = await Promise.all(
                idsArray.map((id) =>
                    fetchReportMutation.mutateAsync({ id, downloadUrl: true }),
                ),
            );

            reports.forEach((report) => {
                if (report.report_url) {
                    window.open(report.report_url, '_blank', 'noopener');
                } else {
                    toast.error('Report URL not found for report ' + report.title);
                }
            });

            toast.success(
                `${idsArray.length > 1 ? 'Reports' : 'Report'} downloaded successfully`,
            );
        } catch (error) {
            const parsed = await parseAPIError(error);
            toast.error(getDisplayMessage(parsed));
        }
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
                            {renderStatusIcon(
                                row.original.status,
                                row.original.error_message || undefined,
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
                accessorKey: 'created_at',
                id: 'created_at',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Created At' />
                ),
                cell: ({ row }) => (
                    <div className='w-36'>
                        {row.original.created_at
                            ? format(
                                  new Date(row.original.created_at),
                                  'dd/MM/yyyy, HH:mm',
                              )
                            : 'N/A'}
                    </div>
                ),
            },
        ],
        [],
    );

    const onTableSortingChange = useCallback(
        (updater: SortingState | ((prev: SortingState) => SortingState)) => {
            const nextSorting =
                typeof updater === 'function' ? updater(sorting) : updater;
            handleSortingChange(nextSorting);
        },
        [handleSortingChange, sorting],
    );

    const table = useReactTable<ReportList>({
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
                <DataTable
                    table={table}
                    showViewOptions
                    isLoading={isLoading}
                    onRowClick={async (report) => {
                        try {
                            const details = await fetchReportMutation.mutateAsync({
                                id: report.id!,
                                downloadUrl: false,
                            });
                            if (details.report_url) {
                                window.open(details.report_url, '_blank');
                            } else {
                                toast.error(
                                    'Report URL not found for report ' + details.title,
                                );
                            }
                        } catch (_error) {
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
                            status={statusFilter}
                            statusOptions={['all', 'done', 'working', 'error']}
                        />
                    </div>
                </DataTable>
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
                            isLoading ||
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
                            isLoading ||
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
                            isLoading ||
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
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {deletingReportIds.length}{' '}
                            {deletingReportIds.length > 1 ? 'reports' : 'report'}? This
                            action is irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            size='sm'
                            onClick={() => executeDelete(deletingReportIds)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
