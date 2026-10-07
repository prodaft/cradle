import {
    SettingsHeaderActionsProvider,
    SettingsHeaderActionsTarget,
} from '@/components/base/settings-header-actions/settings-header-actions';
import ActiveSessions from '@/components/domain/user/active-sessions';
import NotFound from '@/components/feedback/not-found';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthState } from '@/hooks/auth/use-auth';
import {
    ClockCounterClockwiseIcon,
    LightningIcon,
    LockKeyIcon,
    PasswordIcon,
    UserIcon,
} from '@phosphor-icons/react';
import { $api } from '@services/openapi/client';
import {
    useParams,
    useRouter,
    useRouterState,
    useSearch,
} from '@tanstack/react-router';
import { useMemo } from 'react';
import UserAccountForm from './user-account-form';
import UserActivityList from './user-activity-list';
import UserManagementActions from './user-management-actions';
import UserPermissionsForm from './user-permissions-form';

const USER_SETTINGS_ITEMS = [
    {
        id: 'account',
        label: 'Account',
        icon: UserIcon,
        description: 'Manage user account information, access and limits',
    },
    {
        id: 'actions',
        label: 'Actions',
        icon: LightningIcon,
        description: 'One-time actions for this user, applied immediately',
    },
    {
        id: 'permissions',
        label: 'Permissions',
        icon: LockKeyIcon,
        description: 'Manage entity access permissions for this user',
    },
    {
        id: 'activity',
        label: 'Activity',
        icon: ClockCounterClockwiseIcon,
        description: 'View user activity and audit logs',
    },
    {
        id: 'sessions',
        label: 'Sessions',
        icon: PasswordIcon,
        description: 'View and manage active user sessions',
    },
];

const defaultUserSettingsTabId = USER_SETTINGS_ITEMS[0]?.id ?? 'account';

export default function UserSettingsPage() {
    const params = useParams({ strict: false });
    const userId = (params as any).id as string;
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });
    const tab = (search as any)?.tab ?? defaultUserSettingsTabId;
    const { userId: currentUserId } = useAuthState();

    const { data, isLoading, isError } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: userId } } },
        {
            enabled: !!userId,
            retry: false,
            meta: {
                showErrorToast: false,
                suppressNotification: true,
            },
        },
    );

    const isOtherAdmin = data?.role === 'admin' && data?.id !== currentUserId;

    const visibleTabs = useMemo(
        () =>
            isOtherAdmin
                ? USER_SETTINGS_ITEMS.filter((item) => item.id !== 'actions')
                : USER_SETTINGS_ITEMS,
        [isOtherAdmin],
    );

    const dockPanelTitle = useMemo(
        () =>
            isError
                ? 'Not found'
                : data?.username
                  ? `Manage: ${data.username}`
                  : 'Manage: User',
        [isError, data?.username],
    );
    useDockPanelTab({
        title: dockPanelTitle,
        icon: isError ? 'not-found' : 'manage-users',
    });

    const handleTabChange = (tabId: string) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), tab: tabId },
            replace: true,
        });
    };

    const currentTab =
        visibleTabs.find((item) => item.id === tab) ??
        visibleTabs.find((item) => item.id === defaultUserSettingsTabId);
    const currentDescription = currentTab?.description ?? '';

    if (isLoading) {
        return (
            <div className='w-full h-full'>
                <div className='flex h-full items-center justify-center'>
                    <Spinner className='size-8' />
                </div>
            </div>
        );
    }

    if (isError) {
        return <NotFound message='The user you are looking for does not exist.' />;
    }

    return (
        <SettingsHeaderActionsProvider>
            <div className='w-full h-full'>
                <main
                    data-layout='fixed'
                    className='px-4 pt-4 pb-6 flex grow flex-col overflow-hidden @7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl'
                >
                    <div className='flex flex-wrap items-end justify-between gap-2'>
                        <div className='space-y-1'>
                            <h2 className='text-2xl font-bold tracking-tight'>
                                {data?.username}
                            </h2>
                            <p className='text-muted-foreground'>
                                Manage user account and administrative settings.
                            </p>
                        </div>
                        <SettingsHeaderActionsTarget />
                    </div>
                    <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 mt-4'>
                        <Tabs value={tab} onValueChange={handleTabChange}>
                            <TabsList className='flex-nowrap overflow-x-auto overflow-y-hidden w-full md:w-fit min-w-0 h-auto justify-start md:justify-center [&>button]:shrink-0 [&>button]:flex-none'>
                                {visibleTabs.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <TabsTrigger key={item.id} value={item.id}>
                                            <Icon className='w-4 h-4' />
                                            {item.label}
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                        </Tabs>
                        <div className='flex w-full overflow-y-hidden p-1'>
                            <div className='flex flex-1 flex-col'>
                                <ScrollArea className='faded-bottom h-full w-full pb-12'>
                                    <CardContent className='px-0'>
                                        <div className='flex-none mb-4'>
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
                                            className='bg-border mb-4 flex-none'
                                        />
                                        {tab === 'account' && (
                                            <UserAccountForm
                                                userId={userId}
                                                isOtherAdmin={isOtherAdmin}
                                            />
                                        )}
                                        {tab === 'permissions' && (
                                            <UserPermissionsForm
                                                id={userId}
                                                readOnly={isOtherAdmin}
                                            />
                                        )}
                                        {tab === 'activity' && (
                                            <UserActivityList
                                                username={data?.username || ''}
                                            />
                                        )}
                                        {tab === 'sessions' && (
                                            <ActiveSessions userId={userId} />
                                        )}
                                        {!isOtherAdmin && tab === 'actions' && (
                                            <UserManagementActions userId={userId} />
                                        )}
                                    </CardContent>
                                </ScrollArea>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </SettingsHeaderActionsProvider>
    );
}
