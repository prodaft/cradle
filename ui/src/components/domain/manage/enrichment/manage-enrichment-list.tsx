import { SearchInput } from '@/components/base/search-input/search-input';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import {
    EMPTY_SEARCH_STATE,
    FREE_TEXT_SCHEMA,
    type SearchState,
} from '@/lib/search-query/search-schema';
import { fetchClient } from '@services/openapi/client';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import EnrichmentSettingsForm from './enrichment-settings-form';

type EnricherItem = { class_name: string; name: string };

export default function ManageEnrichmentList() {
    useDockPanelTab({ title: 'Manage: Enrichment', icon: 'manage-enrichment' });
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({
        from: '/_authenticated/manage/_manage-auth/enrichment',
    }) as Record<string, unknown>;
    const [searchState, setSearchState] = useState<SearchState>(EMPTY_SEARCH_STATE);
    const applied = searchState.q ?? '';

    const { data: enrichers = [], isPending } = useQuery({
        queryKey: ['enrichmentTypes', applied],
        queryFn: async () => {
            const listQuery = {
                ...(applied ? { search: applied } : {}),
            };
            const { data, error, response } = await fetchClient.GET(
                '/intelio/enrichment/',
                {
                    params: { query: listQuery },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const tab: string | undefined =
        (search.tab as string | undefined) ??
        (enrichers.length > 0 ? enrichers[0]?.class_name : undefined);

    const selectEnricher = (item: EnricherItem) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...search, tab: item.class_name } as any,
            replace: true,
        });
    };

    const activeEnricher = tab ? enrichers.find((e) => e.class_name === tab) : null;

    return (
        <div className='w-full h-full'>
            <div className='flex w-full h-full'>
                <Sidebar
                    collapsible='none'
                    className='border-r bg-background text-foreground [&_[data-slot=sidebar-inner]]:bg-background [&_[data-slot=sidebar-inner]]:text-foreground'
                >
                    <SidebarHeader className='flex flex-col p-4 gap-2 border-b border-border'>
                        <SearchInput
                            schema={FREE_TEXT_SCHEMA}
                            value={searchState}
                            onApply={setSearchState}
                            placeholder='Search enrichment types...'
                            className='w-full min-w-0'
                        />
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarMenu>
                                {isPending ? (
                                    <div className='px-4 py-2 text-sm text-muted-foreground flex items-center gap-2'>
                                        <Spinner className='size-4' /> Loading...
                                    </div>
                                ) : enrichers.length === 0 ? (
                                    <div className='p-2'>
                                        <Empty className='border-0 p-3'>
                                            <EmptyHeader className='max-w-none gap-0'>
                                                <EmptyDescription>
                                                    {applied
                                                        ? 'No enrichment types match your search'
                                                        : 'No enrichment types found'}
                                                </EmptyDescription>
                                            </EmptyHeader>
                                        </Empty>
                                    </div>
                                ) : (
                                    enrichers.map((item) => (
                                        <SidebarMenuItem key={item.class_name}>
                                            <SidebarMenuButton
                                                isActive={tab === item.class_name}
                                                onClick={() => selectEnricher(item)}
                                                tooltip={item.name}
                                            >
                                                <span>{item.name}</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))
                                )}
                            </SidebarMenu>
                        </SidebarGroup>
                    </SidebarContent>
                </Sidebar>

                <div className='flex-1 flex flex-col'>
                    {activeEnricher ? (
                        <EnrichmentSettingsForm enrichment_class={tab!} />
                    ) : (
                        <div className='flex-1 flex items-center justify-center'>
                            <div className='text-center'>
                                <p className='text-muted-foreground'>
                                    Select an enrichment type to configure
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
