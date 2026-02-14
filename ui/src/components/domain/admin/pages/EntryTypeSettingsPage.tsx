import { CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { useEffect } from 'react';
import ActivityList from '../../activity/ActivityList';
import AdminPageLayout from '../AdminPageLayout';
import EntryTypeForm from '../forms/EntryTypeForm';

const ENTRY_TYPE_SETTINGS_ITEMS = [
    { id: 'settings', label: 'Settings', icon: GearIcon },
    { id: 'activity', label: 'Activity', icon: ClockCounterClockwiseIcon },
];

export default function EntryTypeSettingsPage() {
    const params = useParams({ strict: false });
    const subtype = (params as any).id as string;
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });
    const tab = (search as any)?.tab;
    const { entriesApi } = useApi();
    const queryClient = useQueryClient();

    // Query for entry type details
    const { data: entryTypeData } = useQuery({
        queryKey: queryKeys.entryTypes.detail(subtype),
        queryFn: () => entriesApi.entryClassesRetrieve({ classSubtype: subtype }),
        enabled: !!subtype,
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
        if (!tab && ENTRY_TYPE_SETTINGS_ITEMS.length > 0) {
            const newSearch: any = { ...search, tab: ENTRY_TYPE_SETTINGS_ITEMS[0].id };
            router.navigate({
                to: location.pathname as any,
                search: newSearch,
                replace: true,
            });
        }
    }, [tab, router, location.pathname, search]);

    const selectedItem = ENTRY_TYPE_SETTINGS_ITEMS.find((item) => item.id === tab);
    const currentTab = selectedItem || ENTRY_TYPE_SETTINGS_ITEMS[0];

    const tabDescriptions: Record<string, string> = {
        settings: 'Manage entry type configuration',
        activity: 'View entry type activity and logs',
    };
    const currentDescription =
        tab && tab in tabDescriptions ? tabDescriptions[tab] : '';

    return (
        <AdminPageLayout>
            <main
                data-layout='fixed'
                className='px-4 pt-4 pb-6 flex grow flex-col overflow-hidden @7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl'
            >
                <div className='flex flex-wrap items-end justify-between gap-2'>
                    <div className='space-y-1'>
                        <h2 className='text-2xl font-bold tracking-tight'>
                            {entryTypeData?.subtype || subtype || 'Entry Type'}
                        </h2>
                        <p className='text-muted-foreground'>
                            {currentDescription || 'Manage entry type'}
                        </p>
                    </div>
                </div>
                <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 mt-4'>
                    <Tabs
                        value={tab || ENTRY_TYPE_SETTINGS_ITEMS[0].id}
                        onValueChange={handleTabClick}
                    >
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
        </AdminPageLayout>
    );
}
