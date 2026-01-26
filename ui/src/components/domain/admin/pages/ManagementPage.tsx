import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { Archive, FileText, Layers, Network, UserPlus } from 'lucide-react';
import React, { useEffect } from 'react';
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

    const tab = (search as any)?.tab;

    const handleSettingClick = (settingId: string) => {
        const newSearch: any = { ...search, tab: settingId };
        router.navigate({
            to: location.pathname as any,
            search: newSearch,
            replace: true,
        });
    };

    // Auto-select first setting if no tab
    useEffect(() => {
        if (!tab && MANAGEMENT_ITEMS.length > 0) {
            const newSearch: any = { ...search, tab: MANAGEMENT_ITEMS[0].id };
            router.navigate({
                to: location.pathname as any,
                search: newSearch,
                replace: true,
            });
        }
    }, [tab, router, location.pathname, search]);

    const SettingComponent = tab ? SETTING_COMPONENTS[tab] : null;
    const selectedItem = MANAGEMENT_ITEMS.find((item) => item.id === tab);

    const currentTab = selectedItem || MANAGEMENT_ITEMS[0];
    const tabDescriptions: Record<string, string> = {
        note: 'Configure note-related settings and preferences',
        files: 'Manage file upload and storage settings',
        graph: 'Customize graph visualization and behavior',
        entries: 'Configure entry types and properties',
        users: 'Manage user creation and permissions',
    };
    const currentDescription =
        tab && tab in tabDescriptions ? tabDescriptions[tab] : '';

    return (
        <AdminPageLayout>
            <main
                data-layout='fixed'
                className='px-4 py-6 flex grow flex-col overflow-hidden @7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl'
            >
                <div className='space-y-0.5'>
                    <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
                        Settings
                    </h1>
                    <p className='text-muted-foreground'>
                        Manage system settings and configurations.
                    </p>
                </div>
                <Separator
                    data-orientation='horizontal'
                    role='none'
                    className='shrink-0 my-4 lg:my-6'
                />
                <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12'>
                    <aside className='top-0 lg:sticky lg:w-1/5'>
                        {/* Mobile dropdown */}
                        <div className='p-1 md:hidden'>
                            <Select
                                value={tab || MANAGEMENT_ITEMS[0].id}
                                onValueChange={handleSettingClick}
                            >
                                <SelectTrigger className='h-12 sm:w-48'>
                                    <SelectValue>
                                        <div className='flex gap-x-4 px-2 py-1 items-center'>
                                            <span className='scale-125 flex items-center'>
                                                {currentTab && (
                                                    <currentTab.icon className='w-[18px] h-[18px]' />
                                                )}
                                            </span>
                                            <span className='text-md'>
                                                {currentTab?.label}
                                            </span>
                                        </div>
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {MANAGEMENT_ITEMS.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <SelectItem key={item.id} value={item.id}>
                                                <div className='flex gap-x-2 items-center'>
                                                    <Icon className='w-[18px] h-[18px]' />
                                                    <span>{item.label}</span>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Desktop navigation */}
                        <div className='relative hidden w-full min-w-40 bg-background px-1 py-2 md:block'>
                            <nav className='flex space-x-2 py-1 lg:flex-col lg:space-y-1 lg:space-x-0'>
                                {MANAGEMENT_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = tab === item.id;
                                    return (
                                        <a
                                            key={item.id}
                                            href='#'
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleSettingClick(item.id);
                                            }}
                                            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:text-accent-foreground dark:hover:bg-accent/50 h-9 px-4 py-2 has-[>svg]:px-3 hover:bg-accent justify-start ${
                                                isActive
                                                    ? 'bg-muted hover:bg-accent active'
                                                    : ''
                                            }`}
                                            data-status={
                                                isActive ? 'active' : undefined
                                            }
                                            aria-current={isActive ? 'page' : undefined}
                                        >
                                            <span className='me-2'>
                                                <Icon className='w-[18px] h-[18px]' />
                                            </span>
                                            {item.label}
                                        </a>
                                    );
                                })}
                            </nav>
                        </div>
                    </aside>
                    <div className='flex w-full overflow-y-hidden p-1'>
                        <div className='flex flex-1 flex-col'>
                            <div className='flex-none'>
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
                                className='bg-border my-4 flex-none'
                            />
                            <div className='faded-bottom h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth pe-4 pb-12'>
                                <div className='-mx-1 px-1.5'>
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
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </AdminPageLayout>
    );
}
