import { CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useApi from '@/hooks/api/use-api';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import {
    ClockCounterClockwiseIcon,
    GearSixIcon,
    LockKeyIcon,
    PasswordIcon,
    UserIcon,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import {
    useParams,
    useRouter,
    useRouterState,
    useSearch,
} from '@tanstack/react-router';
import { useMemo } from 'react';
import NotFound from '../../../feedback/not-found';
import AdminUserSettings from './user-settings-tabs';

const USER_SETTINGS_ITEMS = [
    {
        id: 'account',
        label: 'Account',
        icon: UserIcon,
        description: 'Manage user account information and basic settings',
    },
    {
        id: 'administrative',
        label: 'Administrative',
        icon: GearSixIcon,
        description: 'Configure user permissions and administrative settings',
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
    {
        id: 'management',
        label: 'Management',
        icon: GearSixIcon,
        description: 'Administrative actions for user management',
    },
];

export default function UserSettingsPage() {
    const params = useParams({ strict: false });
    const userId = (params as any).id as string;
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });
    const tab = (search as any)?.tab ?? USER_SETTINGS_ITEMS[0].id;
    const { usersApi } = useApi();
    const { userId: currentUserId } = useAuthState();

    const {
        data: userData,
        isLoading,
        isError,
    } = useQuery({
        queryKey: queryKeys.users.detail(userId),
        queryFn: () => usersApi.usersRetrieve({ userId }),
        enabled: !!userId,
        retry: false,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const isOtherAdmin = userData?.role === 'admin' && userData?.id !== currentUserId;

    const visibleTabs = useMemo(
        () =>
            isOtherAdmin
                ? USER_SETTINGS_ITEMS.filter((item) => item.id !== 'management')
                : USER_SETTINGS_ITEMS,
        [isOtherAdmin],
    );

    const handleTabChange = (tabId: string) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), tab: tabId },
            replace: true,
        });
    };

    const currentTab = visibleTabs.find((item) => item.id === tab) || visibleTabs[0];
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
        <div className='w-full h-full'>
            <main
                data-layout='fixed'
                className='px-4 pt-4 pb-6 flex grow flex-col overflow-hidden @7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl'
            >
                <div className='flex flex-wrap items-end justify-between gap-2'>
                    <div className='space-y-1'>
                        <h2 className='text-2xl font-bold tracking-tight'>
                            {userData?.username}
                        </h2>
                        <p className='text-muted-foreground'>
                            Manage user account and administrative settings.
                        </p>
                    </div>
                </div>
                <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 mt-4'>
                    <Tabs value={tab} onValueChange={handleTabChange}>
                        <TabsList className='flex-wrap h-auto'>
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
                            <div className='faded-bottom h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth pb-12'>
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
                                    <AdminUserSettings
                                        userId={userId}
                                        activeTab={tab}
                                    />
                                </CardContent>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
