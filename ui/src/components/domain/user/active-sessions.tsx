import { SearchInput } from '@/components/base/search-input/search-input';
import TableActionsButton from '@/components/base/table-actions-button';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useAuthActions } from '@/hooks/auth/use-auth';
import {
    EMPTY_SEARCH_STATE,
    sortToOrderBy,
    type SearchSchema,
    type SearchState,
} from '@/lib/search-query/search-schema';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import { TrashIcon } from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    ColumnDef,
    RowSelectionState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface ActiveSessionsProps {
    userId: string;
}

const SEARCH_SCHEMA: SearchSchema = {
    sortFields: [
        { value: 'device_info', label: 'Device' },
        { value: 'ip_address', label: 'IP address' },
        { value: 'created', label: 'Created', api: 'created_at' },
        { value: 'last_activity', label: 'Last activity', api: 'last_activity_at' },
        { value: 'expires_at', label: 'Expires' },
    ],
};

/**
 * ActiveSessions component - Displays and manages active user sessions
 */
export default function ActiveSessions({ userId }: ActiveSessionsProps) {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false }) as any;
    const page = Number(search?.sessions_page ?? 1) || 1;
    const pageSize = Number(search?.sessions_pagesize ?? 10) || 10;

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchState, setSearchState] = useState<SearchState>(EMPTY_SEARCH_STATE);
    const [isRevokeOpen, setIsRevokeOpen] = useState(false);
    const [pendingRevokeIds, setPendingRevokeIds] = useState<string[]>([]);
    const { logOut } = useAuthActions();

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

    const listQuery = useMemo(() => {
        const { q, sort } = searchState;
        const orderBy = sortToOrderBy(sort, SEARCH_SCHEMA);
        return {
            page,
            page_size: pageSize,
            ...(q ? { search: q } : {}),
            ...(orderBy ? { order_by: orderBy } : {}),
        };
    }, [searchState, page, pageSize]);

    const { data: sessions, isPending } = $api.useQuery(
        'get',
        '/users/{user_id}/sessions/',
        {
            params: {
                path: { user_id: userId },
                query: listQuery,
            },
        },
    );
    type SessionRow = components['schemas']['UserSession'];
    const rows: SessionRow[] = useMemo(() => sessions?.results ?? [], [sessions]);

    const checkedIds = useMemo(
        () =>
            Object.keys(rowSelection)
                .filter((key) => rowSelection[key])
                .filter((id) => rows.some((row) => row.id === id)),
        [rowSelection, rows],
    );

    const { mutateAsync: revokeSession } = useMutation({
        mutationFn: async (sessionId: string) => {
            const { data, error, response } = await fetchClient.DELETE(
                '/users/{user_id}/sessions/{session_id}/',
                { params: { path: { user_id: userId, session_id: sessionId } } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            invalidateQueries: [{ queryKey: ['get', '/users/{user_id}/sessions/'] }],
            suppressNotification: true,
        },
    });

    const revoke = useCallback(
        async (targetIds: string[]) => {
            try {
                const results = await Promise.allSettled(
                    targetIds.map((id) => revokeSession(id)),
                );
                const succeededIds = targetIds.filter(
                    (_, i) => results[i]?.status === 'fulfilled',
                );
                const successes = succeededIds.length;
                const failures = results.length - successes;

                if (targetIds.length === 1) {
                    if (failures === 0) {
                        toast.success('Session revoked successfully');
                    } else {
                        const parsed = await parseAPIError(
                            (results[0] as PromiseRejectedResult).reason,
                        );
                        toast.error(getDisplayMessage(parsed));
                    }
                } else if (failures === 0) {
                    toast.success(
                        `Successfully revoked ${successes} session${successes > 1 ? 's' : ''}`,
                    );
                } else if (successes === 0) {
                    const firstRejected = results.find(
                        (r) => r.status === 'rejected',
                    ) as PromiseRejectedResult;
                    const parsed = await parseAPIError(firstRejected.reason);
                    toast.error(getDisplayMessage(parsed));
                } else {
                    toast.warning(
                        `Revoked ${successes} session${successes > 1 ? 's' : ''}, ${failures} failed`,
                    );
                }

                if (successes === 0) return;

                const revoked = rows.filter((row) =>
                    succeededIds.includes(row.id || ''),
                );
                const isCurrentSessionRevoked = revoked.some((row) => row.is_current);

                if (isCurrentSessionRevoked) {
                    logOut();
                } else {
                    setRowSelection((prev) => {
                        const next = { ...prev };
                        for (const id of succeededIds) delete next[id];
                        return next;
                    });
                }
            } catch (error) {
                const parsed = await parseAPIError(error);
                toast.error(getDisplayMessage(parsed));
            }
        },
        [rows, logOut, revokeSession],
    );

    const confirmRevoke = useCallback((target: string | string[]) => {
        const list = Array.isArray(target) ? target : [target];
        setPendingRevokeIds(list);
        setIsRevokeOpen(true);
    }, []);

    const formatDate = useCallback((date: Date | string | undefined): string => {
        if (!date) return '';
        const dateObj = date instanceof Date ? date : new Date(date);
        return format(dateObj, 'dd/MM/yyyy, HH:mm');
    }, []);

    const formatDeviceInfo = useCallback((deviceInfo: string | null): string => {
        if (!deviceInfo) return 'Unknown device';
        return deviceInfo.length > 50
            ? deviceInfo.substring(0, 50) + '...'
            : deviceInfo;
    }, []);

    const totalPages = Math.max(1, sessions?.total_pages ?? 1);

    const goTo = useCallback(
        (target: number) => {
            router.navigate({
                to: location.pathname as any,
                search: ((prev: any) => ({
                    ...prev,
                    sessions_page: String(target),
                })) as any,
                replace: true,
            });
        },
        [router, location.pathname],
    );

    const applySearch = useCallback(
        (state: SearchState) => {
            setSearchState(state);
            goTo(1);
        },
        [goTo],
    );

    const changePageSize = useCallback(
        (size: number) => {
            router.navigate({
                to: location.pathname as any,
                search: {
                    ...search,
                    sessions_pagesize: String(size),
                    sessions_page: '1',
                },
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    const paginate = useCallback(
        (pageIndex: number, size: number) => {
            const target = pageIndex + 1;

            if (size !== pageSize) {
                changePageSize(size);
            } else if (target !== page) {
                goTo(target);
            }
        },
        [page, pageSize, goTo, changePageSize],
    );

    const columns = useMemo<ColumnDef<SessionRow>[]>(
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
                accessorKey: 'device_info',
                meta: { label: 'Device' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Device' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='flex items-center gap-2'>
                            <span className='text-sm'>
                                {formatDeviceInfo(item.device_info || null)}
                            </span>
                            {item.is_current && (
                                <Badge variant='default' className='text-xs'>
                                    Current
                                </Badge>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'ip_address',
                meta: { label: 'IP Address' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='IP Address' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <span className='text-sm text-muted-foreground'>
                            {item.ip_address || '-'}
                        </span>
                    );
                },
            },
            {
                accessorKey: 'created_at',
                meta: { label: 'Created' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Created' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <span className='text-sm text-muted-foreground'>
                            {formatDate(item.created_at)}
                        </span>
                    );
                },
            },
            {
                accessorKey: 'last_activity_at',
                meta: { label: 'Last Activity' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Last Activity' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <span className='text-sm text-muted-foreground'>
                            {formatDate(item.last_activity_at)}
                        </span>
                    );
                },
            },
            {
                accessorKey: 'expires_at',
                meta: { label: 'Expires' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Expires' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <span className='text-sm text-muted-foreground'>
                            {formatDate(item.expires_at)}
                        </span>
                    );
                },
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div
                            className='w-12 text-right'
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className='flex justify-end'>
                                <TableActionsButton>
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (item.id) confirmRevoke(item.id);
                                        }}
                                        variant='destructive'
                                    >
                                        <TrashIcon size={18} weight='bold' />
                                        Revoke
                                    </DropdownMenuItem>
                                </TableActionsButton>
                            </div>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [confirmRevoke, formatDate, formatDeviceInfo],
    );

    const table = useReactTable({
        data: rows,
        columns,
        state: {
            rowSelection,
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
        },
        getRowId: (row, index) => row.id ?? String(index),
        onRowSelectionChange: setRowSelection,
        onPaginationChange: (updater) => {
            const current = { pageIndex: page - 1, pageSize };
            const next = typeof updater === 'function' ? updater(current) : updater;
            paginate(next.pageIndex, next.pageSize);
        },
        getCoreRowModel: getCoreRowModel(),
        enableRowSelection: true,
        manualPagination: true,
        enableSorting: false,
        pageCount: totalPages,
        rowCount: sessions?.count,
    });

    const revokeCount = pendingRevokeIds.length;
    const targetSession = rows.find((row) => row.id === pendingRevokeIds[0]);
    const isCurrentSession = targetSession?.is_current;

    return (
        <div className='w-full space-y-4'>
            <DataTable table={table} showViewOptions isLoading={isPending}>
                <SearchInput
                    schema={SEARCH_SCHEMA}
                    value={searchState}
                    onApply={applySearch}
                    placeholder='Search device or IP... (sort:-last_activity)'
                />
            </DataTable>
            <ActionBar
                open={checkedIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {checkedIds.length} session
                    {checkedIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={(event) => {
                            event.preventDefault();
                            if (checkedIds.length > 0) confirmRevoke(checkedIds);
                        }}
                        disabled={isPending || checkedIds.length === 0}
                        className='text-destructive'
                    >
                        <TrashIcon size={18} weight='bold' />
                        Revoke
                    </ActionBarItem>
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose className='px-2 text-sm' onClick={clearSelection}>
                    Clear
                </ActionBarClose>
            </ActionBar>
            <AlertDialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Action</AlertDialogTitle>
                        <AlertDialogDescription>
                            {revokeCount === 1
                                ? isCurrentSession
                                    ? 'Are you sure you want to revoke this session? This is your current session and you will be logged out immediately.'
                                    : 'Are you sure you want to revoke this session? The device will be signed out and will need to sign in again.'
                                : `Are you sure you want to revoke ${revokeCount} sessions? The devices will be signed out and will need to sign in again.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='default'
                            size='sm'
                            onClick={() => revoke(pendingRevokeIds)}
                        >
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
