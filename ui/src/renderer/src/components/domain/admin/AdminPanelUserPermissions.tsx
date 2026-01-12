import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import useApi from '@/hooks/api/useApi';
import { useAuthActions } from '@/hooks/auth/useAuth';
import { SearchableChild } from '@/hooks/search/useFrontendSearch';
import { naturalSort } from '@/utils/dashboard';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { Search, Xmark } from 'iconoir-react';
import { useEffect, useState } from 'react';
import AdminPanelPermissionCard from './cards/AdminPanelPermissionCard';

interface AdminPanelUserPermissionsProps {
    username: string;
    id: string;
}

/**
 * AdminPanelUserPermissions component - Displays and manages permissions for a specific user
 */
export default function AdminPanelUserPermissions({
    username,
    id,
}: AdminPanelUserPermissionsProps) {
    const [entities, setEntities] = useState<SearchableChild[]>([]);
    const [searchVal, setSearchVal] = useState('');
    const { accessApi, usersApi } = useApi();
    const router = useRouter();
    const { setTokensDirectly } = useAuthActions();

    const simulateSessionMutation = useMutation({
        mutationFn: async () => {
            return await usersApi.usersManageRetrieve({
                userId: String(id),
                actionName: 'simulate',
            });
        },
        meta: {
            errorMessage: 'Failed to simulate session',
        },
        onSuccess: (res) => {
            setTokensDirectly(res as any);
            router.navigate({ to: '/', replace: true });
        },
    });

    const sendEmailConfirmationMutation = useMutation({
        mutationFn: async () => {
            await usersApi.usersManageRetrieve({
                userId: String(id),
                actionName: 'send_email_confirmation',
            });
        },
        meta: {
            successMessage: 'Email confirmation sent successfully',
        },
    });

    const sendPasswordResetEmailMutation = useMutation({
        mutationFn: async () => {
            await usersApi.usersManageRetrieve({
                userId: String(id),
                actionName: 'password_reset_email',
            });
        },
        meta: {
            successMessage: 'Password reset email sent successfully',
        },
    });

    const fetchPermissionsMutation = useMutation({
        mutationFn: async () => {
            return await accessApi.accessUserList({ userId: String(id) });
        },
        meta: {
            errorMessage: 'Failed to load user permissions',
        },
    });

    const simulateSession = () => {
        simulateSessionMutation.mutate();
    };

    const sendEmailConfirmation = () => {
        sendEmailConfirmationMutation.mutate();
    };

    const sendPasswordResetEmail = () => {
        sendPasswordResetEmailMutation.mutate();
    };

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const permissions = await fetchPermissionsMutation.mutateAsync();
                setEntities(
                    permissions
                        .map((c) => {
                            return (
                                <AdminPanelPermissionCard
                                    key={c.name}
                                    userId={String(id)}
                                    text={c.name}
                                    entityId={c.id}
                                    searchKey={c.name}
                                    accessLevel={
                                        (c.accessType ?? 'none') as
                                            | 'none'
                                            | 'read'
                                            | 'read-write'
                                    }
                                />
                            );
                        })
                        .sort((a, b) => {
                            const aKey = a.key?.toString() || '';
                            const bKey = b.key?.toString() || '';
                            return naturalSort(aKey, bKey);
                        }),
                );
            } catch (error) {
                // Error already handled
                setEntities([]);
            }
        };

        fetchPermissions();
    }, [id, accessApi, fetchPermissionsMutation]);

    // Filter entities based on search
    const filteredEntities = entities.filter((entity) => {
        const searchKey = (entity.props?.searchKey || '').toLowerCase();
        return searchKey.includes(searchVal.toLowerCase());
    });

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>
                        User Permissions: {username}
                    </h2>
                    <p className='text-muted-foreground'>
                        Manage entity access and user actions
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full'>
                    {/* Permissions Section */}
                    <section id='permissions'>
                        <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                            Entity Permissions
                        </h2>
                        <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                            Configure access levels for each entity
                        </p>

                        {/* Search Bar */}
                        <div className='mb-4'>
                            <div className='flex items-center gap-2 bg-bg-card border border-border-border h-10 px-2 rounded-full'>
                                <Button
                                    variant='ghost'
                                    size='icon-sm'
                                    className='p-1 flex-shrink-0 text-text-muted-foreground hover:text-text-foreground'
                                    title='Search'
                                >
                                    <Search className='w-4 h-4' />
                                </Button>
                                <Input
                                    type='text'
                                    placeholder='Search entities'
                                    className='flex-grow bg-transparent text-sm outline-none text-text-foreground placeholder:text-text-muted-foreground rounded-none font-mono border-0 shadow-none'
                                    onChange={(e) => setSearchVal(e.target.value)}
                                    value={searchVal}
                                />
                                {searchVal && (
                                    <Button
                                        variant='ghost'
                                        size='icon-sm'
                                        onClick={() => setSearchVal('')}
                                        className='p-1 flex-shrink-0 text-text-muted-foreground hover:text-text-foreground'
                                        title='Clear search'
                                    >
                                        <Xmark className='w-4 h-4' />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Permissions List */}
                        <ScrollArea className='space-y-2 max-h-[60vh]'>
                            {filteredEntities.length > 0 ? (
                                filteredEntities.sort((a, b) => {
                                    const aKey = a.key?.toString() || '';
                                    const bKey = b.key?.toString() || '';
                                    return naturalSort(aKey, bKey);
                                })
                            ) : (
                                <div className='text-center py-8'>
                                    <p className='text-sm text-muted-foreground'>
                                        {searchVal
                                            ? 'No entities found matching your search'
                                            : 'No entities available'}
                                    </p>
                                </div>
                            )}
                        </ScrollArea>
                    </section>
                </div>
            </div>
        </div>
    );
}
