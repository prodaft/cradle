import PageHeader from '@/components/base/page-header';
import { SearchInput } from '@/components/base/search-input/search-input';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import type { SearchSchema, SearchState } from '@/lib/search-query/search-schema';
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

type UserRow = components['schemas']['UserRetrieve'];

const roleBadgeVariant = (role?: string) => {
    switch (role) {
        case 'admin':
            return 'destructive';
        case 'manager':
            return 'default';
        default:
            return 'outline';
    }
};

type UserRole = NonNullable<UserRow['role']>;

const ROLE_VALUES = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'author', label: 'Author' },
] as const satisfies readonly { value: UserRole; label: string }[];

const SEARCH_SCHEMA: SearchSchema = {
    qualifiers: [
        { key: 'role', kind: 'enum', description: 'role', values: ROLE_VALUES },
    ],
};

export default function UsersList() {
    useDockPanelTab({ title: 'Manage: Users', icon: 'manage-users' });
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false }) as any;
    const page = Number(search?.users_page ?? 1) || 1;
    const pageSize = Number(search?.users_pagesize ?? 20) || 20;
    const applied = (search?.users_search ?? '') as string;
    const appliedRole = ROLE_VALUES.find((r) => r.value === search?.users_role)?.value;
    const searchState = useMemo<SearchState>(() => {
        const values: SearchState['values'] = appliedRole
            ? { role: [appliedRole] }
            : {};
        return { q: applied || undefined, values, dates: {} };
    }, [applied, appliedRole]);

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const { userId: selfId } = useAuthState();
    const queryClient = useQueryClient();
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [typed, setTyped] = useState('');

    const checkedIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

    const listQuery = useMemo(() => {
        const trimmed = applied.trim();
        return {
            page,
            page_size: pageSize,
            ...(trimmed ? { search: trimmed } : {}),
            ...(appliedRole ? { role: appliedRole } : {}),
        };
    }, [page, pageSize, applied, appliedRole]);
    const { data: usersPage, isPending } = $api.useQuery(
        'get',
        '/users/',
        {
            params: { query: listQuery },
        },
        {
            meta: {
                showErrorToast: false,
                suppressNotification: true,
            },
        },
    );

    const rows = useMemo(() => usersPage?.results ?? [], [usersPage]);

    const selectionHasOtherAdmin = useMemo(
        () =>
            checkedIds.some((id) => {
                const row = rows.find((r) => String(r.id) === id);
                return row?.role === 'admin' && row.id !== selfId;
            }),
        [checkedIds, rows, selfId],
    );

    const deleteUsers = useMutation({
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

    const openUser = useCallback(
        (item: UserRow) => {
            router.navigate({ to: `/manage/users/${item.id}` as any });
        },
        [router],
    );

    const openAddUser = () => {
        setIsAddUserOpen(true);
    };

    const handleUserCreated = (newUser: UserRow) => {
        setIsAddUserOpen(false);
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
        if (newUser.id) {
            router.navigate({ to: `/manage/users/${newUser.id}` as any });
        }
    };

    const confirmDelete = useCallback(() => {
        if (checkedIds.length === 0) return;
        setPendingDeleteIds(checkedIds);
        setIsDeleteOpen(true);
    }, [checkedIds]);

    const editSelected = useCallback(() => {
        if (checkedIds.length !== 1) return;
        const userId = checkedIds[0];
        router.navigate({ to: `/manage/users/${userId}` as any });
    }, [checkedIds, router]);

    const totalPages = Math.max(1, usersPage?.total_pages ?? 1);

    const applySearch = useCallback(
        (state: SearchState) => {
            router.navigate({
                to: location.pathname as any,
                search: {
                    ...search,
                    users_page: 1,
                    users_search: state.q || undefined,
                    users_role: state.values.role?.[0] || undefined,
                } as any,
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    const paginate = useCallback(
        (pageIndex: number, size: number) => {
            const target = pageIndex + 1;
            if (size !== pageSize) {
                router.navigate({
                    to: location.pathname as any,
                    search: {
                        ...search,
                        users_page: 1,
                        users_pagesize: size,
                    } as any,
                    replace: true,
                });
            } else if (target !== page) {
                router.navigate({
                    to: location.pathname as any,
                    search: ((prev: any) => ({ ...prev, users_page: target })) as any,
                    replace: true,
                });
            }
        },
        [page, pageSize, search, router, location.pathname],
    );

    const columns = useMemo<ColumnDef<UserRow>[]>(
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
                accessorKey: 'username',
                id: 'username',
                meta: { label: 'Username' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Username' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return <div className='font-medium'>{item.username}</div>;
                },
            },
            {
                accessorKey: 'email',
                id: 'email',
                meta: { label: 'Email' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Email' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return <div className='text-muted-foreground'>{item.email}</div>;
                },
            },
            {
                accessorKey: 'role',
                id: 'role',
                meta: { label: 'Role' },
                header: 'Role',
                cell: ({ row }) => {
                    const item = row.original;
                    const role = item.role;
                    if (!role) return <span className='text-muted-foreground'>-</span>;
                    return (
                        <Badge variant={roleBadgeVariant(role)}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Badge>
                    );
                },
                enableSorting: false,
            },
            {
                accessorKey: 'is_active',
                id: 'is_active',
                meta: { label: 'Status' },
                size: 28,
                minSize: 28,
                maxSize: 28,
                header: 'Status',
                cell: ({ row }) => {
                    const item = row.original;
                    const isActive = item.is_active;
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
        data: rows,
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
            const current = {
                pageIndex: page - 1,
                pageSize,
            };
            const next = typeof updater === 'function' ? updater(current) : updater;
            paginate(next.pageIndex, next.pageSize);
        },
        getCoreRowModel: getCoreRowModel(),
        enableRowSelection: true,
        enableSorting: false,
        manualPagination: true,
        pageCount: totalPages,
        rowCount: usersPage?.count,
    });

    const deleteCount = pendingDeleteIds.length;
    const username =
        deleteCount === 1
            ? rows.find((r) => r.id === pendingDeleteIds[0])?.username
            : undefined;
    const phrase = username ?? (deleteCount > 1 ? `DELETE ${deleteCount}` : 'DELETE');
    const message =
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
                            <TooltipTrigger render={<Button onClick={openAddUser} />}>
                                <UserPlusIcon size={18} weight='bold' />
                                Add User
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
                            onRowClick={openUser}
                            getRowHref={(item) => `/manage/users/${item.id}`}
                        >
                            <SearchInput
                                schema={SEARCH_SCHEMA}
                                value={searchState}
                                onApply={applySearch}
                                placeholder='Search users... (role:admin)'
                            />
                        </DataTable>
                    </div>
                </div>
            </div>
            <ActionBar
                open={checkedIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {checkedIds.length} user
                    {checkedIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={editSelected}
                        disabled={isPending || checkedIds.length !== 1}
                    >
                        <PencilIcon size={18} weight='bold' />
                        Edit
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={confirmDelete}
                        disabled={
                            isPending ||
                            checkedIds.length === 0 ||
                            selectionHasOtherAdmin
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
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>Add User</DialogTitle>
                        <DialogDescription>Create a new user account</DialogDescription>
                    </DialogHeader>
                    <AddUserForm onAdd={handleUserCreated} />
                </DialogContent>
            </Dialog>
            <AlertDialog
                open={isDeleteOpen}
                onOpenChange={(open) => {
                    setIsDeleteOpen(open);
                    if (!open) {
                        setPendingDeleteIds([]);
                        setTyped('');
                    }
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>{message}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <FieldGroup className='gap-4'>
                        <Field>
                            <FieldLabel htmlFor='confirm-delete-users'>
                                Type below to confirm
                            </FieldLabel>
                            <Input
                                id='confirm-delete-users'
                                type='text'
                                placeholder={`Type "${phrase}" to confirm`}
                                value={typed}
                                onChange={(e) => setTyped(e.target.value)}
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
                                if (pendingDeleteIds.length > 0) {
                                    deleteUsers.mutate(pendingDeleteIds, {
                                        onSuccess: () => clearSelection(),
                                    });
                                }
                                setPendingDeleteIds([]);
                                setIsDeleteOpen(false);
                            }}
                            disabled={typed !== phrase}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
