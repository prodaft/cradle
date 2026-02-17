import { ActionBarSearch } from '@/components/base/action-bar/action-bar';
import TableActionsButton from '@/components/base/table-actions-button';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import ActionConfirmationDialog from '@/components/dialogs/base/action-confirmation-dialog';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/ui/action-bar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import useApi from '@/hooks/api/use-api';
import { useAuthActions } from '@/hooks/auth/use-auth';
import { UserSession } from '@/services/cradle/models';
import { parseAPIError } from '@/utils/api';
import { TrashIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    ColumnDef,
    RowSelectionState,
    SortingState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface ActiveSessionsProps {
    userId: string;
}

/** Maps react-table camelCase accessorKeys to the API's snake_case order_by fields. */
const COLUMN_TO_FIELD: Record<string, string> = {
    deviceInfo: 'device_info',
    ipAddress: 'ip_address',
    createdAt: 'created_at',
    lastActivity: 'last_activity',
    expiresAt: 'expires_at',
};

/**
 * ActiveSessions component - Displays and manages active user sessions
 */
export default function ActiveSessions({ userId }: ActiveSessionsProps) {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });
    const searchAny = search as any;
    const page = Number(searchAny?.sessions_page ?? 1) || 1;
    const pageSize = Number(searchAny?.sessions_pagesize ?? 10) || 10;

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
    const [revokeSessionId, setRevokeSessionId] = useState<string | null>(null);
    const [bulkRevokeDialogOpen, setBulkRevokeDialogOpen] = useState(false);
    const { usersApi } = useApi();
    const { logOut } = useAuthActions();
    const queryClient = useQueryClient();

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

    const orderByParam = useMemo(() => {
        if (!sorting.length) return undefined;
        return (
            sorting
                .map(({ id, desc }) => {
                    const field = COLUMN_TO_FIELD[id];
                    if (!field) return null;
                    return desc ? `-${field}` : field;
                })
                .filter(Boolean)
                .join(',') || undefined
        );
    }, [sorting]);

    // Query for sessions
    const { data: sessions = [], isPending } = useQuery<UserSession[]>({
        queryKey: ['users', 'detail', `${userId}-sessions`, searchQuery, orderByParam],
        queryFn: () =>
            usersApi.usersSessionsList({
                userId,
                search: searchQuery || undefined,
                orderBy: orderByParam,
            }),
    });

    const selectedSessionIds = useMemo(
        () =>
            Object.keys(rowSelection)
                .filter((key) => rowSelection[key])
                .filter((id) => sessions.some((s) => s.id === id)),
        [rowSelection, sessions],
    );

    const getCurrentSessionJti = useCallback((): string | null => {
        // Get the refresh token from localStorage and decode it to get the JTI
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return null;

        try {
            // Decode JWT token (base64url decode the payload)
            const parts = refreshToken.split('.');
            if (parts.length !== 3) return null;

            const payload = JSON.parse(
                atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
            );
            return payload.jti || null;
        } catch {
            // Invalid token, return null
            return null;
        }
    }, []);

    // Revoke session mutation
    const revokeSessionMutation = useMutation({
        mutationFn: async (sessionId: string) => {
            return await usersApi.usersSessionsDestroy({ userId, sessionId });
        },
        meta: {
            invalidateQueries: [
                { queryKey: ['users', 'detail', `${userId}-sessions`] },
            ],
            successMessage: 'Session revoked successfully',
        },
    });

    const revokeSession = useCallback(
        async (sessionId: string) => {
            try {
                await revokeSessionMutation.mutateAsync(sessionId);

                // Check if this is the current session by comparing JTI
                const session = sessions.find((s) => s.id === sessionId);
                const currentJti = getCurrentSessionJti();
                const isCurrentSession =
                    session && currentJti && session.refreshTokenJti === currentJti;

                // If current session was revoked, log out immediately
                if (isCurrentSession || session?.isCurrent) {
                    // Clear tokens and log out
                    logOut();
                } else {
                    setRowSelection((prev) => {
                        const next = { ...prev };
                        delete next[sessionId];
                        return next;
                    });
                }
            } catch {
                // Error already handled by mutation meta/toasts
            }
        },
        [sessions, revokeSessionMutation, getCurrentSessionJti, logOut],
    );

    const revokeSessions = useCallback(
        async (sessionIds: string[]) => {
            try {
                const revokePromises = sessionIds.map((sessionId) =>
                    usersApi.usersSessionsDestroy({ userId, sessionId }),
                );

                const results = await Promise.allSettled(revokePromises);
                const successes = results.filter(
                    (r) => r.status === 'fulfilled',
                ).length;
                const failures = results.length - successes;

                if (failures === 0) {
                    toast.success(
                        `Successfully revoked ${successes} session${successes > 1 ? 's' : ''}`,
                    );
                } else if (successes === 0) {
                    const firstRejected = results.find(
                        (r) => r.status === 'rejected',
                    ) as PromiseRejectedResult;
                    const parsed = await parseAPIError(firstRejected.reason);
                    toast.error(parsed.detail);
                } else {
                    toast.warning(
                        `Revoked ${successes} session${successes > 1 ? 's' : ''}, ${failures} failed`,
                    );
                }

                const currentJti = getCurrentSessionJti();
                const revokedSessions = sessions.filter((s) =>
                    sessionIds.includes(s.id || ''),
                );
                const isCurrentSessionRevoked = revokedSessions.some(
                    (s) => currentJti && s.refreshTokenJti === currentJti,
                );

                if (isCurrentSessionRevoked) {
                    logOut();
                } else {
                    queryClient.invalidateQueries({
                        queryKey: [`users`, `detail`, `${userId}-sessions`],
                    });
                    clearSelection();
                }
            } catch (error) {
                const parsed = await parseAPIError(error);
                toast.error(parsed.detail);
            }
        },
        [
            userId,
            usersApi,
            sessions,
            queryClient,
            getCurrentSessionJti,
            logOut,
            clearSelection,
        ],
    );

    const openRevokeConfirmationDialog = useCallback((sessionId: string) => {
        setRevokeSessionId(sessionId);
        setRevokeDialogOpen(true);
    }, []);

    // Query automatically fetches on mount and when dependencies change

    const formatDate = useCallback((date: Date | string | undefined): string => {
        if (!date) return '';
        const dateObj = date instanceof Date ? date : new Date(date);
        return format(dateObj, 'dd/MM/yyyy, HH:mm');
    }, []);

    const formatDeviceInfo = useCallback((deviceInfo: string | null): string => {
        if (!deviceInfo) return 'Unknown device';
        // Truncate long device info
        return deviceInfo.length > 50
            ? deviceInfo.substring(0, 50) + '...'
            : deviceInfo;
    }, []);

    // Mark current session by comparing JTI
    const currentJti = getCurrentSessionJti();
    const sessionsWithCurrent = useMemo(
        () =>
            sessions.map((session) => ({
                ...session,
                isCurrent: currentJti
                    ? session.refreshTokenJti === currentJti
                    : session.isCurrent,
            })),
        [sessions, currentJti],
    );

    // Calculate total pages
    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(sessionsWithCurrent.length / pageSize));
    }, [sessionsWithCurrent.length, pageSize]);

    // Paginate sessions
    const paginatedSessions = useMemo(() => {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return sessionsWithCurrent.slice(start, end);
    }, [sessionsWithCurrent, page, pageSize]);

    const handlePageChange = useCallback(
        (newPage: number) => {
            router.navigate({
                to: location.pathname as any,
                search: { ...searchAny, sessions_page: String(newPage) },
                replace: true,
            });
        },
        [searchAny, router, location.pathname],
    );

    // Handle sorting change
    const handleSortingChange = useCallback(
        (newSorting: SortingState) => {
            setSorting(newSorting);
            handlePageChange(1);
        },
        [handlePageChange],
    );

    const handlePageSizeChange = useCallback(
        (newSize: number) => {
            router.navigate({
                to: location.pathname as any,
                search: {
                    ...searchAny,
                    sessions_pagesize: String(newSize),
                    sessions_page: '1',
                },
                replace: true,
            });
        },
        [searchAny, router, location.pathname],
    );

    // Handle pagination changes from DataTable
    const handlePaginationChange = useCallback(
        (pageIndex: number, newPageSize: number) => {
            const newPage = pageIndex + 1; // Convert 0-based to 1-based

            // Handle page size change
            if (newPageSize !== pageSize) {
                handlePageSizeChange(newPageSize);
            }
            // Handle page change
            else if (newPage !== page) {
                handlePageChange(newPage);
            }
        },
        [page, pageSize, handlePageChange, handlePageSizeChange],
    );

    const columns = useMemo<ColumnDef<UserSession>[]>(
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
                accessorKey: 'deviceInfo',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Device' />
                ),
                cell: ({ row }) => {
                    const session = row.original;
                    return (
                        <div className='flex items-center gap-2'>
                            <span className='text-sm'>
                                {formatDeviceInfo(session.deviceInfo || null)}
                            </span>
                            {session.isCurrent && (
                                <Badge variant='default' className='text-xs'>
                                    Current
                                </Badge>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'ipAddress',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='IP Address' />
                ),
                cell: ({ row }) => {
                    const ip = row.original.ipAddress;
                    return (
                        <span className='text-sm text-muted-foreground'>
                            {ip || '-'}
                        </span>
                    );
                },
            },
            {
                accessorKey: 'createdAt',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Created' />
                ),
                cell: ({ row }) => (
                    <span className='text-sm text-muted-foreground'>
                        {formatDate(row.original.createdAt)}
                    </span>
                ),
            },
            {
                accessorKey: 'lastActivity',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Last Activity' />
                ),
                cell: ({ row }) => (
                    <span className='text-sm text-muted-foreground'>
                        {formatDate(row.original.lastActivity)}
                    </span>
                ),
            },
            {
                accessorKey: 'expiresAt',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Expires' />
                ),
                cell: ({ row }) => (
                    <span className='text-sm text-muted-foreground'>
                        {formatDate(row.original.expiresAt)}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const session = row.original;
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
                                            const sessionId = session.id;
                                            if (sessionId) {
                                                openRevokeConfirmationDialog(sessionId);
                                            }
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
        [openRevokeConfirmationDialog, formatDate, formatDeviceInfo],
    );

    const table = useReactTable({
        data: paginatedSessions,
        columns,
        state: {
            rowSelection,
            sorting,
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
        },
        getRowId: (row, index) => row.id ?? String(index),
        onRowSelectionChange: setRowSelection,
        onSortingChange: (updater) => {
            const newSorting =
                typeof updater === 'function' ? updater(sorting) : updater;
            handleSortingChange(newSorting);
        },
        onPaginationChange: (updater) => {
            const currentPagination = { pageIndex: page - 1, pageSize };
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

    const handleBulkRevoke = useCallback(() => {
        if (selectedSessionIds.length > 0) {
            setBulkRevokeDialogOpen(true);
        }
    }, [selectedSessionIds.length]);

    return (
        <div className='w-full space-y-4'>
            {isPending ? (
                <div className='flex min-h-[200px] items-center justify-center'>
                    <Spinner className='size-10' />
                </div>
            ) : (
                <DataTable table={table} showViewOptions>
                    <ActionBarSearch
                        placeholder='Search sessions...'
                        value={searchQuery}
                        debounceMs={300}
                        onDebouncedChange={(v) => {
                            setSearchQuery(v);
                            handlePageChange(1);
                        }}
                        onSubmit={(v) => {
                            setSearchQuery(v);
                            handlePageChange(1);
                        }}
                    />
                </DataTable>
            )}
            <ActionBar
                open={selectedSessionIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {selectedSessionIds.length} session
                    {selectedSessionIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={handleBulkRevoke}
                        disabled={isPending || selectedSessionIds.length === 0}
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
            {revokeSessionId !== null &&
                (() => {
                    const session = sessions.find((s) => s.id === revokeSessionId);
                    const isCurrentSession =
                        session && currentJti && session.refreshTokenJti === currentJti;
                    return (
                        <ActionConfirmationDialog
                            open={revokeDialogOpen}
                            onOpenChange={(open) => {
                                setRevokeDialogOpen(open);
                                if (!open) setRevokeSessionId(null);
                            }}
                            onConfirm={() => {
                                if (revokeSessionId) {
                                    revokeSession(revokeSessionId);
                                }
                            }}
                            text={
                                isCurrentSession
                                    ? 'Are you sure you want to revoke this session? This is your current session and you will be logged out immediately.'
                                    : 'Are you sure you want to revoke this session? The device will be signed out and will need to sign in again.'
                            }
                        />
                    );
                })()}
            <ActionConfirmationDialog
                open={bulkRevokeDialogOpen}
                onOpenChange={setBulkRevokeDialogOpen}
                onConfirm={() => revokeSessions(selectedSessionIds)}
                text={`Are you sure you want to revoke ${selectedSessionIds.length} session${selectedSessionIds.length > 1 ? 's' : ''}? The device${selectedSessionIds.length > 1 ? 's' : ''} will be signed out and will need to sign in again.`}
            />
        </div>
    );
}
