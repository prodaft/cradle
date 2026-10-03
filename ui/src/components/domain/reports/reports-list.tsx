import { ActionBarSearch } from '@/components/base/action-bar-controls/action-bar-controls';
import PageHeader from '@/components/base/page-header';
import StatusHeaderDropdown from '@/components/base/status-header-dropdown/status-header-dropdown';
import { StatusIcon, type StatusType } from '@/components/base/status-icon/status-icon';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryKeys } from '@/hooks/query';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import { truncateText } from '@/utils/dashboard';
import {
    ArrowsClockwiseIcon,
    DotsThreeIcon,
    DownloadIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components, operations } from '@services/openapi/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
    type RowSelectionState,
    type SortingState,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { startCase } from 'lodash';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FILTER_OPTIONS, parseParam, toFilterValue } from './report-list-status';

type ReportRow = components['schemas']['ReportList'];

type ListQuery = NonNullable<operations['reports_list']['parameters']['query']>;

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
    const statusFilter = parseParam(search.status);
    const page = Number(search.reports_page ?? 1) || 1;
    const sortField = search.reports_sort_field ?? 'created_at';
    const sortDirection: 'asc' | 'desc' = search.reports_sort_direction ?? 'desc';
    const pageSize = Number(search.reports_pagesize ?? 20) || 20;
    const appliedSearch = search.search ?? '';

    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const queryClient = useQueryClient();

    const applySearch = useCallback(
        (value: string) => {
            const next: Record<string, unknown> = { ...search, reports_page: 1 };
            if (value) {
                next.search = value;
            } else {
                delete next.search;
            }
            router.navigate({
                to: location.pathname as any,
                search: next as any,
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    const { mutateAsync: fetchReport } = useMutation({
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

    const checkedIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const orderBy = useMemo(
        () => (sortDirection === 'desc' ? `-${sortField}` : sortField),
        [sortDirection, sortField],
    );

    const listQuery = useMemo((): ListQuery => {
        return Object.fromEntries(
            Object.entries({
                page,
                page_size: pageSize,
                order_by: orderBy,
                search: appliedSearch || undefined,
                status: statusFilter,
            }).filter(([, v]) => v !== undefined),
        ) as ListQuery;
    }, [page, pageSize, orderBy, appliedSearch, statusFilter]);

    const { data: reports, isLoading } = useQuery({
        queryKey: queryKeys.reports.list(listQuery),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET('/reports/', {
                params: {
                    query: listQuery,
                },
            });
            if (error) throw { response, error };
            return data!;
        },
        meta: {
            showErrorToast: true,
        },
    });

    const rows = reports?.results ?? [];

    const totalPages = reports?.total_pages || 1;

    const goTo = useCallback(
        (target: number) => {
            router.navigate({
                to: location.pathname as any,
                search: ((prev: any) => ({ ...prev, reports_page: target })) as any,
                replace: true,
            });
        },
        [router, location.pathname],
    );

    const paginate = useCallback(
        (pageIndex: number, size: number) => {
            const target = pageIndex + 1;
            if (size !== pageSize) {
                router.navigate({
                    to: location.pathname as any,
                    search: {
                        ...search,
                        reports_page: 1,
                        reports_pagesize: size,
                    } as any,
                    replace: true,
                });
            } else if (target !== page) {
                goTo(target);
            }
        },
        [page, pageSize, search, router, location.pathname, goTo],
    );

    const applySort = useCallback(
        (sorting: SortingState) => {
            const next: Record<string, unknown> = {
                ...search,
                reports_page: 1,
            };
            if (sorting.length === 0) {
                next.reports_sort_field = 'created_at';
                next.reports_sort_direction = 'desc';
            } else {
                const entry = sorting[0];
                if (!entry) {
                    next.reports_sort_field = 'created_at';
                    next.reports_sort_direction = 'desc';
                } else {
                    const apiField = SORT_FIELD_MAPPING[entry.id] || entry.id;
                    next.reports_sort_field = apiField;
                    next.reports_sort_direction = entry.desc ? 'desc' : 'asc';
                }
            }
            router.navigate({
                to: location.pathname as any,
                search: next as any,
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    const updateStatus = useCallback(
        (value: string) => {
            const next: Record<string, unknown> = { ...search, reports_page: 1 };
            const parsed = parseParam(value);
            if (parsed) {
                next.status = parsed;
            } else {
                delete next.status;
            }
            router.navigate({
                to: location.pathname as any,
                search: next as any,
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    const { mutateAsync: deleteReport } = useMutation({
        mutationFn: async (id: string) => {
            const { error, response } = await fetchClient.DELETE('/reports/{id}/', {
                params: { path: { id } },
            });
            if (error) throw { response, error };
        },
        meta: { suppressNotification: true },
    });

    const confirmDelete = useCallback((ids: string | string[]) => {
        const list = Array.isArray(ids) ? ids : [ids];
        setPendingDeleteIds(list);
        setIsDeleteOpen(true);
    }, []);

    const deleteReports = async (ids: string[]) => {
        try {
            const results = await Promise.allSettled(ids.map((id) => deleteReport(id)));

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
            setIsDeleteOpen(false);
            setPendingDeleteIds([]);
        }
    };

    const { mutateAsync: retryReport } = useMutation({
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

    const retry = useCallback(
        async (ids: string | string[]) => {
            const list = Array.isArray(ids) ? ids : [ids];

            if (list.length === 0) return;

            try {
                const results = await Promise.allSettled(
                    list.map((id) => retryReport(id)),
                );

                const successes = results.filter(
                    (r) => r.status === 'fulfilled',
                ).length;
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
        },
        [retryReport],
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

    const download = useCallback(
        async (ids: string | string[]) => {
            const list = Array.isArray(ids) ? ids : [ids];
            try {
                const fetched = await Promise.all(
                    list.map((id) => fetchReport({ id, downloadUrl: true })),
                );

                fetched.forEach((item) => {
                    if (item.report_url) {
                        window.open(item.report_url, '_blank', 'noopener');
                    } else {
                        toast.error('Report URL not found for report ' + item.title);
                    }
                });

                toast.success(
                    `${list.length > 1 ? 'Reports' : 'Report'} downloaded successfully`,
                );
            } catch (error) {
                const parsed = await parseAPIError(error);
                toast.error(getDisplayMessage(parsed));
            }
        },
        [fetchReport],
    );

    const columns = useMemo<ColumnDef<ReportRow>[]>(
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
                meta: { label: 'Title' },
                header: 'Title',
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='flex items-center gap-2 min-w-0'>
                            <span className='inline-flex items-center flex-shrink-0'>
                                {renderStatusIcon(
                                    item.status,
                                    item.error_message || undefined,
                                )}
                            </span>
                            <span className='truncate'>
                                {truncateText(item.title, 50)}
                            </span>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'strategy',
                id: 'strategy',
                meta: { label: 'Strategy' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Strategy' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='text-foreground'>
                            {startCase(item.strategy || 'N/A')}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'anonymized',
                id: 'anonymized',
                meta: { label: 'Anonymized' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Anonymized' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='text-foreground'>
                            {item.anonymized ? 'Yes' : 'No'}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'created_at',
                id: 'created_at',
                meta: { label: 'Created At' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Created At' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='w-36'>
                            {item.created_at
                                ? format(new Date(item.created_at), 'dd/MM/yyyy, HH:mm')
                                : 'N/A'}
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                header: '',
                size: 40,
                minSize: 40,
                maxSize: 40,
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div
                            className='text-right flex justify-end'
                            onClick={(e) => e.stopPropagation()}
                        >
                            {item.id && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant='ghost'
                                            size='icon-sm'
                                            className='text-muted-foreground hover:text-foreground'
                                            title='Actions'
                                        >
                                            <DotsThreeIcon
                                                className='w-4 h-4'
                                                weight='bold'
                                                aria-hidden='true'
                                            />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align='end'>
                                        <DropdownMenuItem
                                            onClick={() => download(item.id!)}
                                        >
                                            <DownloadIcon size={16} weight='bold' />
                                            Download
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => retry(item.id!)}
                                        >
                                            <ArrowsClockwiseIcon
                                                size={16}
                                                weight='bold'
                                            />
                                            Retry
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            variant='destructive'
                                            onClick={() => confirmDelete(item.id!)}
                                        >
                                            <TrashIcon size={16} weight='bold' />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [download, confirmDelete, retry],
    );

    const applySorting = useCallback(
        (updater: SortingState | ((prev: SortingState) => SortingState)) => {
            const next = typeof updater === 'function' ? updater(sorting) : updater;
            applySort(next);
        },
        [applySort, sorting],
    );

    const table = useReactTable<ReportRow>({
        data: rows,
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
        onSortingChange: applySorting,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: (updater) => {
            const current = {
                pageIndex: page - 1,
                pageSize,
            };
            const next = typeof updater === 'function' ? updater(current) : updater;
            paginate(next.pageIndex, next.pageSize);
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
                    onRowClick={async (row) => {
                        try {
                            const details = await fetchReport({
                                id: row.id!,
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
                            initialValue={appliedSearch}
                            debounceMs={300}
                            onDebouncedChange={applySearch}
                            onSubmit={applySearch}
                            onClear={() => applySearch('')}
                        />
                        <StatusHeaderDropdown
                            onStatusChange={updateStatus}
                            status={toFilterValue(statusFilter)}
                            options={[...FILTER_OPTIONS]}
                        />
                    </div>
                </DataTable>
            </div>
            <ActionBar
                open={checkedIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) setRowSelection({});
                }}
            >
                <ActionBarSelection>
                    {checkedIds.length} report
                    {checkedIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={() => download(checkedIds)}
                        disabled={
                            isLoading || rows.length === 0 || checkedIds.length === 0
                        }
                    >
                        <DownloadIcon size={18} weight='bold' />
                        Download
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={() => retry(checkedIds)}
                        disabled={
                            isLoading || rows.length === 0 || checkedIds.length === 0
                        }
                    >
                        <ArrowsClockwiseIcon size={18} weight='bold' />
                        Retry
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={() => confirmDelete(checkedIds)}
                        disabled={
                            isLoading || rows.length === 0 || checkedIds.length === 0
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
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {pendingDeleteIds.length}{' '}
                            {pendingDeleteIds.length > 1 ? 'reports' : 'report'}? This
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
                            onClick={() => deleteReports(pendingDeleteIds)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
