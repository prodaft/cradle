import { SearchInput } from '@/components/base/search-input/search-input';
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
import type { SearchState } from '@/lib/search-query/search-schema';
import { truncateText } from '@/utils/dashboard';
import { ArrowsClockwiseIcon, TrashIcon } from '@phosphor-icons/react';
import type { components } from '@services/openapi/schema';
import { useRouter } from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import capitalize from 'lodash/capitalize';
import { useCallback, useMemo, useState } from 'react';
import { SEARCH_SCHEMA } from './enrichment-list-search-schema';

type EnrichmentRow = components['schemas']['EnrichmentRequestList'];

interface EnrichmentTableProps {
    rows: EnrichmentRow[];
    isLoading: boolean;
    page: number;
    totalPages: number;
    totalCount?: number;
    onPageChange: (page: number) => void;
    pageSize?: number;
    onPageSizeChange?: (size: number) => void;
    searchState: SearchState;
    onSearchApply: (state: SearchState) => void;
    onDelete?: (ids: string[]) => Promise<boolean> | void;
    onRerun?: (ids: string[]) => Promise<boolean> | void;
}

export default function EnrichmentTable({
    rows,
    isLoading,
    page,
    totalPages,
    totalCount,
    onPageChange,
    pageSize = 20,
    onPageSizeChange = () => {},
    searchState,
    onSearchApply,
    onDelete,
    onRerun = () => {},
}: EnrichmentTableProps) {
    const router = useRouter();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const checkedIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

    const paginate = useCallback(
        (pageIndex: number, size: number) => {
            const target = pageIndex + 1;

            if (size !== (pageSize || 20)) {
                onPageSizeChange(size);
            } else if (target !== page) {
                onPageChange(target);
            }
        },
        [onPageChange, page, pageSize, onPageSizeChange],
    );

    const statusDetail = useCallback((item: EnrichmentRow) => {
        const msgs: string[] = [];
        if (item.ignored_count && item.ignored_count > 0) {
            msgs.push(
                `Ignored ${item.ignored_count} artifact${item.ignored_count > 1 ? 's' : ''}`,
            );
        }
        const warnCount =
            item.enrichers?.filter((enricher) => enricher.status === 'warning')
                .length || 0;
        if (warnCount > 0) {
            msgs.push(`Warnings in ${warnCount} enricher${warnCount > 1 ? 's' : ''}`);
        }
        const errorCount =
            item.enrichers?.filter((enricher) => enricher.status === 'error').length ||
            0;
        if (errorCount > 0) {
            msgs.push(`Errors in ${errorCount} enricher${errorCount > 1 ? 's' : ''}`);
        }

        return msgs.join(', ');
    }, []);

    const statusIcon = useCallback((status?: string, detail?: string) => {
        if (!status) return null;

        const tooltipContent = detail || capitalize(status);
        const tooltipClassName =
            (status === 'error' || status === 'waiting') && detail
                ? status === 'error'
                    ? '[--tooltip-bg:var(--destructive)] [--tooltip-fg:var(--destructive-foreground)] whitespace-pre-line'
                    : '[--tooltip-bg:var(--chart-4)] [--tooltip-fg:var(--foreground)] whitespace-pre-line'
                : undefined;

        return (
            <Tooltip>
                <TooltipTrigger
                    render={
                        <span className='inline-flex items-center align-middle flex-shrink-0' />
                    }
                >
                    <StatusIcon status={status as StatusType} />
                </TooltipTrigger>
                <TooltipContent className={tooltipClassName}>
                    {tooltipContent}
                </TooltipContent>
            </Tooltip>
        );
    }, []);

    const columns = useMemo<ColumnDef<EnrichmentRow>[]>(
        () => [
            {
                id: 'select',
                size: 28,
                minSize: 28,
                maxSize: 28,
                header: ({ table }) => (
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected()}
                        indeterminate={
                            table.getIsSomePageRowsSelected() &&
                            !table.getIsAllPageRowsSelected()
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
                        <div
                            className='truncate max-w-xs cursor-pointer'
                            title={item.title}
                            onClick={(event) => {
                                event.stopPropagation();
                                if (item.id) {
                                    router.navigate({
                                        to: '/enrichment/$id',
                                        params: { id: item.id.toString() },
                                    });
                                }
                            }}
                        >
                            <div className='flex items-center gap-2 min-w-0'>
                                <span className='inline-flex items-center flex-shrink-0'>
                                    {statusIcon(item.status, statusDetail(item))}
                                </span>
                                <span className='truncate'>
                                    {truncateText(item.title, 50)}
                                </span>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'user',
                id: 'user',
                meta: { label: 'User' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='User' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='w-32'>
                            {item.user_detail?.username || 'N/A'}
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
                        <div className='w-40'>
                            {item.created_at
                                ? format(new Date(item.created_at), 'dd/MM/yyyy, HH:mm')
                                : 'N/A'}
                        </div>
                    );
                },
            },
        ],
        [statusIcon, statusDetail, router],
    );

    const confirmDelete = useCallback(() => {
        if (checkedIds.length === 0) return;
        setPendingDeleteIds(checkedIds);
        setIsDeleteOpen(true);
    }, [checkedIds]);

    const table = useReactTable({
        data: rows,
        columns,
        state: {
            rowSelection,
            pagination: {
                pageIndex: page - 1,
                pageSize: pageSize || 20,
            },
        },
        getRowId: (row, index) => String(row.id ?? index),
        onRowSelectionChange: setRowSelection,
        onPaginationChange: (updater) => {
            const current = {
                pageIndex: page - 1,
                pageSize: pageSize || 20,
            };
            const next = typeof updater === 'function' ? updater(current) : updater;
            paginate(next.pageIndex, next.pageSize);
        },
        getCoreRowModel: getCoreRowModel(),
        enableRowSelection: true,
        manualPagination: true,
        enableSorting: false,
        pageCount: totalPages,
        rowCount: totalCount,
    });

    return (
        <div className='flex flex-col space-y-4'>
            <DataTable table={table} showViewOptions isLoading={isLoading}>
                <div className='flex min-w-0 flex-1 items-center gap-2'>
                    <SearchInput
                        schema={SEARCH_SCHEMA}
                        value={searchState}
                        onApply={onSearchApply}
                        placeholder='Search requests...'
                    />
                </div>
            </DataTable>
            <ActionBar
                open={checkedIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {checkedIds.length} request
                    {checkedIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={confirmDelete}
                        disabled={
                            isLoading || rows.length === 0 || checkedIds.length === 0
                        }
                        className='text-destructive'
                    >
                        <TrashIcon size={18} weight='bold' />
                        Delete
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={async () => {
                            if (await onRerun(checkedIds)) clearSelection();
                        }}
                        disabled={
                            isLoading || rows.length === 0 || checkedIds.length === 0
                        }
                    >
                        <ArrowsClockwiseIcon size={18} weight='bold' />
                        Rerun
                    </ActionBarItem>
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose className='px-2 text-sm'>Clear</ActionBarClose>
            </ActionBar>
            <AlertDialog
                open={isDeleteOpen}
                onOpenChange={(open) => {
                    setIsDeleteOpen(open);
                    if (!open) setPendingDeleteIds([]);
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {pendingDeleteIds.length}{' '}
                            request
                            {pendingDeleteIds.length > 1 ? 's' : ''}? This action is
                            irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            size='sm'
                            onClick={async () => {
                                const target = pendingDeleteIds;
                                setPendingDeleteIds([]);
                                if (target.length > 0 && (await onDelete?.(target))) {
                                    clearSelection();
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
