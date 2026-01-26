import {
    ActionBarSearch,
    ActionBar as BaseActionBar,
} from '@/components/base/ActionBar/ActionBar';
import PageHeader from '@/components/base/PageHeader';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import {
    ClockCounterClockwiseIcon,
    GearSixIcon,
    LockKeyIcon,
    PasswordIcon,
    PencilIcon,
    TrashIcon,
    UserIcon,
    UserPlusIcon,
} from '@phosphor-icons/react';
import { UserRetrieve } from '@services/cradle/models';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    useLocation,
    useParams,
    useRouter,
    useRouterState,
    useSearch,
} from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AddUserDialog from '../../../dialogs/admin/AddUserDialog';
import ConfirmDeletionDialog from '../../../dialogs/base/ConfirmDeletionDialog';
import AdminPageLayout from '../AdminPageLayout';
import AdminUserSettings from './AdminUserSettings';

const USER_SETTINGS_ITEMS = [
    { id: 'account', label: 'Account', icon: UserIcon },
    { id: 'administrative', label: 'Administrative', icon: GearSixIcon },
    { id: 'permissions', label: 'Permissions', icon: LockKeyIcon },
    { id: 'activity', label: 'Activity', icon: ClockCounterClockwiseIcon },
    { id: 'sessions', label: 'Sessions', icon: PasswordIcon },
    { id: 'management', label: 'Management', icon: GearSixIcon },
];

function UserSettingsPage({ userId }: { userId: string }) {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });
    const tab = (search as any)?.tab;
    const { usersApi } = useApi();

    // Query for user data to get username
    const { data: userData } = useQuery({
        queryKey: queryKeys.users.detail(userId),
        queryFn: () => usersApi.usersRetrieve({ userId }),
        enabled: !!userId,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const handleTabClick = (tabId: string) => {
        const newSearch: any = { ...search, tab: tabId };
        router.navigate({
            to: location.pathname as any,
            search: newSearch,
            replace: true,
        });
    };

    // Auto-select first tab if no tab
    useEffect(() => {
        if (!tab && USER_SETTINGS_ITEMS.length > 0) {
            const newSearch: any = { ...search, tab: USER_SETTINGS_ITEMS[0].id };
            router.navigate({
                to: location.pathname as any,
                search: newSearch,
                replace: true,
            });
        }
    }, [tab, router, location.pathname, search]);

    const selectedItem = USER_SETTINGS_ITEMS.find((item) => item.id === tab);
    const currentTab = selectedItem || USER_SETTINGS_ITEMS[0];

    const tabDescriptions: Record<string, string> = {
        account: 'Manage user account information and basic settings',
        administrative: 'Configure user permissions and administrative settings',
        permissions: 'Manage entity access permissions for this user',
        activity: 'View user activity and audit logs',
        sessions: 'View and manage active user sessions',
        management: 'Administrative actions for user management',
    };
    const currentDescription =
        tab && tab in tabDescriptions ? tabDescriptions[tab] : '';

    return (
        <main
            data-layout='fixed'
            className='px-4 py-6 flex grow flex-col overflow-hidden @7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl'
        >
            <div className='space-y-0.5'>
                <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
                    {userData?.username || 'User Settings'}
                </h1>
                <p className='text-muted-foreground'>
                    Manage user account and administrative settings.
                </p>
            </div>
            <Separator
                data-orientation='horizontal'
                role='none'
                className='shrink-0 my-4 lg:my-6'
            />
            <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12'>
                <aside className='top-0 lg:sticky lg:w-1/5'>
                    {/* Mobile dropdown */}
                    <div className='p-1 md:hidden'>
                        <Select
                            value={tab || USER_SETTINGS_ITEMS[0].id}
                            onValueChange={handleTabClick}
                        >
                            <SelectTrigger className='h-12 sm:w-48'>
                                <SelectValue>
                                    <div className='flex gap-x-4 px-2 py-1 items-center'>
                                        <span className='scale-125 flex items-center'>
                                            {currentTab && (
                                                <currentTab.icon className='w-[18px] h-[18px]' />
                                            )}
                                        </span>
                                        <span className='text-md'>
                                            {currentTab?.label}
                                        </span>
                                    </div>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {USER_SETTINGS_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <SelectItem key={item.id} value={item.id}>
                                            <div className='flex gap-x-2 items-center'>
                                                <Icon className='w-[18px] h-[18px]' />
                                                <span>{item.label}</span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Desktop navigation */}
                    <div className='relative hidden w-full min-w-40 bg-background px-1 py-2 md:block'>
                        <nav className='flex space-x-2 py-1 lg:flex-col lg:space-y-1 lg:space-x-0'>
                            {USER_SETTINGS_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const isActive = tab === item.id;
                                return (
                                    <a
                                        key={item.id}
                                        href='#'
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleTabClick(item.id);
                                        }}
                                        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:text-accent-foreground dark:hover:bg-accent/50 h-9 px-4 py-2 has-[>svg]:px-3 hover:bg-accent justify-start ${
                                            isActive
                                                ? 'bg-muted hover:bg-accent active'
                                                : ''
                                        }`}
                                        data-status={isActive ? 'active' : undefined}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        <span className='me-2'>
                                            <Icon className='w-[18px] h-[18px]' />
                                        </span>
                                        {item.label}
                                    </a>
                                );
                            })}
                        </nav>
                    </div>
                </aside>
                <div className='flex w-full overflow-y-hidden p-1'>
                    <div className='flex flex-1 flex-col'>
                        <div className='flex-none'>
                            <h3 className='text-lg font-medium'>
                                {currentTab?.label || 'Settings'}
                            </h3>
                            <p className='text-sm text-muted-foreground'>
                                {currentDescription}
                            </p>
                        </div>
                        <Separator
                            data-orientation='horizontal'
                            role='none'
                            className='bg-border my-4 flex-none'
                        />
                        <div className='faded-bottom h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth pe-4 pb-12'>
                            <div className='-mx-1 px-1.5'>
                                <AdminUserSettings userId={userId} activeTab={tab} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function UsersPage() {
    const params = useParams({ strict: false });
    const id = (params as any).id;
    const router = useRouter();
    const location = useLocation();
    const search = useSearch({ strict: false });
    const [users, setUsers] = useState<UserRetrieve[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState((search as any)?.users_page || 1);
    const [pageSize, setPageSize] = useState((search as any)?.users_pagesize || 10);
    const { usersApi } = useApi();
    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
    const [deleteUserIds, setDeleteUserIds] = useState<string[]>([]);

    const selectedUserIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

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
        meta: {
            errorMessage: 'Failed to delete users',
        },
        onSuccess: (_, userIds) => {
            toast.success(
                `Successfully deleted ${userIds.length} user${userIds.length > 1 ? 's' : ''}`,
            );
        },
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
        setAddUserDialogOpen(true);
    };

    const handleUserAdded = (newUser: UserRetrieve) => {
        displayUsers();
        if (newUser.id || newUser.username) {
            router.navigate({
                to: `/manage/users/${newUser.id || newUser.username}` as any,
            });
        }
    };

    const handleDeleteUsers = async (userIds: string[]) => {
        deleteUsersMutation.mutate(userIds, {
            onSuccess: () => {
                clearSelection();
                displayUsers();
            },
            onError: () => {
                toast.error('Failed to delete users');
            },
        });
    };

    const handleDeleteSelected = useCallback(() => {
        if (selectedUserIds.length === 0) return;
        setDeleteUserIds(selectedUserIds);
        setDeleteDialogOpen(true);
        setDeleteUserId(null); // Clear single delete user id to use bulk delete
    }, [selectedUserIds]);

    const handleEditSelected = useCallback(() => {
        if (selectedUserIds.length !== 1) return;
        const userId = selectedUserIds[0];
        router.navigate({ to: `/manage/users/${userId}` as any });
    }, [selectedUserIds, router]);

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
        [handleUserClick, getRoleBadgeVariant],
    );

    const table = useReactTable({
        data: paginatedUsers,
        columns,
        state: {
            rowSelection,
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
        },
        getRowId: (row, index) => String(row.id ?? row.username ?? index),
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

    if (id && id !== 'add') {
        return (
            <AdminPageLayout>
                <UserSettingsPage userId={id} />
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
                                    <UserPlusIcon size={18} weight='bold' />
                                    Add User
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Create a new user account</TooltipContent>
                        </Tooltip>
                    }
                />
                <div className='px-4 flex-1 flex flex-col'>
                    <div className='pb-4'>
                        <BaseActionBar
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
                    <div className='flex-1 space-y-4'>
                        {isLoading ? (
                            <div className='flex min-h-[200px] items-center justify-center'>
                                <Spinner className='size-10' />
                            </div>
                        ) : (
                            <DataTable table={table} onRowClick={handleUserClick} />
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
                        disabled={isLoading || selectedUserIds.length !== 1}
                    >
                        <PencilIcon size={18} weight='bold' />
                        Edit
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={handleDeleteSelected}
                        disabled={isLoading || selectedUserIds.length === 0}
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
                        setDeleteUserId(null);
                        setDeleteUserIds([]);
                    }
                }}
                onConfirm={() => {
                    if (deleteUserId) {
                        handleDeleteUsers([deleteUserId]);
                        setDeleteUserId(null);
                    } else if (deleteUserIds.length > 0) {
                        handleDeleteUsers(deleteUserIds);
                        setDeleteUserIds([]);
                    }
                }}
                confirmText={
                    deleteUserId
                        ? users.find((u) => (u.id || u.username) === deleteUserId)
                              ?.username || 'DELETE'
                        : deleteUserIds.length === 1
                          ? users.find((u) => (u.id || u.username) === deleteUserIds[0])
                                ?.username || 'DELETE'
                          : `DELETE ${deleteUserIds.length}`
                }
                text={
                    deleteUserId
                        ? 'Are you sure you want to delete this user? This action is irreversible.'
                        : `Are you sure you want to delete ${deleteUserIds.length} user${deleteUserIds.length > 1 ? 's' : ''}? This action is irreversible.`
                }
            />
        </AdminPageLayout>
    );
}
