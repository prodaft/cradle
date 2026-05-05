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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { startCase } from 'lodash';
import { useState } from 'react';
import TypeMappingsEditor from './type-mappings-editor';
export default function TypeMappingsList() {
    useDockPanelTab({
        title: 'Manage: Type mappings',
        icon: 'manage-type-mappings',
    });
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({
        from: '/_authenticated/manage/_manage-auth/type-mappings',
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const queryClient = useQueryClient();

    const { data: mappingTypesData, isPending } = useQuery({
        queryKey: ['typeMappings', debouncedSearch],
        queryFn: async () => {
            const query = {
                ...(debouncedSearch ? { search: debouncedSearch } : {}),
            };
            const { data, error, response } = await fetchClient.GET(
                '/intelio/mappings/',
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

    const mappingTypes = (mappingTypesData ?? []) as Array<{
        class_name: string;
        name: string;
    }>;

    const tab: string | undefined =
        (search as any)?.tab ??
        (mappingTypes.length > 0 ? mappingTypes[0]?.class_name : undefined);

    const handleMappingClick = (mapping: { class_name: string; name: string }) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), tab: mapping.class_name },
            replace: true,
        });
    };

    const selectedMapping = tab ? mappingTypes.find((m) => m.class_name === tab) : null;

    return (
        <div className='w-full h-full'>
            <div className='flex w-full h-full'>
                {/* Type Mappings Sidebar */}
                <Sidebar
                    collapsible='none'
                    className='border-r bg-background text-foreground [&_[data-slot=sidebar-inner]]:bg-background [&_[data-slot=sidebar-inner]]:text-foreground'
                >
                    <SidebarHeader className='flex flex-col p-4 gap-2 border-b border-border'>
                        <ActionBarSearch
                            placeholder='Search mappings...'
                            name='type-mappings-sidebar-search'
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
                                ) : mappingTypes.length === 0 ? (
                                    <div className='p-2'>
                                        <Empty className='border-0 p-3'>
                                            <EmptyHeader className='max-w-none gap-0'>
                                                <EmptyDescription>
                                                    {searchQuery
                                                        ? 'No mappings match your search'
                                                        : 'No type mappings found'}
                                                </EmptyDescription>
                                            </EmptyHeader>
                                        </Empty>
                                    </div>
                                ) : (
                                    mappingTypes.map((mapping) => (
                                        <SidebarMenuItem key={mapping.class_name}>
                                            <SidebarMenuButton
                                                isActive={tab === mapping.class_name}
                                                onClick={() =>
                                                    handleMappingClick(mapping)
                                                }
                                                tooltip={startCase(mapping.name)}
                                            >
                                                <span>{startCase(mapping.name)}</span>
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
                    {selectedMapping ? (
                        <TypeMappingsEditor
                            id={tab!}
                            name={selectedMapping.name || tab!}
                            onSave={() => {
                                queryClient.invalidateQueries({
                                    queryKey: ['typeMappings'],
                                });
                            }}
                        />
                    ) : (
                        <div className='flex-1 flex items-center justify-center'>
                            <div className='text-center'>
                                <p className='text-muted-foreground'>
                                    Select a type mapping to edit
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
