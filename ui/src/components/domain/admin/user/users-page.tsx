import { ActionBarSearch } from '@/components/base/action-bar/action-bar';
import PageHeader from '@/components/base/page-header';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import { PencilIcon, TrashIcon, UserPlusIcon } from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AddUserForm from './add-user-form';

type UserRetrieve = components['schemas']['UserRetrieve'];

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
    const { userId: currentUserId } = useAuthState();
    const queryClient = useQueryClient();
    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteUserIds, setDeleteUserIds] = useState<string[]>([]);
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

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
    const { data: usersData, isPending } = $api.useQuery(
        'get',
        '/users/',
        {
            params: {
                query: {
                    page: usersListFilters.page,
                    page_size: usersListFilters.pageSize,
                    search: usersListFilters.search,
                },
            },
        } as any,
        {
            meta: {
                showErrorToast: false,
                suppressNotification: true,
            },
        },
    );

    const users = useMemo(() => usersData?.results ?? [], [usersData]);

    const selectedHasOtherAdmin = useMemo(
        () =>
            selectedUserIds.some((id) => {
                const u = users.find((u) => String(u.id) === id);
                return u?.role === 'admin' && u.id !== currentUserId;
            }),
        [selectedUserIds, users, currentUserId],
    );

    const deleteUsersMutation = useMutation({
        mutationFn: async (userIds: string[]) => {
            await Promise.all(
                userIds.map(async (userId) => {
                    const { error, response } = await fetchClient.DELETE(
                        '/users/{user_id}/',
                        { params: { path: { user_id: userId } } },
                    );
                    if (error) throw { response, error };
                }),
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
        setAddUserDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
        if (newUser.id) {
            router.navigate({ to: `/manage/users/${newUser.id}` as any });
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

    const totalPages = Math.max(1, usersData?.total_pages ?? 1);

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
                accessorKey: 'is_active',
                id: 'is_active',
                size: 28,
                minSize: 28,
                maxSize: 28,
                header: 'Status',
                cell: ({ row }) => {
                    const isActive = row.original.is_active;
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
        <div className='w-full h-full'>
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
                        <DataTable
                            table={table}
                            showViewOptions
                            isLoading={isPending}
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
                        disabled={
                            isPending ||
                            selectedUserIds.length === 0 ||
                            selectedHasOtherAdmin
                        }
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
            <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>Add User</DialogTitle>
                        <DialogDescription>Create a new user account</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className='no-scrollbar -mx-4 max-h-[50vh] px-4'>
                        <AddUserForm onAdd={handleUserAdded} />
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                    setDeleteDialogOpen(open);
                    if (!open) {
                        setDeleteUserIds([]);
                        setDeleteConfirmInput('');
                    }
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteDialogText}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <FieldGroup className='gap-4'>
                        <Field>
                            <FieldLabel htmlFor='confirm-delete-users'>
                                Type below to confirm
                            </FieldLabel>
                            <Input
                                id='confirm-delete-users'
                                type='text'
                                placeholder={`Type "${deleteConfirmText}" to confirm`}
                                value={deleteConfirmInput}
                                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                            />
                        </Field>
                    </FieldGroup>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            size='sm'
                            onClick={() => {
                                if (deleteUserIds.length > 0)
                                    handleDeleteUsers(deleteUserIds);
                                setDeleteUserIds([]);
                                setDeleteDialogOpen(false);
                            }}
                            disabled={deleteConfirmInput !== deleteConfirmText}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
