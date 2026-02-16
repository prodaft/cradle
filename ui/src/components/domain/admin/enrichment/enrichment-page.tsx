import { Input } from '@/components/ui/input';
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
import useApi from '@/hooks/api/use-api';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { EnrichmentSubclass } from '@services/cradle/models';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useState } from 'react';
import EnrichmentSettingsForm from './enrichment-settings-form';

export default function EnrichmentPage() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({
        from: '/_authenticated/manage/_manage-auth/enrichment',
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debouncedSetSearch = useDebouncedCallback(
        (value: string) => setDebouncedSearch(value),
        300,
    );
    const { intelioApi } = useApi();

    const { data: enrichmentTypesData = [], isPending } = useQuery({
        queryKey: ['enrichmentTypes', debouncedSearch],
        queryFn: () =>
            intelioApi.enrichmentSubclassesList({
                search: debouncedSearch || undefined,
            }),
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const enrichmentTypes = enrichmentTypesData as EnrichmentSubclass[];
    const tab: string | undefined =
        (search as any)?.tab ??
        (enrichmentTypes.length > 0 ? enrichmentTypes[0].className : undefined);

    const handleEnrichmentClick = (enrichment: EnrichmentSubclass) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), tab: enrichment.className },
            replace: true,
        });
    };

    const selectedEnrichment = tab
        ? enrichmentTypes.find((e) => e.className === tab)
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
                        <div className='relative'>
                            <Search className='absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                type='text'
                                placeholder='Search enrichment types...'
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    debouncedSetSearch(e.target.value);
                                }}
                                className='pl-8'
                            />
                        </div>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarMenu>
                                {isPending ? (
                                    <div className='px-4 py-2 text-sm text-muted-foreground flex items-center gap-2'>
                                        <Spinner className='size-4' /> Loading...
                                    </div>
                                ) : enrichmentTypes.length === 0 ? (
                                    <div className='px-4 py-2 text-sm text-muted-foreground'>
                                        {searchQuery
                                            ? 'No enrichment types match your search'
                                            : 'No enrichment types found'}
                                    </div>
                                ) : (
                                    enrichmentTypes.map((enrichment) => (
                                        <SidebarMenuItem key={enrichment.className}>
                                            <SidebarMenuButton
                                                isActive={tab === enrichment.className}
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
