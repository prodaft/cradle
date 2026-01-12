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
import useApi from '@/hooks/api/useApi';
import { EnrichmentSubclass } from '@services/cradle/models';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdminPageLayout from '../AdminPageLayout';
import EnrichmentSettingsForm from '../forms/EnrichmentSettingsForm';

export default function EnrichmentPage() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/manage/enrichment' });
    const [searchQuery, setSearchQuery] = useState('');
    const { intelioApi } = useApi();

    const tab = (search as any)?.tab as string | undefined;

    // Query for enrichment types
    const { data: enrichmentTypesData = [], isPending } = useQuery({
        queryKey: ['enrichmentTypes'],
        queryFn: () => intelioApi.enrichmentSubclassesList(),
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const enrichmentTypes = enrichmentTypesData as EnrichmentSubclass[];

    const handleEnrichmentClick = (enrichment: EnrichmentSubclass) => {
        const newSearch: any = {
            ...search,
            tab: enrichment.className,
        };
        router.navigate({
            to: location.pathname as any,
            search: newSearch,
            replace: true,
        });
    };

    // Auto-select first enrichment if no tab and enrichments are loaded
    useEffect(() => {
        if (!tab && enrichmentTypes.length > 0 && !isPending) {
            const newSearch: any = {
                ...search,
                tab: enrichmentTypes[0].className,
            };
            router.navigate({
                to: location.pathname as any,
                search: newSearch,
                replace: true,
            });
        }
    }, [tab, enrichmentTypes, isPending, router, location.pathname, search]);

    const selectedEnrichment = tab
        ? enrichmentTypes.find((e) => e.className === tab)
        : null;

    const filteredEnrichmentTypes = useMemo(() => {
        if (!searchQuery.trim()) {
            return enrichmentTypes;
        }
        const query = searchQuery.toLowerCase();
        return enrichmentTypes.filter(
            (enrichment) =>
                enrichment.name?.toLowerCase().includes(query) ||
                enrichment.className?.toLowerCase().includes(query),
        );
    }, [enrichmentTypes, searchQuery]);

    return (
        <AdminPageLayout>
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
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className='pl-8'
                            />
                        </div>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarMenu>
                                {isPending ? (
                                    <div className='px-4 py-2 text-sm text-muted-foreground'>
                                        Loading...
                                    </div>
                                ) : filteredEnrichmentTypes.length === 0 ? (
                                    <div className='px-4 py-2 text-sm text-muted-foreground'>
                                        {searchQuery
                                            ? 'No enrichment types match your search'
                                            : 'No enrichment types found'}
                                    </div>
                                ) : (
                                    filteredEnrichmentTypes.map((enrichment) => (
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
        </AdminPageLayout>
    );
}
