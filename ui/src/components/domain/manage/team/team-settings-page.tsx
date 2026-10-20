import {
    SettingsHeaderActionsProvider,
    SettingsHeaderActionsTarget,
} from '@/components/base/settings-header-actions/settings-header-actions';
import ActivityList from '@/components/domain/activity/activity-list';
import NotFound from '@/components/feedback/not-found';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import {
    ClockCounterClockwiseIcon,
    GearIcon,
    ShieldIcon,
    UsersThreeIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useQuery } from '@tanstack/react-query';
import {
    useParams,
    useRouter,
    useRouterState,
    useSearch,
} from '@tanstack/react-router';
import { useMemo } from 'react';
import TeamAccessForm from './team-access-form';
import TeamForm from './team-form';
import TeamMembersForm from './team-members-form';

const TEAM_SETTINGS_ITEMS = [
    {
        id: 'settings',
        label: 'Settings',
        icon: GearIcon,
        description: 'Team name and description',
        adminOnly: false,
    },
    {
        id: 'members',
        label: 'Members',
        icon: UsersThreeIcon,
        description: 'Leads and members of this team',
        adminOnly: false,
    },
    {
        id: 'access',
        label: 'Access',
        icon: ShieldIcon,
        description: 'Entities this team can access',
        adminOnly: false,
    },
    {
        id: 'activity',
        label: 'Activity',
        icon: ClockCounterClockwiseIcon,
        description: 'Changes to this team',
        adminOnly: true,
    },
];

export default function TeamSettingsPage() {
    const params = useParams({ strict: false });
    const teamId = (params as any).id as string;
    const router = useRouter();
    const location = useRouterState({ select: (state) => state.location });
    const search = useSearch({ strict: false });
    const { isAdmin } = useAuthState();

    const items = TEAM_SETTINGS_ITEMS.filter((item) => isAdmin || !item.adminOnly);
    const requestedTab = (search as any)?.tab ?? 'settings';
    const currentTab = items.find((item) => item.id === requestedTab) ?? items[0];

    const {
        data: team,
        isLoading,
        isError,
    } = useQuery({
        queryKey: queryKeys.teams.detail(teamId),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/teams/{team_id}/',
                {
                    params: { path: { team_id: teamId } },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        enabled: !!teamId,
        retry: false,
        meta: { showErrorToast: false, suppressNotification: true },
    });

    const dockPanelTitle = useMemo(
        () => (isError ? 'Not found' : team?.name ? `Manage: ${team.name}` : 'Manage'),
        [team?.name, isError],
    );
    useDockPanelTab({
        title: dockPanelTitle,
        icon: isError ? 'not-found' : 'manage-teams',
    });

    const changeTab = (tabId: string) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), tab: tabId },
            replace: true,
        });
    };

    if (isLoading) {
        return (
            <div className='flex h-full w-full items-center justify-center'>
                <Spinner className='size-8' />
            </div>
        );
    }

    if (isError || !team?.id) {
        return <NotFound message='The team you are looking for does not exist.' />;
    }

    const teamWithId = { ...team, id: team.id };

    return (
        <SettingsHeaderActionsProvider>
            <div className='w-full h-full'>
                <main
                    data-layout='fixed'
                    className='px-4 pt-4 pb-6 flex grow flex-col overflow-hidden @7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl'
                >
                    <div className='flex flex-wrap items-end justify-between gap-2'>
                        <div className='space-y-1'>
                            <h2 className='text-2xl font-bold tracking-tight flex items-center gap-2'>
                                {team.name}
                                {team.my_role && (
                                    <Badge
                                        variant={
                                            team.my_role === 'lead'
                                                ? 'default'
                                                : 'secondary'
                                        }
                                    >
                                        {team.my_role === 'lead'
                                            ? 'You lead'
                                            : 'Member'}
                                    </Badge>
                                )}
                            </h2>
                            <p className='text-muted-foreground'>
                                {team.description || currentTab?.description}
                            </p>
                        </div>
                        <SettingsHeaderActionsTarget />
                    </div>
                    <div className='flex flex-1 flex-col space-y-2 overflow-hidden mt-4'>
                        <Tabs value={currentTab?.id} onValueChange={changeTab}>
                            <TabsList className='flex-nowrap overflow-x-auto overflow-y-hidden w-full md:w-fit min-w-0 h-auto justify-start md:justify-center [&>button]:shrink-0 [&>button]:flex-none'>
                                {items.map((item) => {
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
                                                {currentTab?.label}
                                            </h3>
                                            <p className='text-sm text-muted-foreground'>
                                                {currentTab?.description}
                                            </p>
                                        </div>
                                        <Separator className='bg-border mb-4 flex-none' />
                                        {currentTab?.id === 'members' ? (
                                            <TeamMembersForm team={teamWithId} />
                                        ) : currentTab?.id === 'access' ? (
                                            <TeamAccessForm team={teamWithId} />
                                        ) : currentTab?.id === 'activity' ? (
                                            <ActivityList
                                                contentType='team'
                                                objectId={teamId}
                                            />
                                        ) : (
                                            <TeamForm team={teamWithId} />
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
