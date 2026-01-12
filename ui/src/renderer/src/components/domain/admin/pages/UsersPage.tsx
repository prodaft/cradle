import { ActionBar, ActionBarSearch } from '@/components/base/ActionBar/ActionBar';
import PageHeader from '@/components/base/PageHeader';
import TableActionsButton from '@/components/base/TableActionsButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { useProfile } from '@/hooks/user/useProfile';
import { UserRetrieve } from '@services/cradle/models';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useParams, useRouter, useSearch } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { ClockRotateRight, Lock, Trash, UserPlus } from 'iconoir-react/regular';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AddUserModal from '../../../modals/admin/AddUserModal';
import ConfirmDeletionModal from '../../../modals/base/ConfirmDeletionModal';
import AdminPageLayout from '../AdminPageLayout';
import AdminUserSettings from './AdminUserSettings';

export default function UsersPage() {
    const params = useParams({ strict: false });
    const id = (params as any).id;
    const router = useRouter();
    const location = useLocation();
    const search = useSearch({ strict: false });
    const [users, setUsers] = useState<UserRetrieve[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState((search as any)?.users_page || 1);
    const [pageSize, setPageSize] = useState((search as any)?.users_pagesize || 10);
    const { usersApi } = useApi();
    const { isAdmin } = useProfile();
    const [addUserModalOpen, setAddUserModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const fetchUsersMutation = useMutation({
        mutationFn: async () => {
            return await usersApi.usersList();
        },
        meta: {
            suppressNotification: true,
        },
    });

    const deleteUsersMutation = useMutation({
        mutationFn: async (userIds: string[]) => {
            await Promise.all(
                userIds.map((userId) => usersApi.usersDestroy({ userId })),
            );
        },
        onSuccess: (_, userIds) => {
            toast.success(
                `Successfully deleted ${userIds.length} user${userIds.length > 1 ? 's' : ''}`,
            );
        },
        errorMessage: 'Failed to delete users',
    });

    const displayUsers = async () => {
        setIsLoading(true);
        try {
            const fetchedUsers = await fetchUsersMutation.mutateAsync();
            setUsers(fetchedUsers || []);
        } catch (error) {
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        displayUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUserClick = (user: UserRetrieve) => {
        router.navigate({ to: `/manage/users/${user.id || user.username}` as any });
    };

    const handleActivityClick = (user: UserRetrieve, e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handlePermissionsClick = (user: UserRetrieve, e: React.MouseEvent) => {
        e.stopPropagation();
    };

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

    const handleAddUser = () => {
        setAddUserModalOpen(true);
    };

    const handleUserAdded = (newUser: UserRetrieve) => {
        displayUsers();
        if (newUser.id || newUser.username) {
            router.navigate({
                to: `/manage/users/${newUser.id || newUser.username}` as any,
            });
        }
    };

    const handleRowSelectionChange = useCallback((selectedIds: string[]) => {
        setSelectedUsers(selectedIds);
    }, []);

    const handleDeleteUsers = async (userIds: string[]) => {
        deleteUsersMutation.mutate(userIds, {
            onSuccess: () => {
                setSelectedUsers([]);
                displayUsers();
            },
            onError: () => {
                toast.error('Failed to delete users');
            },
        });
    };

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) {
            return users;
        }
        const query = searchQuery.toLowerCase();
        return users.filter(
            (user) =>
                user.username?.toLowerCase().includes(query) ||
                user.email?.toLowerCase().includes(query) ||
                user.role?.toLowerCase().includes(query),
        );
    }, [users, searchQuery]);

    // Calculate total pages and paginate data
    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    }, [filteredUsers.length, pageSize]);

    const paginatedUsers = useMemo(() => {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return filteredUsers.slice(start, end);
    }, [filteredUsers, page, pageSize]);

    // Sync URL params to page state
    useEffect(() => {
        const pageFromParams = (search as any)?.users_page || 1;
        const pageSizeFromParams = (search as any)?.users_pagesize || 10;
        if (pageFromParams !== page) setPage(pageFromParams);
        if (pageSizeFromParams !== pageSize) setPageSize(pageSizeFromParams);
    }, [(search as any)?.users_page, (search as any)?.users_pagesize]);

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
                    users_page: 1,
                    users_pagesize: newPageSize,
                };
                router.navigate({
                    to: location.pathname as any,
                    search: newSearch as any,
                    replace: true,
                });
            }
            // Handle page change
            else if (newPage !== page) {
                setPage(newPage);
                const searchAny = search as any;
                const newSearch: any = { ...searchAny, users_page: newPage };
                router.navigate({
                    to: location.pathname as any,
                    search: newSearch as any,
                    replace: true,
                });
            }
        },
        [page, pageSize, search, router, location.pathname],
    );

    const columns = useMemo<ColumnDef<UserRetrieve>[]>(
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
                accessorKey: 'username',
                header: 'Username',
                cell: ({ row }) => (
                    <div
                        className='font-medium cursor-pointer'
                        onClick={() => handleUserClick(row.original)}
                    >
                        {row.original.username}
                    </div>
                ),
            },
            {
                accessorKey: 'email',
                header: 'Email',
                cell: ({ row }) => (
                    <div className='text-muted-foreground'>{row.original.email}</div>
                ),
            },
            {
                accessorKey: 'role',
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
            },
            {
                accessorKey: 'isActive',
                header: 'Status',
                cell: ({ row }) => {
                    const isActive = row.original.isActive;
                    return (
                        <Badge variant={isActive ? 'default' : 'secondary'}>
                            {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    );
                },
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const user = row.original;
                    return (
                        <div
                            className='w-12 text-right'
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className='flex justify-end'>
                                <TableActionsButton>
                                    {isAdmin() && (
                                        <DropdownMenuItem
                                            onClick={(e) =>
                                                handleActivityClick(user, e)
                                            }
                                        >
                                            <ClockRotateRight width='18' height='18' />
                                            View Activity
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                        onClick={(e) => handlePermissionsClick(user, e)}
                                    >
                                        <Lock width='18' height='18' />
                                        Edit Permissions
                                    </DropdownMenuItem>
                                </TableActionsButton>
                            </div>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [isAdmin],
    );

    if (id && id !== 'add') {
        return (
            <AdminPageLayout>
                <AdminUserSettings userId={id} />
            </AdminPageLayout>
        );
    }

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
                                    <UserPlus />
                                    Add User
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Create a new user account</TooltipContent>
                        </Tooltip>
                    }
                />
                <div className='px-4 flex-1 flex flex-col'>
                    <div className='pb-4'>
                        <ActionBar
                            left={
                                <ActionBarSearch
                                    placeholder='Search users...'
                                    value={searchQuery}
                                    onDebouncedChange={setSearchQuery}
                                    onSubmit={setSearchQuery}
                                />
                            }
                        />
                    </div>
                    <div className='flex-1'>
                        <DataTable
                            columns={columns}
                            data={paginatedUsers}
                            loading={isLoading}
                            emptyMessage='No users found.'
                            enableRowSelection={true}
                            selectedRows={selectedUsers}
                            onRowSelectionChange={handleRowSelectionChange}
                            onRowClick={handleUserClick}
                            manualPagination={true}
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
                                        if (selectedUsers.length === 0) return;
                                        setDeleteModalOpen(true);
                                    },
                                    disabled:
                                        isLoading ||
                                        selectedUsers.length === 0 ||
                                        filteredUsers.length === 0,
                                    variant: 'destructive',
                                },
                            ]}
                            itemLabel='user'
                        />
                    </div>
                </div>
            </div>
            <AddUserModal
                open={addUserModalOpen}
                onOpenChange={setAddUserModalOpen}
                onAdd={handleUserAdded}
            />
            <ConfirmDeletionModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                onConfirm={() => handleDeleteUsers(selectedUsers)}
                confirmText='DELETE'
                text={`Are you sure you want to delete ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}? This action is irreversible.`}
            />
        </AdminPageLayout>
    );
}
