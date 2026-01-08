import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { UserRetrieve } from '@services/cradle/models';
import { uniqueId } from 'lodash';
import { ClockRotateRight, Lock } from 'iconoir-react/regular';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import TableActionsButton from '@/components/base/TableActionsButton';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import AccountSettings from '../../user/AccountSettings';
import ActivityList from '../../activity/ActivityList';
import AdminPanelUserPermissions from '../AdminPanelUserPermissions';
import AdminPageLayout from '../AdminPageLayout';
import { useProfile } from '@/contexts/user/ProfileContext';

export default function UsersPage() {
    const [users, setUsers] = useState<UserRetrieve[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rightPane, setRightPane] = useState<ReactNode | null>(null);
    const { usersApi } = useApi();
    const { execute } = useAPICall();
    const { isAdmin } = useProfile();

    const displayUsers = async () => {
        setIsLoading(true);
        execute(() => usersApi.usersList())
            .then((fetchedUsers) => {
                setUsers(fetchedUsers || []);
            })
            .catch(() => {
                setUsers([]);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    useEffect(() => {
        displayUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUserClick = (user: UserRetrieve) => {
        setRightPane(<AccountSettings target={String(user.id || user.username)} />);
    };

    const handleActivityClick = (user: UserRetrieve, e: React.MouseEvent) => {
        e.stopPropagation();
        setRightPane(
            <ActivityList
                content_type='entryclass'
                username={user.username}
                name={user.username}
                key={user.username}
            />,
        );
    };

    const handlePermissionsClick = (user: UserRetrieve, e: React.MouseEvent) => {
        e.stopPropagation();
        setRightPane(
            <AdminPanelUserPermissions
                username={user.username}
                id={String(user.id || user.username)}
                key={String(user.id || user.username)}
            />,
        );
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

    const columns = useMemo<ColumnDef<UserRetrieve>[]>(
        () => [
            {
                accessorKey: 'username',
                header: 'Username',
                cell: ({ row }) => (
                    <div className='font-medium cursor-pointer' onClick={() => handleUserClick(row.original)}>
                        {row.original.username}
                    </div>
                ),
            },
            {
                accessorKey: 'email',
                header: 'Email',
                cell: ({ row }) => <div className='text-muted-foreground'>{row.original.email}</div>,
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
                header: 'Actions',
                cell: ({ row }) => {
                    const user = row.original;
                    return (
                        <div className='flex justify-end' onClick={(e) => e.stopPropagation()}>
                            <TableActionsButton>
                                {isAdmin() && (
                                    <DropdownMenuItem onClick={(e) => handleActivityClick(user, e)}>
                                        <ClockRotateRight width='18' height='18' />
                                        View Activity
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={(e) => handlePermissionsClick(user, e)}>
                                    <Lock width='18' height='18' />
                                    Edit Permissions
                                </DropdownMenuItem>
                            </TableActionsButton>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [isAdmin],
    );

    const handleAddUser = () => {
        setRightPane(
            <AccountSettings
                isEdit={false}
                key={uniqueId('user-form-')}
                onAdd={(newUser: UserRetrieve) => {
                    displayUsers();
                    setRightPane(<AccountSettings target={String(newUser.id || newUser.username)} />);
                }}
            />,
        );
    };

    return (
        <AdminPageLayout rightPane={rightPane}>
            <div className='w-full h-full flex flex-col rounded-md px-3'>
                <div className='flex items-center justify-between py-4'>
                    <div>
                        <h2 className='text-2xl font-bold tracking-tight'>Users</h2>
                        <p className='text-muted-foreground'>Manage user accounts and permissions</p>
                    </div>
                    <Button onClick={handleAddUser}>Add User</Button>
                </div>
                <div className='flex-1 overflow-hidden'>
                    <DataTable
                        columns={columns}
                        data={users}
                        loading={isLoading}
                        emptyMessage='No users found.'
                        onRowClick={handleUserClick}
                    />
                </div>
            </div>
        </AdminPageLayout>
    );
}
