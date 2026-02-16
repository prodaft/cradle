import { CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { Archive, FileText, Layers, Network, UserPlus } from 'lucide-react';
import React from 'react';
import AdminPageLayout from '../AdminPageLayout';
import EntriesSettingsForm from './EntriesSettingsForm';
import FileSettingsForm from './FileSettingsForm';
import GraphSettingsForm from './GraphSettingsForm';
import NoteSettingsForm from './NoteSettingsForm';
import UserSettingsForm from './UserSettingsForm';

const SETTING_COMPONENTS: Record<string, React.ComponentType> = {
    note: NoteSettingsForm,
    files: FileSettingsForm,
    graph: GraphSettingsForm,
    entries: EntriesSettingsForm,
    users: UserSettingsForm,
};

const MANAGEMENT_ITEMS = [
    { id: 'note', label: 'Note', icon: FileText, description: 'Configure note-related settings and preferences' },
    { id: 'files', label: 'File', icon: Archive, description: 'Manage file upload and storage settings' },
    { id: 'graph', label: 'Graph', icon: Network, description: 'Customize graph visualization and behavior' },
    { id: 'entries', label: 'Entry', icon: Layers, description: 'Configure entry types and properties' },
    { id: 'users', label: 'New User', icon: UserPlus, description: 'Manage user creation and permissions' },
];

export default function ManagementPage() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/manage/_manage-auth/settings' });

    const tab = (search as any)?.tab ?? MANAGEMENT_ITEMS[0].id;

    const handleTabChange = (tabId: string) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), tab: tabId },
            replace: true,
        });
    };

    const SettingComponent = tab ? SETTING_COMPONENTS[tab] : null;
    const currentTab =
        MANAGEMENT_ITEMS.find((item) => item.id === tab) || MANAGEMENT_ITEMS[0];
    const currentDescription = currentTab?.description ?? '';

    return (
        <AdminPageLayout>
            <main
                data-layout='fixed'
                className='px-4 pt-4 pb-6 flex grow flex-col overflow-hidden @7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl'
            >
                <div className='flex flex-wrap items-end justify-between gap-2'>
                    <div className='space-y-1'>
                        <h2 className='text-2xl font-bold tracking-tight'>Settings</h2>
                        <p className='text-muted-foreground'>
                            Manage system settings and configurations.
                        </p>
                    </div>
                </div>
                <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 mt-4'>
                    <Tabs value={tab} onValueChange={handleTabChange}>
                        <TabsList className='flex-wrap h-auto'>
                            {MANAGEMENT_ITEMS.map((item) => {
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
                                    {SettingComponent ? (
                                        <SettingComponent />
                                    ) : (
                                        <div className='flex items-center justify-center py-12'>
                                            <div className='text-center'>
                                                <p className='text-muted-foreground'>
                                                    Select a setting to configure
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </AdminPageLayout>
    );
}
