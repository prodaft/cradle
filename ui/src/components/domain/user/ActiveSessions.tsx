import { ActionBar, ActionBarSearch } from '@/components/base/ActionBar/ActionBar';
import TableActionsButton from '@/components/base/TableActionsButton';
import ActionConfirmationModal from '@/components/dialogs/base/ActionConfirmationModal';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable, type BulkAction } from '@/components/ui/data-table/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import useApi from '@/hooks/api/useApi';
import { useAuthActions } from '@/hooks/auth/useAuth';
import { UserSession } from '@/services/cradle/models';
import { TrashIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface ActiveSessionsProps {
    userId: string;
}

/**
 * ActiveSessions component - Displays and manages active user sessions
 */
export default function ActiveSessions({ userId }: ActiveSessionsProps) {
    const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [revokeModalOpen, setRevokeModalOpen] = useState(false);
    const [revokeSessionId, setRevokeSessionId] = useState<string | null>(null);
    const [bulkRevokeModalOpen, setBulkRevokeModalOpen] = useState(false);
    const { usersApi } = useApi();
    const { getAccessToken, logOut } = useAuthActions();
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });
    const queryClient = useQueryClient();

    // Query for sessions
    const { data: sessions = [], isPending } = useQuery<UserSession[]>({
        queryKey: ['users', 'detail', `${userId}-sessions`],
        queryFn: () => usersApi.usersSessionsList({ userId }),
        meta: {
            errorMessage: 'Failed to fetch sessions',
        },
    });

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
        } catch (error) {
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
            errorMessage: 'Failed to revoke session',
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
                    setSelectedSessions((prev) =>
                        prev.filter((id) => id !== sessionId),
                    );
                }
            } catch (error) {
                // Error already handled by mutation
            }
        },
        [userId, sessions, revokeSessionMutation, getCurrentSessionJti, logOut],
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
                    toast.error(
                        `Failed to revoke ${failures} session${failures > 1 ? 's' : ''}`,
                    );
                } else {
                    toast.success(
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
                    setSelectedSessions([]);
                }
            } catch (error) {
                toast.error('Failed to revoke sessions');
            }
        },
        [userId, usersApi, sessions, queryClient, getCurrentSessionJti, logOut],
    );

    const openRevokeConfirmationModal = useCallback((sessionId: string) => {
        setRevokeSessionId(sessionId);
        setRevokeModalOpen(true);
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

    // Filter sessions based on search query
    const filteredSessions = useMemo(() => {
        if (!searchQuery) return sessionsWithCurrent;
        const query = searchQuery.toLowerCase();
        return sessionsWithCurrent.filter(
            (session) =>
                session.deviceInfo?.toLowerCase().includes(query) ||
                session.ipAddress?.toLowerCase().includes(query) ||
                formatDate(session.createdAt).toLowerCase().includes(query) ||
                formatDate(session.lastActivity).toLowerCase().includes(query),
        );
    }, [sessionsWithCurrent, searchQuery, formatDate]);

    // Calculate total pages from filtered sessions
    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(filteredSessions.length / pageSize));
    }, [filteredSessions.length, pageSize]);

    // Paginate filtered sessions
    const paginatedSessions = useMemo(() => {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return filteredSessions.slice(start, end);
    }, [filteredSessions, page, pageSize]);

    // Handle row selection
    const handleRowSelectionChange = useCallback((selectedIds: string[]) => {
        setSelectedSessions(selectedIds);
    }, []);

    // Handle sorting change
    const handleSortingChange = useCallback((newSorting: SortingState) => {
        setSorting(newSorting);
        setPage(1);
    }, []);

    // Handle page change
    const handlePageChange = useCallback(
        (newPage: number) => {
            setPage(newPage);
            const newSearch: any = {
                ...search,
                sessions_page: String(newPage),
            };
            router.navigate({
                to: location.pathname as any,
                search: newSearch,
            });
        },
        [router, location.pathname, search],
    );

    // Handle page size change
    const handlePageSizeChange = useCallback(
        (newSize: number) => {
            setPageSize(newSize);
            setPage(1);
            const newSearch: any = {
                ...search,
                sessions_pagesize: String(newSize),
                sessions_page: '1',
            };
            router.navigate({
                to: location.pathname as any,
                search: newSearch,
            });
        },
        [router, location.pathname, search],
    );

    // Sync URL params to state
    useEffect(() => {
        const pageFromParams = (search as any)?.sessions_page || 1;
        const pageSizeFromParams = (search as any)?.sessions_pagesize || 10;
        if (pageFromParams !== page) setPage(pageFromParams);
        if (pageSizeFromParams !== pageSize) setPageSize(pageSizeFromParams);
    }, [(search as any)?.sessions_page, (search as any)?.sessions_pagesize]);

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
                    <DataTableColumnHeader column={column} title='Device' />
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
                    <DataTableColumnHeader column={column} title='IP Address' />
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
                    <DataTableColumnHeader column={column} title='Created' />
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
                    <DataTableColumnHeader column={column} title='Last Activity' />
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
                    <DataTableColumnHeader column={column} title='Expires' />
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
                                                openRevokeConfirmationModal(sessionId);
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
        [openRevokeConfirmationModal],
    );

    const bulkActions: BulkAction[] = [
        {
            id: 'revoke',
            label: 'Revoke',
            icon: <TrashIcon size={18} weight='bold' />,
            onClick: () => {
                if (selectedSessions.length > 0) {
                    setBulkRevokeModalOpen(true);
                }
            },
            disabled:
                isPending ||
                selectedSessions.length === 0 ||
                paginatedSessions.length === 0,
            variant: 'destructive',
        },
    ];

    return (
        <div className='w-full space-y-4'>
            <ActionBar
                left={
                    <ActionBarSearch
                        placeholder='Search sessions...'
                        value={searchQuery}
                        defaultExpanded={Boolean(searchQuery)}
                        debounceMs={300}
                        onDebouncedChange={(v) => {
                            setSearchQuery(v);
                            setPage(1);
                        }}
                        onSubmit={(v) => {
                            setSearchQuery(v);
                            setPage(1);
                        }}
                    />
                }
            />
            <DataTable
                columns={columns}
                data={paginatedSessions}
                loading={isPending}
                emptyMessage='No active sessions'
                enableRowSelection={true}
                selectedRows={selectedSessions}
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
                bulkActions={bulkActions}
                itemLabel='session'
            />
            {revokeSessionId !== null &&
                (() => {
                    const session = sessions.find((s) => s.id === revokeSessionId);
                    const currentJti = getCurrentSessionJti();
                    const isCurrentSession =
                        session && currentJti && session.refreshTokenJti === currentJti;
                    return (
                        <ActionConfirmationModal
                            open={revokeModalOpen}
                            onOpenChange={(open) => {
                                setRevokeModalOpen(open);
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
            <ActionConfirmationModal
                open={bulkRevokeModalOpen}
                onOpenChange={setBulkRevokeModalOpen}
                onConfirm={() => revokeSessions(selectedSessions)}
                text={`Are you sure you want to revoke ${selectedSessions.length} session${selectedSessions.length > 1 ? 's' : ''}? The device${selectedSessions.length > 1 ? 's' : ''} will be signed out and will need to sign in again.`}
            />
        </div>
    );
}
