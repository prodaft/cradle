import { ActionBarSearch } from '@/components/base/action-bar/action-bar';
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
import { fetchClient } from '@services/openapi/client';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import EnrichmentSettingsForm from './enrichment-settings-form';

/** Admin manage route for enricher settings (distinct from the app `EnrichmentList` index). */
export default function ManageEnrichmentList() {
    useDockPanelTab({ title: 'Manage: Enrichment', icon: 'manage-enrichment' });
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({
        from: '/_authenticated/manage/_manage-auth/enrichment',
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const { data: enrichmentTypesData, isPending } = useQuery({
        queryKey: ['enrichmentTypes', debouncedSearch],
        queryFn: async () => {
            const query = {
                ...(debouncedSearch ? { search: debouncedSearch } : {}),
            };
            const { data, error, response } = await fetchClient.GET(
                '/intelio/enrichment/',
                {
                    params: { query },
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

    const enrichmentTypes = (enrichmentTypesData ?? []) as Array<{
        class_name: string;
        name: string;
    }>;
    const tab: string | undefined =
        (search as any)?.tab ??
        (enrichmentTypes.length > 0 ? enrichmentTypes[0]?.class_name : undefined);

    const handleEnrichmentClick = (enrichment: {
        class_name: string;
        name: string;
    }) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), tab: enrichment.class_name },
            replace: true,
        });
    };

    const selectedEnrichment = tab
        ? enrichmentTypes.find((e) => e.class_name === tab)
        : null;

    return (
        <div className='w-full h-full'>
            <div className='flex w-full h-full'>
                {/* Enrichment Sidebar */}
                <Sidebar
                    collapsible='none'
                    className='border-r bg-background text-foreground [&_[data-slot=sidebar-inner]]:bg-background [&_[data-slot=sidebar-inner]]:text-foreground'
                >
                    <SidebarHeader className='flex flex-col p-4 gap-2 border-b border-border'>
                        <ActionBarSearch
                            placeholder='Search enrichment types...'
                            name='manage-enrichment-sidebar-search'
                            value={searchQuery}
                            debounceMs={300}
                            className='w-full min-w-0'
                            onValueChange={setSearchQuery}
                            onDebouncedChange={setDebouncedSearch}
                            onClear={() => setDebouncedSearch('')}
                        />
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarMenu>
                                {isPending ? (
                                    <div className='px-4 py-2 text-sm text-muted-foreground flex items-center gap-2'>
                                        <Spinner className='size-4' /> Loading...
                                    </div>
                                ) : enrichmentTypes.length === 0 ? (
                                    <div className='p-2'>
                                        <Empty className='border-0 p-3'>
                                            <EmptyHeader className='max-w-none gap-0'>
                                                <EmptyDescription>
                                                    {searchQuery
                                                        ? 'No enrichment types match your search'
                                                        : 'No enrichment types found'}
                                                </EmptyDescription>
                                            </EmptyHeader>
                                        </Empty>
                                    </div>
                                ) : (
                                    enrichmentTypes.map((enrichment) => (
                                        <SidebarMenuItem key={enrichment.class_name}>
                                            <SidebarMenuButton
                                                isActive={tab === enrichment.class_name}
                                                onClick={() =>
                                                    handleEnrichmentClick(enrichment)
                                                }
                                                tooltip={enrichment.name}
                                            >
                                                <span>{enrichment.name}</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))
                                )}
                            </SidebarMenu>
                        </SidebarGroup>
                    </SidebarContent>
                </Sidebar>

                {/* Main Content Area */}
                <div className='flex-1 flex flex-col'>
                    {selectedEnrichment ? (
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
