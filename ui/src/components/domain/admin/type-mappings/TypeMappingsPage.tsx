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
import { MappingSubclass } from '@services/cradle/models';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { startCase } from 'lodash';
import { Search } from 'lucide-react';
import { useState } from 'react';
import AdminPageLayout from '../AdminPageLayout';
import TypeMappingsEditor from './TypeMappingsEditor';

export default function TypeMappingsPage() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({
        from: '/_authenticated/manage/_manage-auth/type-mappings',
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debouncedSetSearch = useDebouncedCallback(
        (value: string) => setDebouncedSearch(value),
        300,
    );
    const { intelioApi } = useApi();
    const queryClient = useQueryClient();

    // Query for mapping types
    const { data: mappingTypesData = [], isPending } = useQuery({
        queryKey: ['typeMappings', debouncedSearch],
        queryFn: () =>
            intelioApi.mappingsSubclassesList({
                search: debouncedSearch || undefined,
            }),
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const mappingTypes = mappingTypesData as MappingSubclass[];

    const tab: string | undefined =
        (search as any)?.tab ??
        (mappingTypes.length > 0 ? mappingTypes[0].className : undefined);

    const handleMappingClick = (mapping: MappingSubclass) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), tab: mapping.className },
            replace: true,
        });
    };

    const selectedMapping = tab ? mappingTypes.find((m) => m.className === tab) : null;

    return (
        <AdminPageLayout>
            <div className='flex w-full h-full'>
                {/* Type Mappings Sidebar */}
                <Sidebar
                    collapsible='none'
                    className='border-r bg-background text-foreground [&_[data-slot=sidebar-inner]]:bg-background [&_[data-slot=sidebar-inner]]:text-foreground'
                >
                    <SidebarHeader className='flex flex-col p-4 gap-2 border-b border-border'>
                        <div className='relative'>
                            <Search className='absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                type='text'
                                placeholder='Search mappings...'
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
                                ) : mappingTypes.length === 0 ? (
                                    <div className='px-4 py-2 text-sm text-muted-foreground'>
                                        {searchQuery
                                            ? 'No mappings match your search'
                                            : 'No type mappings found'}
                                    </div>
                                ) : (
                                    mappingTypes.map((mapping) => (
                                        <SidebarMenuItem key={mapping.className}>
                                            <SidebarMenuButton
                                                isActive={tab === mapping.className}
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
        </AdminPageLayout>
    );
}
