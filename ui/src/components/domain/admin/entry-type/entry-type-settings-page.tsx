import { CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useApi from '@/hooks/api/use-api';
import { queryKeys } from '@/hooks/query';
import { ClockCounterClockwiseIcon, GearIcon } from '@phosphor-icons/react';
import { EntryClass } from '@services/cradle/models';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    useParams,
    useRouter,
    useRouterState,
    useSearch,
} from '@tanstack/react-router';
import ActivityList from '../../activity/activity-list';
import EntryTypeForm from './entry-type-form';

const ENTRY_TYPE_SETTINGS_ITEMS = [
    { id: 'settings', label: 'Settings', icon: GearIcon, description: 'Manage entry type configuration' },
    { id: 'activity', label: 'Activity', icon: ClockCounterClockwiseIcon, description: 'View entry type activity and logs' },
];

export default function EntryTypeSettingsPage() {
    const params = useParams({ strict: false });
    const subtype = (params as any).id as string;
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });
    const tab = (search as any)?.tab ?? ENTRY_TYPE_SETTINGS_ITEMS[0].id;
    const { entriesApi } = useApi();
    const queryClient = useQueryClient();

    // Query for entry type details
    const { data: entryTypeData, isLoading } = useQuery({
        queryKey: queryKeys.entryTypes.detail(subtype),
        queryFn: () => entriesApi.entryClassesRetrieve({ classSubtype: subtype }),
        enabled: !!subtype,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const handleTabChange = (tabId: string) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), tab: tabId },
            replace: true,
        });
    };

    const currentTab =
        ENTRY_TYPE_SETTINGS_ITEMS.find((item) => item.id === tab) ||
        ENTRY_TYPE_SETTINGS_ITEMS[0];
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

    return (
        <div className='w-full h-full'>
            <main
                data-layout='fixed'
                className='px-4 pt-4 pb-6 flex grow flex-col overflow-hidden @7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl'
            >
                <div className='flex flex-wrap items-end justify-between gap-2'>
                    <div className='space-y-1'>
                        <h2 className='text-2xl font-bold tracking-tight'>
                            {entryTypeData?.subtype || subtype}
                        </h2>
                        <p className='text-muted-foreground'>
                            {currentDescription || 'Manage entry type'}
                        </p>
                    </div>
                </div>
                <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 mt-4'>
                    <Tabs value={tab} onValueChange={handleTabChange}>
                        <TabsList className='flex-wrap h-auto'>
                            {ENTRY_TYPE_SETTINGS_ITEMS.map((item) => {
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
                                <div className='faded-bottom h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth'>
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
                                            content_type='entryclass'
                                            objectId={subtype}
                                            name={entryTypeData?.subtype}
                                        />
                                    </CardContent>
                                </div>
                            ) : (
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
                                        <EntryTypeForm
                                            id={subtype}
                                            onAdd={(newEntryType: EntryClass) => {
                                                queryClient.invalidateQueries({
                                                    queryKey:
                                                        queryKeys.entryTypes.lists(),
                                                });
                                                if (
                                                    newEntryType.subtype &&
                                                    newEntryType.subtype !== subtype
                                                ) {
                                                    router.navigate({
                                                        to: `/manage/entry-types/${encodeURIComponent(newEntryType.subtype)}` as any,
                                                    });
                                                }
                                            }}
                                        />
                                    </CardContent>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
