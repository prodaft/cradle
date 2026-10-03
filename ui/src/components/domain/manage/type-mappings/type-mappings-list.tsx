import { ActionBarSearch } from '@/components/base/action-bar-controls/action-bar-controls';
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
import { useCallback, useState } from 'react';
import TypeMappingsEditor from './type-mappings-editor';

type Item = { class_name: string; name: string };

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
    }) as Record<string, unknown>;

    const [draft, setDraft] = useState('');
    const [applied, setApplied] = useState('');
    const queryClient = useQueryClient();

    const applySearch = useCallback((value: string) => {
        setApplied(value);
    }, []);

    const { data: mappings = [], isPending } = useQuery({
        queryKey: ['typeMappings', applied],
        queryFn: async () => {
            const listQuery = {
                ...(applied ? { search: applied } : {}),
            };
            const { data, error, response } = await fetchClient.GET(
                '/intelio/mappings/',
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
        (mappings.length > 0 ? mappings[0]?.class_name : undefined);

    const selectItem = (item: Item) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...search, tab: item.class_name } as any,
            replace: true,
        });
    };

    const activeMapping = tab ? mappings.find((m) => m.class_name === tab) : null;

    return (
        <div className='w-full h-full'>
            <div className='flex w-full h-full'>
                <Sidebar
                    collapsible='none'
                    className='border-r bg-background text-foreground [&_[data-slot=sidebar-inner]]:bg-background [&_[data-slot=sidebar-inner]]:text-foreground'
                >
                    <SidebarHeader className='flex flex-col p-4 gap-2 border-b border-border'>
                        <ActionBarSearch
                            placeholder='Search mappings...'
                            name='type-mappings-sidebar-search'
                            value={draft}
                            debounceMs={300}
                            className='w-full min-w-0'
                            onValueChange={setDraft}
                            onDebouncedChange={applySearch}
                            onSubmit={applySearch}
                            onClear={() => applySearch('')}
                        />
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarMenu>
                                {isPending ? (
                                    <div className='px-4 py-2 text-sm text-muted-foreground flex items-center gap-2'>
                                        <Spinner className='size-4' /> Loading...
                                    </div>
                                ) : mappings.length === 0 ? (
                                    <div className='p-2'>
                                        <Empty className='border-0 p-3'>
                                            <EmptyHeader className='max-w-none gap-0'>
                                                <EmptyDescription>
                                                    {draft
                                                        ? 'No mappings match your search'
                                                        : 'No type mappings found'}
                                                </EmptyDescription>
                                            </EmptyHeader>
                                        </Empty>
                                    </div>
                                ) : (
                                    mappings.map((item) => (
                                        <SidebarMenuItem key={item.class_name}>
                                            <SidebarMenuButton
                                                isActive={tab === item.class_name}
                                                onClick={() => selectItem(item)}
                                                tooltip={startCase(item.name)}
                                            >
                                                <span>{startCase(item.name)}</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))
                                )}
                            </SidebarMenu>
                        </SidebarGroup>
                    </SidebarContent>
                </Sidebar>

                <div className='flex-1 flex flex-col'>
                    {activeMapping ? (
                        <TypeMappingsEditor
                            id={tab!}
                            name={activeMapping.name || tab!}
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
