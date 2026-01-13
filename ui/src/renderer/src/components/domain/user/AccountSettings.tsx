import ApiKeyGenerateModal from '@/components/modals/auth/ApiKeyGenerateModal';
import ChangePasswordModal from '@/components/modals/auth/ChangePasswordModal';
import TwoFactorSetupModal from '@/components/modals/auth/TwoFactorSetupModal';
import ConfirmDeletionModal from '@/components/modals/base/ConfirmDeletionModal';
import MarkdownEditorModal from '@/components/modals/notes/MarkdownEditorModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import useApi from '@/hooks/api/useApi';
import { useAuthActions } from '@/hooks/auth/useAuth';
import { queryKeys } from '@/hooks/query';
import { useProfile } from '@/hooks/user/useProfile';
import { UserRetrieve } from '@/services/cradle/models';
import SnippetList, { SnippetListRef } from '@components/base/SnippetList/SnippetList';
import { SettingsButton, SettingsCard } from '@components/forms';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import bytes from 'bytes';
import { EditPencil, HalfMoon, Link, SunLight } from 'iconoir-react';
import { ClockRotateRight, Lock } from 'iconoir-react/regular';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import ActiveSessions from './ActiveSessions';

interface AccountSettingsProps {
    target?: string;
}

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface OAuthMethod {
    id?: string;
    provider?: string;
    name?: string;
    label?: string;
    display_name?: string;
    auth_url?: string;
    authorization_url?: string;
    login_url?: string;
    url?: string;
}

const accountSettingsSchema = z.object({
    id: z.string().optional(),
    username: z.string().min(1, { error: 'Username is required' }),
    email: z
        .string()
        .min(1, { error: 'Email is required' })
        .refine((val) => z.email().safeParse(val).success, {
            error: 'Invalid email',
        }),
    password: z.string().optional(),
    catalystApiKey: z.string().optional(),
    role: z.string().optional(),
    emailConfirmed: z.boolean().optional(),
    isActive: z.boolean().optional(),
    vimMode: z.boolean().optional(),
    theme: z.string().optional(),
    fileUploadLimitOverride: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountSettingsSchema>;

export default function AccountSettings({ target = 'me' }: AccountSettingsProps) {
    const { usersApi, basePath } = useApi();
    const { logOut, getAccessToken } = useAuthActions();
    const { profile, setProfile, isAdmin } = useProfile();

    const saveMutation = useMutation({
        mutationFn: async ({ userId, payload }: { userId: string; payload: any }) => {
            return await usersApi.usersUpdate({
                userId,
                userUpdateRequest: payload,
            });
        },
        meta: {
            successMessage: 'Settings saved successfully',
            errorMessage: 'Failed to save settings',
        },
    });

    const deleteAccountMutation = useMutation({
        mutationFn: async (userId: string) => {
            await usersApi.usersDestroy({ userId });
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: () => {
            logOut();
        },
    });

    const fetchNoteTemplateMutation = useMutation({
        mutationFn: async (userId: string) => {
            return await usersApi.usersDefaultNoteTemplateRetrieve({ userId });
        },
        meta: {
            suppressNotification: true,
        },
    });

    const saveNoteTemplateMutation = useMutation({
        mutationFn: async ({
            userId,
            template,
        }: {
            userId: string;
            template: string;
        }) => {
            await usersApi.usersDefaultNoteTemplateCreate({
                userId,
                defaultNoteTemplateRequest: { template },
            });
        },
        meta: {
            successMessage: 'Note template saved successfully',
            errorMessage: 'Failed to save note template',
        },
    });
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/settings' });
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
    const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
    const [twoFactorDisabling, setTwoFactorDisabling] = useState(false);
    const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
    const [noteTemplateModalOpen, setNoteTemplateModalOpen] = useState(false);
    const [noteTemplateContent, setNoteTemplateContent] = useState('');

    // Get active tab from URL search params, default to 'security'
    const validTabs = ['security', 'sessions', 'oauth', 'appearance', 'editor'];
    const getActiveTab = () => {
        const tab = (search as any)?.tab;
        return validTabs.includes(tab || '') ? tab : 'security';
    };
    const [activeTab, setActiveTab] = useState(getActiveTab());

    // Update active tab when search params change and set initial tab
    useEffect(() => {
        const tab = (search as any)?.tab;
        if (!tab || !validTabs.includes(tab)) {
            // Set default tab if no valid tab is present
            if (!tab) {
                const newSearch: any = { ...search, tab: 'security' };
                router.navigate({
                    to: location.pathname as any,
                    search: newSearch,
                    replace: true,
                });
            }
            setActiveTab('security');
        } else {
            setActiveTab(tab);
        }
    }, [(search as any)?.tab, router, location.pathname, search]);
    const [user, setUser] = useState<UserRetrieve | null>(null);
    const [oauthConnections, setOauthConnections] = useState<Record<string, boolean>>(
        {},
    );
    const [oauthMethods, setOauthMethods] = useState<OAuthMethod[]>([]);
    const [oauthBusyProvider, setOauthBusyProvider] = useState<string | null>(null);
    const vimModeId = useId();
    const snippetListRef = useRef<SnippetListRef>(null);

    // Note template loading state
    const [noteTemplateLoading, setNoteTemplateLoading] = useState(false);

    const defaultValues: AccountFormData = {
        id: '',
        username: '',
        email: '',
        password: 'password',
        catalystApiKey: 'apikey',
        role: 'author',
        vimMode: false,
        emailConfirmed: false,
        isActive: false,
        fileUploadLimitOverride: '',
    };

    const {
        register,
        handleSubmit,
        reset,
        getValues,
        watch,
        setValue,
        control,
        formState: { errors, isDirty },
    } = useForm<AccountFormData>({
        resolver: zodResolver(accountSettingsSchema) as any,
        defaultValues,
    });

    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });

    const previousValuesRef = useRef<Partial<AccountFormData> | null>(null);

    // Query for user data
    const { data: userData, isPending: isPendingUser } = useQuery<UserRetrieve>({
        queryKey: queryKeys.users.detail(target),
        queryFn: () => usersApi.usersRetrieve({ userId: target }),
        enabled: !!target,
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch user data',
            suppressNotification: true,
        },
    });

    // Populate form when user data is loaded
    useEffect(() => {
        if (!userData || !target) {
            setUser(null);
            return;
        }

        setUser(userData);
        const connections =
            (userData as any).oauthConnections ||
            (userData as any).oauth_connections ||
            {};
        setOauthConnections(connections);

        const fileUploadLimitBytes = (userData as any).fileUploadLimitOverride;
        const fileUploadLimitFormatted = fileUploadLimitBytes
            ? bytes.format(fileUploadLimitBytes, { unitSeparator: ' ' })
            : '';

        const initialData = {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            password: 'password',
            theme: userData.theme || 'dark',
            catalystApiKey: userData.catalystApiKey ? 'apikey' : '',
            role: userData.role || 'author',
            emailConfirmed: userData.emailConfirmed || false,
            isActive: userData.isActive || false,
            vimMode: userData.vimMode || false,
            fileUploadLimitOverride: fileUploadLimitFormatted,
        };

        reset(initialData);
        setTwoFactorEnabled(userData.twoFactorEnabled || false);

        // Store initial values for comparison
        previousValuesRef.current = initialData;
    }, [userData, target, reset]);

    useEffect(() => {
        if (!basePath) {
            setOauthMethods([]);
            return;
        }

        let isMounted = true;

        const loadConfig = async () => {
            try {
                const response = await fetch(`${basePath}/users/config/`);
                if (!response.ok) {
                    throw new Error('Failed to load auth configuration');
                }

                const data = await response.json();
                if (!isMounted) {
                    return;
                }

                setOauthMethods(
                    Array.isArray(data?.oauth_methods) ? data.oauth_methods : [],
                );
            } catch (error) {
                if (!isMounted) {
                    return;
                }
                setOauthMethods([]);
            }
        };

        loadConfig();

        return () => {
            isMounted = false;
        };
    }, [basePath]);

    const getOAuthKey = (method: OAuthMethod) => {
        return (
            method.id ||
            method.provider ||
            method.name ||
            method.label ||
            method.display_name ||
            ''
        );
    };

    const getOAuthLabel = (method: OAuthMethod) => {
        return (
            method.display_name ||
            method.label ||
            method.name ||
            method.provider ||
            method.id ||
            'Single Sign-On'
        );
    };

    const getOAuthUrl = (method: OAuthMethod) => {
        const url =
            method.authorization_url ||
            method.auth_url ||
            method.login_url ||
            method.url;

        if (!url) {
            return '';
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        const apiRoot = basePath.replace(/\/api\/?$/, '');
        if (!apiRoot) {
            return url;
        }

        if (url.startsWith('/')) {
            return `${apiRoot}${url}`;
        }

        return `${apiRoot}/${url}`;
    };

    const buildConnectUrl = (method: OAuthMethod, provider: string) => {
        const url = getOAuthUrl(method);
        if (!url) {
            return '';
        }

        const connectUrl = new URL(url);
        connectUrl.searchParams.set(
            'redirect_uri',
            `${window.location.origin}/oauth/callback`,
        );
        connectUrl.searchParams.set('state', `oauth_connect:${provider}`);
        return connectUrl.toString();
    };

    const mergedOAuthConnections = useMemo(() => {
        const connections = { ...oauthConnections };
        oauthMethods.forEach((method) => {
            const key = getOAuthKey(method);
            if (!key) {
                return;
            }
            if (connections[key] === undefined) {
                connections[key] = false;
            }
        });
        return connections;
    }, [oauthConnections, oauthMethods]);

    const handleOAuthConnect = (provider: string) => {
        const method = oauthMethods.find((item) => getOAuthKey(item) === provider);
        if (!method) {
            toast.error('OAuth provider configuration not found.');
            return;
        }

        const url = buildConnectUrl(method, provider);
        if (!url) {
            toast.error('OAuth provider URL is missing.');
            return;
        }

        sessionStorage.setItem('oauth_connect_provider', provider);
        sessionStorage.setItem('oauth_connect_return_path', location.pathname);
        window.location.href = url;
    };

    const handleOAuthDisconnect = async (provider: string) => {
        try {
            setOauthBusyProvider(provider);
            const token = await getAccessToken();
            const response = await fetch(
                `${basePath}/users/oauth/disconnect/${provider}/`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (!response.ok) {
                throw new Error('Failed to disconnect OAuth provider.');
            }

            setOauthConnections((prev) => ({ ...prev, [provider]: false }));
            toast.success(`${provider} disconnected.`);
        } catch (error) {
            toast.error('Failed to disconnect OAuth provider.');
        } finally {
            setOauthBusyProvider(null);
        }
    };

    const handleSave = async () => {
        const data = getValues();
        const previousData = previousValuesRef.current;

        if (!data.id) return;

        // Check if any relevant field actually changed using strict equality
        const hasChanges =
            (data.password !== 'password' &&
                data.password !== previousData?.password) ||
            (data.catalystApiKey !== 'apikey' &&
                data.catalystApiKey !== previousData?.catalystApiKey) ||
            data.vimMode !== previousData?.vimMode ||
            data.theme !== previousData?.theme;

        if (!hasChanges) {
            toast.info('No changes to save');
            return;
        }

        const payload: any = {};
        if (
            data.catalystApiKey !== 'apikey' &&
            data.catalystApiKey !== previousData?.catalystApiKey
        ) {
            payload.catalystApiKey = data.catalystApiKey;
        }
        if (data.vimMode !== previousData?.vimMode) {
            payload.vimMode = data.vimMode;
        }
        if (data.theme !== previousData?.theme) {
            payload.theme = data.theme;
        }

        if (Object.keys(payload).length === 0) {
            toast.info('No changes to save');
            return;
        }

        const userId = data.id;
        if (!userId) {
            return;
        }

        saveMutation.mutate(
            { userId, payload },
            {
                onSuccess: (updatedUser) => {
                    setProfile((prevProfile: any) => ({
                        ...prevProfile,
                        ...updatedUser,
                    }));

                    // Update previous values AFTER successful save
                    previousValuesRef.current = {
                        ...previousData,
                        ...data,
                        // Ensure password/api key reset to placeholder in our reference to match form state
                        password: 'password',
                        catalystApiKey: data.catalystApiKey ? 'apikey' : '',
                    };
                },
            },
        );
    };

    const handleDelete = () => {
        const userId = getValues('id');
        if (!userId) {
            return;
        }
        deleteAccountMutation.mutate(userId);
    };

    const openChangePasswordModal = () => {
        setChangePasswordModalOpen(true);
    };

    const openApiKeyModal = () => {
        const id = getValues('id');
        if (!id) return;
        setApiKeyModalOpen(true);
    };

    const openTwoFactorModal = () => {
        setTwoFactorDisabling(twoFactorEnabled);
        setTwoFactorModalOpen(true);
    };

    const openDeleteAccountModal = () => {
        setDeleteAccountModalOpen(true);
    };

    const openNoteTemplateModal = async () => {
        setNoteTemplateLoading(true);
        try {
            const defaultNoteResponse =
                await fetchNoteTemplateMutation.mutateAsync(target);
            const initialTemplate = defaultNoteResponse.template || '';
            setNoteTemplateContent(initialTemplate);
            setNoteTemplateModalOpen(true);
        } finally {
            setNoteTemplateLoading(false);
        }
    };

    // Require user to be loaded
    if (!user) return <div></div>;

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        router.navigate({
            to: location.pathname as any,
            search: { ...search, tab } as any,
            replace: true,
        });
    };

    const getRoleBadgeVariant = (role?: string) => {
        switch (role) {
            case 'admin':
                return 'destructive';
            case 'author':
                return 'default';
            case 'viewer':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    const settingsTabs = [
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'sessions', label: 'Sessions', icon: ClockRotateRight },
        { id: 'oauth', label: 'OAuth', icon: Link },
        { id: 'appearance', label: 'Appearance', icon: SunLight },
        { id: 'editor', label: 'Editor', icon: EditPencil },
    ];

    const tabDescriptions: Record<string, string> = {
        security: 'Authentication, API keys, and account security',
        sessions: 'Manage your active sessions across devices',
        oauth: 'Link or unlink external identity providers',
        appearance: 'Customize your visual appearance and theme',
        editor: 'Configure editor behavior, templates, and snippets',
    };

    const currentTab = settingsTabs.find((tab) => tab.id === activeTab);
    const currentDescription =
        activeTab && activeTab in tabDescriptions ? tabDescriptions[activeTab] : '';

    return (
        <div className='flex w-full h-full'>
            {/* Settings Sidebar */}
            <Sidebar
                collapsible='none'
                className='border-r bg-background text-foreground [&_[data-slot=sidebar-inner]]:bg-background [&_[data-slot=sidebar-inner]]:text-foreground'
            >
                <SidebarHeader className='flex flex-col p-4 gap-2 border-b border-border'>
                    <div className='w-full'>
                        <div className='flex items-center gap-2 mb-1'>
                            <div className='text-sm font-medium text-foreground truncate'>
                                {profile?.username || user?.username || 'User'}
                            </div>
                            {(() => {
                                const role = profile?.role || user?.role;
                                return role ? (
                                    <Badge
                                        variant={getRoleBadgeVariant(role)}
                                        className='text-[10px] px-1.5 py-0 h-4 leading-none'
                                    >
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                    </Badge>
                                ) : null;
                            })()}
                        </div>
                        <div className='text-xs text-muted-foreground truncate'>
                            {profile?.email || user?.email || ''}
                        </div>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarMenu>
                            {settingsTabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <SidebarMenuItem key={tab.id}>
                                        <SidebarMenuButton
                                            isActive={activeTab === tab.id}
                                            onClick={() => handleTabChange(tab.id)}
                                            tooltip={tab.label}
                                        >
                                            <Icon />
                                            <span>{tab.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>

            {/* Main Content Area */}
            <div className='flex-1 flex flex-col overflow-auto'>
                {/* Header Section */}
                <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                    <div>
                        <h2 className='text-2xl font-bold tracking-tight'>
                            {currentTab?.label || 'Settings'}
                        </h2>
                        <p className='text-muted-foreground'>{currentDescription}</p>
                    </div>
                </div>

                {/* Content Area */}
                <div className='p-5 flex-1'>
                    <div className='w-full'>
                        <form onSubmit={(e) => e.preventDefault()}>
                            {/* Security Section */}
                            {activeTab === 'security' && (
                                <section id='security' className='pb-8'>
                                    <div className='space-y-4'>
                                        {/* Authentication Card */}
                                        <SettingsCard>
                                            <SettingsButton
                                                label='Password'
                                                description='Change your account password'
                                                buttonText='Change'
                                                onClick={openChangePasswordModal}
                                                title='Change Password'
                                            />

                                            <Separator />

                                            <SettingsButton
                                                label='API Key'
                                                description='Generate key for API access'
                                                buttonText='Generate'
                                                onClick={openApiKeyModal}
                                                title='Generate API Key'
                                            />

                                            <Separator />

                                            <div className='flex items-center justify-between py-2'>
                                                <div>
                                                    <span className='text-sm text-muted-foreground block mb-0.5'>
                                                        Two-Factor Auth
                                                    </span>
                                                    <span className='text-sm text-muted-foreground'>
                                                        Protect your account with
                                                        one-time codes from an
                                                        authenticator app
                                                    </span>
                                                </div>
                                                <Button
                                                    type='button'
                                                    variant={
                                                        twoFactorEnabled
                                                            ? 'destructive'
                                                            : 'outline'
                                                    }
                                                    size='sm'
                                                    onClick={openTwoFactorModal}
                                                >
                                                    {twoFactorEnabled
                                                        ? 'Disable'
                                                        : 'Enable'}
                                                </Button>
                                            </div>

                                            <Separator />

                                            <SettingsButton
                                                label='Delete Account'
                                                description='Permanently remove account and data'
                                                buttonText='Delete'
                                                variant='danger'
                                                onClick={openDeleteAccountModal}
                                            />
                                        </SettingsCard>
                                    </div>
                                </section>
                            )}

                            {/* Sessions Section */}
                            {activeTab === 'sessions' && (
                                <section id='sessions' className='pb-8'>
                                    <ActiveSessions userId={target} />
                                </section>
                            )}

                            {/* OAuth Section */}
                            {activeTab === 'oauth' &&
                                Object.keys(mergedOAuthConnections).length > 0 && (
                                    <section id='oauth' className='pb-8'>
                                        <div className='space-y-4'>
                                            <SettingsCard>
                                                {Object.entries(
                                                    mergedOAuthConnections,
                                                ).map(
                                                    (
                                                        [provider, connected],
                                                        index,
                                                        all,
                                                    ) => {
                                                        const method =
                                                            oauthMethods.find(
                                                                (item) =>
                                                                    getOAuthKey(
                                                                        item,
                                                                    ) === provider,
                                                            );
                                                        const label = method
                                                            ? getOAuthLabel(method)
                                                            : provider;
                                                        return (
                                                            <div key={provider}>
                                                                <div className='flex items-center justify-between py-2'>
                                                                    <div>
                                                                        <span className='text-sm text-muted-foreground block mb-0.5'>
                                                                            {label}
                                                                        </span>
                                                                        <span className='text-sm text-muted-foreground'>
                                                                            {connected
                                                                                ? 'Connected'
                                                                                : 'Not connected'}
                                                                        </span>
                                                                    </div>
                                                                    <Button
                                                                        type='button'
                                                                        variant={
                                                                            connected
                                                                                ? 'destructive'
                                                                                : 'outline'
                                                                        }
                                                                        size='sm'
                                                                        onClick={() => {
                                                                            if (
                                                                                connected
                                                                            ) {
                                                                                handleOAuthDisconnect(
                                                                                    provider,
                                                                                );
                                                                            } else {
                                                                                handleOAuthConnect(
                                                                                    provider,
                                                                                );
                                                                            }
                                                                        }}
                                                                        disabled={
                                                                            oauthBusyProvider ===
                                                                            provider
                                                                        }
                                                                    >
                                                                        {connected
                                                                            ? 'Disconnect'
                                                                            : 'Connect'}
                                                                    </Button>
                                                                </div>
                                                                {index <
                                                                    all.length - 1 && (
                                                                    <Separator />
                                                                )}
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </SettingsCard>
                                        </div>
                                    </section>
                                )}

                            {/* OAuth empty state */}
                            {activeTab === 'oauth' &&
                                Object.keys(mergedOAuthConnections).length === 0 && (
                                    <section id='oauth' className='pb-8'>
                                        <p className='text-sm text-muted-foreground'>
                                            No OAuth providers are configured
                                        </p>
                                    </section>
                                )}

                            {/* Appearance Section */}
                            {activeTab === 'appearance' && (
                                <section id='appearance' className='pb-8'>
                                    <div className='space-y-4'>
                                        <SettingsCard>
                                            <div className='flex items-center justify-between gap-4 py-2'>
                                                <div className='flex-1'>
                                                    <Label className='text-sm text-muted-foreground block mb-0.5'>
                                                        Theme
                                                    </Label>
                                                    <p className='text-sm text-muted-foreground'>
                                                        Choose your preferred color
                                                        scheme
                                                    </p>
                                                </div>
                                                <Button
                                                    type='button'
                                                    variant='ghost'
                                                    size='icon'
                                                    onClick={() =>
                                                        setValue(
                                                            'theme',
                                                            watch('theme') === 'dark'
                                                                ? 'light'
                                                                : 'dark',
                                                        )
                                                    }
                                                >
                                                    {watch('theme') === 'dark' ? (
                                                        <SunLight className='w-5 h-5' />
                                                    ) : (
                                                        <HalfMoon className='w-5 h-5' />
                                                    )}
                                                </Button>
                                            </div>
                                        </SettingsCard>
                                        <div className='flex justify-start pt-2'>
                                            <Button
                                                type='button'
                                                onClick={handleSave}
                                                disabled={saveMutation.isPending || !isDirty}
                                            >
                                                {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                                            </Button>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Editor Settings Section */}
                            {activeTab === 'editor' && (
                                <section id='editor' className='pb-8'>
                                    <div className='space-y-4'>
                                        <SettingsCard>
                                            <div className='py-2'>
                                                <div className='flex items-center justify-between gap-4'>
                                                    <div className='flex-1'>
                                                        <Label
                                                            htmlFor={vimModeId}
                                                            className='text-sm text-muted-foreground block mb-0.5'
                                                        >
                                                            Vim Mode
                                                        </Label>
                                                        <p className='text-sm text-muted-foreground'>
                                                            Use Vim keybindings in the
                                                            markdown editor
                                                        </p>
                                                    </div>
                                                    <Controller
                                                        name='vimMode'
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Switch
                                                                id={vimModeId}
                                                                name={field.name}
                                                                data-testid='vim-toggle'
                                                                checked={field.value}
                                                                onCheckedChange={
                                                                    field.onChange
                                                                }
                                                            />
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            <Separator />

                                            <SettingsButton
                                                label='Note Template'
                                                description='Preset structure for new notes you create'
                                                buttonText='Edit'
                                                onClick={openNoteTemplateModal}
                                                disabled={noteTemplateLoading}
                                                loading={noteTemplateLoading}
                                            />

                                            <Separator />

                                            <SettingsButton
                                                label='Note Snippets'
                                                description='Reusable text blocks you can insert with shortcuts'
                                                buttonText='New Snippet'
                                                onClick={() => {
                                                    snippetListRef.current?.handleAddSnippet();
                                                }}
                                            />
                                            <SnippetList
                                                ref={snippetListRef}
                                                userId={target}
                                                showTitle={false}
                                            />
                                        </SettingsCard>
                                        <div className='flex justify-start pt-2'>
                                            <Button
                                                type='button'
                                                onClick={handleSave}
                                                disabled={saveMutation.isPending || !isDirty}
                                            >
                                                {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                                            </Button>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </form>
                    </div>
                </div>
            </div>
            <ChangePasswordModal
                open={changePasswordModalOpen}
                onOpenChange={setChangePasswordModalOpen}
            />
            {getValues('id') && (
                <ApiKeyGenerateModal
                    open={apiKeyModalOpen}
                    onOpenChange={setApiKeyModalOpen}
                    userId={getValues('id')!}
                />
            )}
            <TwoFactorSetupModal
                open={twoFactorModalOpen}
                onOpenChange={setTwoFactorModalOpen}
                isDisabling={twoFactorDisabling}
                onSuccess={() => {
                    setTwoFactorEnabled((prev) => !prev);
                    toast.success(
                        twoFactorDisabling
                            ? 'Two-Factor Auth has been disabled.'
                            : 'Two-Factor Auth has been enabled.',
                    );
                }}
            />
            <ConfirmDeletionModal
                open={deleteAccountModalOpen}
                onOpenChange={setDeleteAccountModalOpen}
                onConfirm={handleDelete}
                confirmText='DELETE'
                text='Deleting your account will permanently remove all your data, including notes, entries, and settings. This action cannot be undone.'
            />
            <MarkdownEditorModal
                open={noteTemplateModalOpen}
                onOpenChange={setNoteTemplateModalOpen}
                title='Default Note Template'
                titleEditable={false}
                initialContent={noteTemplateContent}
                helpText='This markdown template will be used as the starting content for new notes you create.'
                onConfirm={async (content) => {
                    setProfile((prevProfile: any) => ({
                        ...prevProfile,
                        defaultNoteTemplate: content,
                    }));
                    await saveNoteTemplateMutation.mutateAsync({
                        userId: target,
                        template: content,
                    });
                }}
            />
        </div>
    );
}
