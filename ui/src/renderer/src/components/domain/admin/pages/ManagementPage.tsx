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
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { Archive, FileText, Layers, Network, Search, UserPlus } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import AdminPageLayout from '../AdminPageLayout';
import EntriesSettingsForm from '../forms/EntriesSettingsForm';
import FileSettingsForm from '../forms/FileSettingsForm';
import GraphSettingsForm from '../forms/GraphSettingsForm';
import NoteSettingsForm from '../forms/NoteSettingsForm';
import UserSettingsForm from '../forms/UserSettingsForm';

const SETTING_COMPONENTS: Record<string, React.ComponentType> = {
    note: NoteSettingsForm,
    files: FileSettingsForm,
    graph: GraphSettingsForm,
    entries: EntriesSettingsForm,
    users: UserSettingsForm,
};

const MANAGEMENT_ITEMS = [
    { id: 'note', label: 'Note', icon: FileText },
    { id: 'files', label: 'File', icon: Archive },
    { id: 'graph', label: 'Graph', icon: Network },
    { id: 'entries', label: 'Entry', icon: Layers },
    { id: 'users', label: 'New User', icon: UserPlus },
];

export default function ManagementPage() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/manage/settings' });
    const [searchQuery, setSearchQuery] = useState('');

    const tab = search.tab;

    const handleSettingClick = (settingId: string) => {
        router.navigate({
            to: location.pathname as any,
            search: (prev: any) => ({ ...prev, tab: settingId }),
            replace: true,
        });
    };

    // Auto-select first setting if no tab
    useEffect(() => {
        if (!tab && MANAGEMENT_ITEMS.length > 0) {
            router.navigate({
                to: location.pathname as any,
                search: (prev: any) => ({ ...prev, tab: MANAGEMENT_ITEMS[0].id }),
                replace: true,
            });
        }
    }, [tab, router, location.pathname]);

    const SettingComponent = tab ? SETTING_COMPONENTS[tab] : null;
    const selectedItem = MANAGEMENT_ITEMS.find((item) => item.id === tab);

    const filteredManagementItems = useMemo(() => {
        if (!searchQuery.trim()) {
            return MANAGEMENT_ITEMS;
        }
        const query = searchQuery.toLowerCase();
        return MANAGEMENT_ITEMS.filter(
            (item) =>
                item.label.toLowerCase().includes(query) ||
                item.id.toLowerCase().includes(query),
        );
    }, [searchQuery]);

    return (
        <AdminPageLayout>
            <div className='flex w-full h-full'>
                {/* Management Sidebar */}
                <Sidebar
                    collapsible='none'
                    className='border-r bg-background text-foreground [&_[data-slot=sidebar-inner]]:bg-background [&_[data-slot=sidebar-inner]]:text-foreground'
                >
                    <SidebarHeader className='flex flex-col p-4 gap-2 border-b border-border'>
                        <div className='relative'>
                            <Search className='absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                type='text'
                                placeholder='Search settings...'
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className='pl-8'
                            />
                        </div>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarMenu>
                                {filteredManagementItems.length === 0 ? (
                                    <div className='px-4 py-2 text-sm text-muted-foreground'>
                                        {searchQuery
                                            ? 'No settings match your search'
                                            : 'No settings found'}
                                    </div>
                                ) : (
                                    filteredManagementItems.map((item) => {
                                        const IconComponent = item.icon;
                                        return (
                                            <SidebarMenuItem key={item.id}>
                                                <SidebarMenuButton
                                                    isActive={tab === item.id}
                                                    onClick={() =>
                                                        handleSettingClick(item.id)
                                                    }
                                                    tooltip={item.label}
                                                >
                                                    <IconComponent />
                                                    <span>{item.label}</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })
                                )}
                            </SidebarMenu>
                        </SidebarGroup>
                    </SidebarContent>
                </Sidebar>

                {/* Main Content Area */}
                <div className='flex-1 flex flex-col'>
                    {SettingComponent ? (
                        <SettingComponent />
                    ) : (
                        <div className='flex-1 flex items-center justify-center'>
                            <div className='text-center'>
                                <p className='text-muted-foreground'>
                                    Select a setting to configure
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminPageLayout>
    );
}
