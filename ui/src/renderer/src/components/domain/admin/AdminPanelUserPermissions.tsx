import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useAuth from '@/hooks/auth/useAuth';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { naturalSort } from '@/utils/dashboard';
import { SettingsButton, SettingsCard, SettingsSeparator } from '@components/forms';
import { Mail, RefreshDouble, User } from 'iconoir-react';
import { ReactElement, useEffect, useState } from 'react';
import { Search, Xmark } from 'iconoir-react';
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
    const [entities, setEntities] = useState<ReactElement[]>([]);
    const [searchVal, setSearchVal] = useState('');
    const { accessApi, usersApi } = useApi();
    const { navigate } = useCradleNavigate();
    const auth = useAuth();
    const { execute } = useAPICall();

    const simulateSession = () => {
        execute(() =>
            usersApi.usersManageRetrieve({
                userId: String(id),
                actionName: 'simulate',
            }),
        )
            .then((res) => {
                auth.setTokensDirectly(res as any);
                navigate('/', { replace: true });
            })
            .catch(() => {});
    };

    const sendEmailConfirmation = () => {
        execute(
            () =>
                usersApi.usersManageRetrieve({
                    userId: String(id),
                    actionName: 'send_email_confirmation',
                }),
            { successMessage: 'Email confirmation sent successfully' },
        ).catch(() => {});
    };

    const sendPasswordResetEmail = () => {
        execute(
            () =>
                usersApi.usersManageRetrieve({
                    userId: String(id),
                    actionName: 'password_reset_email',
                }),
            { successMessage: 'Password reset email sent successfully' },
        ).catch(() => {});
    };

    useEffect(() => {
        execute(() => accessApi.accessUserList({ userId: String(id) }))
            .then((permissions) => {
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
            })
            .catch(() => {});
    }, [id, accessApi, execute]);

    // Filter entities based on search
    const filteredEntities = entities.filter((entity) => {
        const searchKey = (entity.props?.searchKey || '').toLowerCase();
        return searchKey.includes(searchVal.toLowerCase());
    });

    return (
        <div className='w-full h-full overflow-auto'>
            {/* Page Header */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        User Permissions: {username}
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                        Manage entity access and user actions
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full'>
                    {/* Actions Section */}
                    <section id='actions' className='pb-8'>
                        <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                            User Actions
                        </h2>
                        <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                            Administrative actions for this user
                        </p>

                        <div className='space-y-4'>
                            <SettingsCard>
                                <SettingsButton
                                    label='Simulate Session'
                                    description='Jump into a session for this user'
                                    buttonText='Simulate'
                                    icon={<User className='w-3.5 h-3.5' />}
                                    onClick={simulateSession}
                                />

                                <SettingsSeparator />

                                <SettingsButton
                                    label='Email Confirmation'
                                    description='Send email verification to user'
                                    buttonText='Send Email'
                                    icon={<Mail className='w-3.5 h-3.5' />}
                                    onClick={sendEmailConfirmation}
                                />

                                <SettingsSeparator />

                                <SettingsButton
                                    label='Password Reset'
                                    description='Send password reset email'
                                    buttonText='Send Reset'
                                    icon={<RefreshDouble className='w-3.5 h-3.5' />}
                                    onClick={sendPasswordResetEmail}
                                />
                            </SettingsCard>
                        </div>
                    </section>

                    {/* Permissions Section */}
                    <section id='permissions' className='border-t border-white/5 pt-5 pb-8'>
                        <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                            Entity Permissions
                        </h2>
                        <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                            Configure access levels for each entity
                        </p>

                        {/* Search Bar */}
                        <div className='mb-4'>
                            <div className='flex items-center gap-2 bg-cradle-bg-elevated border border-cradle-border-accent h-10 px-2 rounded-full'>
                                <button
                                    className='p-1 flex-shrink-0 transition-colors text-cradle-text-muted hover:text-cradle-text-primary'
                                    title='Search'
                                >
                                    <Search className='w-4 h-4' />
                                </button>
                                <input
                                    type='text'
                                    placeholder='Search entities'
                                    className='flex-grow bg-transparent text-sm outline-none text-cradle-text-primary placeholder:text-cradle-text-muted rounded-none font-mono'
                                    onChange={(e) => setSearchVal(e.target.value)}
                                    value={searchVal}
                                />
                                {searchVal && (
                                    <button
                                        onClick={() => setSearchVal('')}
                                        className='p-1 flex-shrink-0 text-cradle-text-muted hover:text-cradle-text-primary transition-colors'
                                        title='Clear search'
                                    >
                                        <Xmark className='w-4 h-4' />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Permissions List */}
                        <div className='space-y-2 max-h-[60vh] overflow-y-auto'>
                            {filteredEntities.length > 0 ? (
                                filteredEntities.sort((a, b) => {
                                    const aKey = a.key?.toString() || '';
                                    const bKey = b.key?.toString() || '';
                                    return naturalSort(aKey, bKey);
                                })
                            ) : (
                                <div className='text-center py-8'>
                                    <p className='text-sm cradle-text-muted'>
                                        {searchVal
                                            ? 'No entities found matching your search'
                                            : 'No entities available'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
