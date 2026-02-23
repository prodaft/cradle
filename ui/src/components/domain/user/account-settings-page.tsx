import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClockCounterClockwiseIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { Link, Lock, Palette } from 'lucide-react';
import AccountAppearanceForm from './account-appearance-form';
import AccountEditorForm from './account-editor-form';
import AccountOAuthList from './account-oauth-list';
import AccountSecurityActions from './account-security-actions';
import ActiveSessions from './active-sessions';

const ACCOUNT_SETTINGS_ITEMS = [
    {
        id: 'security',
        label: 'Security',
        icon: Lock,
        description: 'Authentication, API keys, and account security',
    },
    {
        id: 'sessions',
        label: 'Sessions',
        icon: ClockCounterClockwiseIcon,
        description: 'Manage your active sessions across devices',
    },
    {
        id: 'oauth',
        label: 'OAuth',
        icon: Link,
        description: 'Link or unlink external identity providers',
    },
    {
        id: 'appearance',
        label: 'Appearance',
        icon: Palette,
        description: 'Customize your visual appearance and theme',
    },
    {
        id: 'editor',
        label: 'Editor',
        icon: PencilSimpleIcon,
        description: 'Configure editor behavior, templates, and snippets',
    },
];

interface AccountSettingsProps {
    target?: string;
}

export default function AccountSettingsPage({ target = 'me' }: AccountSettingsProps) {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/settings' });

    const tab = (search as any)?.tab ?? ACCOUNT_SETTINGS_ITEMS[0].id;

    const handleTabChange = (tabId: string) => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), tab: tabId },
            replace: true,
        });
    };

    const currentTab =
        ACCOUNT_SETTINGS_ITEMS.find((item) => item.id === tab) ||
        ACCOUNT_SETTINGS_ITEMS[0];

    return (
        <main
            data-layout='fixed'
            className='px-4 pt-4 pb-6 flex grow flex-col overflow-hidden @7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl'
        >
            <div className='flex flex-wrap items-end justify-between gap-2'>
                <div className='space-y-1'>
                    <h2 className='text-2xl font-bold tracking-tight'>Settings</h2>
                    <p className='text-muted-foreground'>
                        Manage your account settings and set e-mail preferences.
                    </p>
                </div>
            </div>
            <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 mt-4'>
                <Tabs value={tab} onValueChange={handleTabChange}>
                    <TabsList className='flex-wrap h-auto'>
                        {ACCOUNT_SETTINGS_ITEMS.map((item) => {
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
                            <div data-slot='card-content' className='px-0'>
                                <div className='flex-none mb-4'>
                                    <h3 className='text-lg font-medium'>
                                        {currentTab?.label || 'Settings'}
                                    </h3>
                                    <p className='text-sm text-muted-foreground'>
                                        {currentTab?.description ?? ''}
                                    </p>
                                </div>
                                <Separator
                                    data-orientation='horizontal'
                                    role='none'
                                    className='bg-border mb-4 flex-none'
                                />
                                {tab === 'security' && (
                                    <AccountSecurityActions target={target} />
                                )}
                                {tab === 'sessions' && (
                                    <ActiveSessions userId={target} />
                                )}
                                {tab === 'oauth' && (
                                    <AccountOAuthList target={target} />
                                )}
                                {tab === 'appearance' && (
                                    <AccountAppearanceForm target={target} />
                                )}
                                {tab === 'editor' && (
                                    <AccountEditorForm target={target} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
