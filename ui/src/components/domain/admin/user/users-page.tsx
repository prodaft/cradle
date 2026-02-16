import { ActionBarSearch } from '@/components/base/ActionBar/ActionBar';
import PageHeader from '@/components/base/PageHeader';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import AddUserDialog from './add-user-dialog';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/ui/action-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/use-api';
import { queryKeys } from '@/hooks/query';
import { PencilIcon, TrashIcon, UserPlusIcon } from '@phosphor-icons/react';
import { UserRetrieve } from '@services/cradle/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import ConfirmDeletionDialog from '../../../dialogs/base/ConfirmDeletionDialog';
import AdminPageLayout from '../admin-page-layout';

const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
        case 'admin':
            return 'destructive';
        case 'manager':
            return 'default';
        case 'entrymanager':
            return 'secondary';
        default:
            return 'outline';
    }
};

export default function UsersPage() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });

    const searchAny = search as any;
    const page = Number(searchAny?.users_page ?? 1) || 1;
    const pageSize = Number(searchAny?.users_pagesize ?? 20) || 20;
    const searchQuery = (searchAny?.users_search ?? '') as string;

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const { usersApi } = useApi();
    const queryClient = useQueryClient();
    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteUserIds, setDeleteUserIds] = useState<string[]>([]);

    const selectedUserIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

    const searchTerm = searchQuery.trim() || undefined;
    const usersListFilters = {
        page,
        pageSize,
        ...(searchTerm ? { search: searchTerm } : {}),
    };
    const { data: usersData, isPending } = useQuery({
        queryKey: queryKeys.users.list(usersListFilters),
        queryFn: () => usersApi.usersList(usersListFilters),
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const users = usersData?.results ?? [];

    const deleteUsersMutation = useMutation({
        mutationFn: async (userIds: string[]) => {
            await Promise.all(
                userIds.map((userId) => usersApi.usersDestroy({ userId })),
            );
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.users.lists() }],
            suppressNotification: true,
        },
        onSuccess: (_, userIds) => {
            toast.success(
                `Successfully deleted ${userIds.length} user${userIds.length > 1 ? 's' : ''}`,
            );
        },
    });

    const handleUserClick = useCallback(
        (user: UserRetrieve) => {
            router.navigate({ to: `/manage/users/${user.id}` as any });
        },
        [router],
    );

    const handleAddUser = () => {
        setAddUserDialogOpen(true);
    };

    const handleUserAdded = (newUser: UserRetrieve) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
        if (newUser.id) {
            router.navigate({
                to: `/manage/users/${newUser.id}` as any,
            });
        }
    };

    const handleDeleteUsers = (userIds: string[]) => {
        deleteUsersMutation.mutate(userIds, {
            onSuccess: () => {
                clearSelection();
            },
        });
    };

    const handleDeleteSelected = useCallback(() => {
        if (selectedUserIds.length === 0) return;
        setDeleteUserIds(selectedUserIds);
        setDeleteDialogOpen(true);
    }, [selectedUserIds]);

    const handleEditSelected = useCallback(() => {
        if (selectedUserIds.length !== 1) return;
        const userId = selectedUserIds[0];
        router.navigate({ to: `/manage/users/${userId}` as any });
    }, [selectedUserIds, router]);

    const totalPages = useMemo(
        () => Math.max(1, usersData?.totalPages ?? 1),
        [usersData?.totalPages],
    );

    const handleSearchChange = useCallback(
        (value: string) => {
            router.navigate({
                to: location.pathname as any,
                search: {
                    ...searchAny,
                    users_page: 1,
                    users_search: value.trim() || undefined,
                } as any,
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
                        users_page: 1,
                        users_pagesize: newPageSize,
                    } as any,
                    replace: true,
                });
            } else if (newPage !== page) {
                router.navigate({
                    to: location.pathname as any,
                    search: { ...searchAny, users_page: newPage } as any,
                    replace: true,
                });
            }
        },
        [page, pageSize, searchAny, router, location.pathname],
    );

    const columns = useMemo<ColumnDef<UserRetrieve>[]>(
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
                accessorKey: 'username',
                id: 'username',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Username' />
                ),
                cell: ({ row }) => (
                    <div className='font-medium'>{row.original.username}</div>
                ),
            },
            {
                accessorKey: 'email',
                id: 'email',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Email' />
                ),
                cell: ({ row }) => (
                    <div className='text-muted-foreground'>{row.original.email}</div>
                ),
            },
            {
                accessorKey: 'role',
                id: 'role',
                header: 'Role',
                cell: ({ row }) => {
                    const role = row.original.role;
                    if (!role) return <span className='text-muted-foreground'>-</span>;
                    return (
                        <Badge variant={getRoleBadgeVariant(role)}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Badge>
                    );
                },
                enableSorting: false,
            },
            {
                accessorKey: 'isActive',
                id: 'isActive',
                size: 28,
                minSize: 28,
                maxSize: 28,
                header: 'Status',
                cell: ({ row }) => {
                    const isActive = row.original.isActive;
                    return (
                        <Badge variant={isActive ? 'default' : 'secondary'}>
                            {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    );
                },
                enableSorting: false,
            },
        ],
        [],
    );

    const table = useReactTable({
        data: users,
        columns,
        state: {
            rowSelection,
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
        },
        getRowId: (row, index) => String(row.id ?? index),
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
        pageCount: totalPages,
    });

    const deleteCount = deleteUserIds.length;
    const deleteSingleUsername =
        deleteCount === 1
            ? users.find((u) => u.id === deleteUserIds[0])?.username
            : undefined;
    const deleteConfirmText =
        deleteSingleUsername ?? (deleteCount > 1 ? `DELETE ${deleteCount}` : 'DELETE');
    const deleteDialogText =
        deleteCount === 1
            ? 'Are you sure you want to delete this user? This action is irreversible.'
            : `Are you sure you want to delete ${deleteCount} user${deleteCount !== 1 ? 's' : ''}? This action is irreversible.`;

    return (
        <AdminPageLayout>
            <div className='w-full h-full flex flex-col space-y-4'>
                <PageHeader
                    title='Users'
                    description='Manage user accounts and permissions'
                    actions={
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={handleAddUser}>
                                    <UserPlusIcon size={18} weight='bold' />
                                    Add User
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Create a new user account</TooltipContent>
                        </Tooltip>
                    }
                />
                <div className='px-4 flex-1 flex flex-col'>
                    <div className='flex-1 space-y-4'>
                        {isPending ? (
                            <div className='flex min-h-[200px] items-center justify-center'>
                                <Spinner className='size-10' />
                            </div>
                        ) : (
                            <DataTable
                                table={table}
                                showViewOptions
                                onRowClick={handleUserClick}
                                getRowHref={(user) => `/manage/users/${user.id}`}
                            >
                                <ActionBarSearch
                                    placeholder='Search users...'
                                    value={searchQuery}
                                    onDebouncedChange={handleSearchChange}
                                    onSubmit={handleSearchChange}
                                />
                            </DataTable>
                        )}
                    </div>
                </div>
            </div>
            <ActionBar
                open={selectedUserIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {selectedUserIds.length} user
                    {selectedUserIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={handleEditSelected}
                        disabled={isPending || selectedUserIds.length !== 1}
                    >
                        <PencilIcon size={18} weight='bold' />
                        Edit
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={handleDeleteSelected}
                        disabled={isPending || selectedUserIds.length === 0}
                        className='text-destructive'
                    >
                        <TrashIcon size={18} weight='bold' />
                        Delete
                    </ActionBarItem>
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose className='px-2 text-sm' onClick={clearSelection}>
                    Clear
                </ActionBarClose>
            </ActionBar>
            <AddUserDialog
                open={addUserDialogOpen}
                onOpenChange={setAddUserDialogOpen}
                onAdd={handleUserAdded}
            />
            <ConfirmDeletionDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                    setDeleteDialogOpen(open);
                    if (!open) {
                        setDeleteUserIds([]);
                    }
                }}
                onConfirm={() => {
                    if (deleteUserIds.length > 0) handleDeleteUsers(deleteUserIds);
                    setDeleteUserIds([]);
                    setDeleteDialogOpen(false);
                }}
                confirmText={deleteConfirmText}
                text={deleteDialogText}
            />
        </AdminPageLayout>
    );
}
