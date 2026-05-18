import {
    SettingsHeaderActionsProvider,
    SettingsHeaderActionsTarget,
} from '@/components/domain/settings-header-actions';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { queryKeys } from '@/hooks/query';
import { ClockCounterClockwiseIcon, GearIcon } from '@phosphor-icons/react';
import { $api } from '@services/openapi/client';
import { useQueryClient } from '@tanstack/react-query';
import {
    useParams,
    useRouter,
    useRouterState,
    useSearch,
} from '@tanstack/react-router';
import { Shield } from 'lucide-react';
import { useMemo } from 'react';
import NotFound from '../../../feedback/not-found';
import ActivityList from '../../activity/activity-list';
import EntityForm from './entity-form';
import EntityPermissionsForm from './entity-permissions-form';

const ENTITY_SETTINGS_ITEMS = [
    {
        id: 'settings',
        label: 'Settings',
        icon: GearIcon,
        description: 'Manage entity properties and settings',
    },
    {
        id: 'permissions',
        label: 'Permissions',
        icon: Shield,
        description: 'Manage user access permissions',
    },
    {
        id: 'activity',
        label: 'Activity',
        icon: ClockCounterClockwiseIcon,
        description: 'View entity activity and audit logs',
    },
];

const defaultEntitySettingsTabId = ENTITY_SETTINGS_ITEMS[0]?.id ?? 'settings';

export default function EntitySettingsPage() {
    const params = useParams({ strict: false });
    const entityId = (params as any).id as string;
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });
    const tab = (search as any)?.tab ?? defaultEntitySettingsTabId;
    const queryClient = useQueryClient();

    const {
        data: entityData,
        isLoading,
        isError,
    } = $api.useQuery(
        'get',
        '/entries/entities/{entity_id}/',
        { params: { path: { entity_id: Number(entityId) } } },
        {
            enabled: !!entityId,
            retry: false,
            meta: {
                showErrorToast: false,
                suppressNotification: true,
            },
        },
    );

    const dockPanelTitle = useMemo(
        () =>
            isError
                ? 'Not found'
                : entityData?.name
                  ? `Manage: ${entityData.name}`
                  : 'Manage: Entity',
        [entityData?.name, isError],
    );
    useDockPanelTab({
        title: dockPanelTitle,
        icon: isError ? 'not-found' : 'manage-entities',
    });

    const handleTabChange = (tabId: string) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), tab: tabId },
            replace: true,
        });
    };

    const currentTab =
        ENTITY_SETTINGS_ITEMS.find((item) => item.id === tab) ??
        ENTITY_SETTINGS_ITEMS.find((item) => item.id === defaultEntitySettingsTabId);
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
        return <NotFound message='The entity you are looking for does not exist.' />;
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
                            <h2 className='text-2xl font-bold tracking-tight flex items-center gap-2'>
                                {entityData?.name}
                            </h2>
                            <p className='text-muted-foreground'>
                                {currentDescription || 'Manage entity'}
                            </p>
                        </div>
                        <SettingsHeaderActionsTarget />
                    </div>
                    <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 mt-4'>
                        <Tabs value={tab} onValueChange={handleTabChange}>
                            <TabsList className='flex-nowrap overflow-x-auto overflow-y-hidden w-full md:w-fit min-w-0 h-auto justify-start md:justify-center [&>button]:shrink-0 [&>button]:flex-none'>
                                {ENTITY_SETTINGS_ITEMS.map((item) => {
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
                                {tab === 'activity' ? (
                                    <ScrollArea className='faded-bottom h-full w-full'>
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
                                            <ActivityList
                                                content_type='entry'
                                                objectId={entityId}
                                                name={entityData?.name}
                                            />
                                        </CardContent>
                                    </ScrollArea>
                                ) : (
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
                                            {tab === 'permissions' ? (
                                                <EntityPermissionsForm
                                                    entityId={Number(entityId)}
                                                />
                                            ) : (
                                                <EntityForm
                                                    id={Number(entityId)}
                                                    onAdd={() => {
                                                        queryClient.invalidateQueries({
                                                            queryKey:
                                                                queryKeys.entities.lists(),
                                                        });
                                                        queryClient.invalidateQueries({
                                                            queryKey:
                                                                queryKeys.entities.detail(
                                                                    String(entityId),
                                                                ),
                                                        });
                                                        queryClient.invalidateQueries({
                                                            queryKey:
                                                                queryKeys.notes.apiList(),
                                                        });
                                                    }}
                                                />
                                            )}
                                        </CardContent>
                                    </ScrollArea>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </SettingsHeaderActionsProvider>
    );
}
