import ApiKeyGenerateModal from '@/components/dialogs/auth/ApiKeyGenerateModal';
import ChangePasswordModal from '@/components/dialogs/auth/ChangePasswordModal';
import TwoFactorSetupModal from '@/components/dialogs/auth/TwoFactorSetupModal';
import ConfirmDeletionModal from '@/components/dialogs/base/ConfirmDeletionModal';
import MarkdownEditorModal from '@/components/dialogs/notes/MarkdownEditorModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
} from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ui/ThemeContext';
import { PRESET_THEMES } from '@/utils/themes';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import useApi from '@/hooks/api/useApi';
import { useAuthActions, useAuthState } from '@/hooks/auth/useAuth';
import { queryKeys } from '@/hooks/query';
import { UserConfig, UserRetrieve } from '@/services/cradle/models';
import SnippetList, { SnippetListRef } from '@components/base/SnippetList/SnippetList';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import bytes from 'bytes';
import { ClockCounterClockwiseIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { Check, ChevronsUpDown, Link, Lock, Palette } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import UserActivityList from '../admin/UserActivityList';
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
    const { logOut } = useAuthActions();
    const { isAdmin } = useAuthState();
    const queryClient = useQueryClient();
    const { setTheme } = useTheme();

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
    if (isAdmin) {
        validTabs.push('activity');
    }

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
    }, [(search as any)?.tab, router, location.pathname, search, validTabs]);
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

    // Theme selection state
    const [selectedThemeType, setSelectedThemeType] = useState<string>('dark');
    const [customThemeJSON, setCustomThemeJSON] = useState<string>('');
    const [themePopoverOpen, setThemePopoverOpen] = useState(false);

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
        theme: '',
    };

    const {
        register,
        handleSubmit,
        reset,
        getValues,
        control,
        formState: { isDirty },
    } = useForm<AccountFormData>({
        resolver: zodResolver(accountSettingsSchema) as any,
        defaultValues,
    });

    const serializeThemeForForm = (themeValue: unknown) => {
        if (!themeValue) {
            return '';
        }
        if (typeof themeValue === 'string') {
            return themeValue;
        }
        try {
            return JSON.stringify(themeValue, null, 2);
        } catch {
            return '';
        }
    };

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
            theme:
                serializeThemeForForm(userData.theme) ||
                JSON.stringify({ mode: 'dark' }, null, 2),
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

        // Determine theme type based on name field
        if (userData.theme) {
            const themeName = (userData.theme as any)?.name;
            if (themeName && themeName !== 'custom') {
                // Check if it's a valid preset
                const matchedPreset = PRESET_THEMES.find(
                    (preset) => preset.id === themeName,
                );
                if (matchedPreset) {
                    setSelectedThemeType(themeName);
                    setCustomThemeJSON('');
                } else {
                    // Unknown theme name, treat as custom
                    setSelectedThemeType('custom');
                    const { name, ...themeWithoutName } = userData.theme as any;
                    setCustomThemeJSON(JSON.stringify(themeWithoutName, null, 2));
                }
            } else {
                // Custom theme or no name field
                setSelectedThemeType('custom');
                const { name, ...themeWithoutName } = userData.theme as any;
                setCustomThemeJSON(
                    JSON.stringify(
                        Object.keys(themeWithoutName).length > 0
                            ? themeWithoutName
                            : userData.theme,
                        null,
                        2,
                    ),
                );
            }
        }
    }, [userData, target, reset]);

    // Query for OAuth configuration
    const { data: userConfig } = useQuery<UserConfig>({
        queryKey: queryKeys.users.config(),
        queryFn: () => usersApi.usersConfig(),
        enabled: !!basePath,
        meta: {
            suppressNotification: true,
        },
    });

    // Update OAuth methods when config is loaded
    useEffect(() => {
        if (userConfig?.oauthMethods) {
            setOauthMethods(
                Array.isArray(userConfig.oauthMethods) ? userConfig.oauthMethods : [],
            );
        } else {
            setOauthMethods([]);
        }
    }, [userConfig]);

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

    const oauthDisconnectMutation = useMutation({
        mutationFn: async (provider: string) => {
            return await usersApi.usersOauthDisconnect({ provider });
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: (_, provider) => {
            setOauthConnections((prev) => ({ ...prev, [provider]: false }));
            toast.success(`${provider} disconnected.`);
        },
        onError: () => {
            toast.error('Failed to disconnect OAuth provider.');
        },
    });

    const handleOAuthDisconnect = async (provider: string) => {
        setOauthBusyProvider(provider);
        try {
            await oauthDisconnectMutation.mutateAsync(provider);
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
            const themeValue = (data.theme || '').trim();
            if (!themeValue) {
                toast.error('Theme JSON cannot be empty.');
                return;
            }
            try {
                const parsed = JSON.parse(themeValue);
                if (
                    typeof parsed !== 'object' ||
                    parsed === null ||
                    Array.isArray(parsed)
                ) {
                    toast.error('Theme must be a JSON object.');
                    return;
                }
                payload.theme = parsed;
            } catch (error) {
                toast.error('Theme must be valid JSON.');
                return;
            }
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
                    const meKey = queryKeys.users.detail(target);
                    queryClient.setQueryData(meKey, (prevProfile: any) => ({
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

    const handleThemeTypeChange = (themeType: string) => {
        setSelectedThemeType(themeType);

        if (themeType === 'custom') {
            // When switching to custom, populate with current theme without name
            const currentTheme = userData?.theme || PRESET_THEMES[0].theme;
            const { name, ...themeWithoutName } = currentTheme as any;
            setCustomThemeJSON(JSON.stringify(themeWithoutName, null, 2));
        } else {
            // Apply preset theme immediately
            const preset = PRESET_THEMES.find((p) => p.id === themeType);
            if (preset) {
                setTheme(preset.theme);
                toast.success(`Applied ${preset.label} theme`);
            }
        }
    };

    const handleApplyCustomTheme = () => {
        try {
            const parsed = JSON.parse(customThemeJSON);
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                toast.error('Theme must be a JSON object.');
                return;
            }
            // Auto-add name field as 'custom'
            const themeWithName = {
                name: 'custom',
                ...parsed,
            };
            setTheme(themeWithName);
            toast.success('Custom theme applied');
        } catch (error) {
            toast.error('Invalid JSON format');
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
        { id: 'sessions', label: 'Sessions', icon: ClockCounterClockwiseIcon },
        { id: 'oauth', label: 'OAuth', icon: Link },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'editor', label: 'Editor', icon: PencilSimpleIcon },
    ];

    if (isAdmin) {
        settingsTabs.push({ id: 'activity', label: 'Activity', icon: ClockCounterClockwiseIcon });
    }

    const tabDescriptions: Record<string, string> = {
        security: 'Authentication, API keys, and account security',
        sessions: 'Manage your active sessions across devices',
        oauth: 'Link or unlink external identity providers',
        appearance: 'Customize your visual appearance and theme',
        editor: 'Configure editor behavior, templates, and snippets',
        activity: 'View account activity and audit logs',
    };

    const currentTab = settingsTabs.find((tab) => tab.id === activeTab);
    const currentDescription =
        activeTab && activeTab in tabDescriptions ? tabDescriptions[activeTab] : '';

    return (
        <main
            data-layout='fixed'
            className='px-4 py-6 flex grow flex-col overflow-hidden @7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl'
        >
            <div className='space-y-0.5'>
                <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
                    Settings
                </h1>
                <p className='text-muted-foreground'>
                    Manage your account settings and set e-mail preferences.
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
                        <Select value={activeTab} onValueChange={handleTabChange}>
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
                                {settingsTabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <SelectItem key={tab.id} value={tab.id}>
                                            <div className='flex gap-x-2 items-center'>
                                                <Icon className='w-[18px] h-[18px]' />
                                                <span>{tab.label}</span>
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
                            {settingsTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <a
                                        key={tab.id}
                                        href='#'
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleTabChange(tab.id);
                                        }}
                                        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:text-accent-foreground dark:hover:bg-accent/50 h-9 px-4 py-2 has-[>svg]:px-3 hover:bg-accent justify-start ${
                                            isActive
                                                ? 'bg-muted hover:bg-accent active'
                                                : ''
                                        }`}
                                        data-status={isActive ? 'active' : undefined}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        <span className='me-2'>
                                            <Icon className='w-[18px] h-[18px]' />
                                        </span>
                                        {tab.label}
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
                        <div className='faded-bottom h-full w-full overflow-y-auto scroll-smooth pe-4 pb-12'>
                            <div className='-mx-1 px-1.5'>
                                <form
                                    className='space-y-8'
                                    onSubmit={(e) => e.preventDefault()}
                                >
                                    {/* Security Section */}
                                    {activeTab === 'security' && (
                                        <section id='security'>
                                            <div className='space-y-4'>
                                                {/* Authentication Card */}
                                                <Card className='rounded-lg border-border bg-muted/5 space-y-0'>
                                                    <CardContent className='px-4 py-1'>
                                                        <Field
                                                            orientation='horizontal'
                                                            className='py-2'
                                                        >
                                                            <FieldContent className='flex-1'>
                                                                <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                                                    Password
                                                                </FieldLabel>
                                                                <FieldDescription className='text-sm'>
                                                                    Change your account
                                                                    password
                                                                </FieldDescription>
                                                            </FieldContent>
                                                            <Button
                                                                type='button'
                                                                variant='outline'
                                                                size='sm'
                                                                onClick={
                                                                    openChangePasswordModal
                                                                }
                                                                title='Change Password'
                                                            >
                                                                Change
                                                            </Button>
                                                        </Field>

                                                        <Separator />

                                                        <Field
                                                            orientation='horizontal'
                                                            className='py-2'
                                                        >
                                                            <FieldContent className='flex-1'>
                                                                <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                                                    API Key
                                                                </FieldLabel>
                                                                <FieldDescription className='text-sm'>
                                                                    Generate key for API
                                                                    access
                                                                </FieldDescription>
                                                            </FieldContent>
                                                            <Button
                                                                type='button'
                                                                variant='outline'
                                                                size='sm'
                                                                onClick={
                                                                    openApiKeyModal
                                                                }
                                                                title='Generate API Key'
                                                            >
                                                                Generate
                                                            </Button>
                                                        </Field>

                                                        <Separator />

                                                        <div className='flex items-center justify-between py-2'>
                                                            <div>
                                                                <span className='text-sm text-muted-foreground block mb-0.5'>
                                                                    Two-Factor Auth
                                                                </span>
                                                                <span className='text-sm text-muted-foreground'>
                                                                    Protect your account
                                                                    with one-time codes
                                                                    from an
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
                                                                onClick={
                                                                    openTwoFactorModal
                                                                }
                                                            >
                                                                {twoFactorEnabled
                                                                    ? 'Disable'
                                                                    : 'Enable'}
                                                            </Button>
                                                        </div>

                                                        <Separator />

                                                        <Field
                                                            orientation='horizontal'
                                                            className='py-2'
                                                        >
                                                            <FieldContent className='flex-1'>
                                                                <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                                                    Delete Account
                                                                </FieldLabel>
                                                                <FieldDescription className='text-sm'>
                                                                    Permanently remove
                                                                    account and data
                                                                </FieldDescription>
                                                            </FieldContent>
                                                            <Button
                                                                type='button'
                                                                variant='destructive'
                                                                size='sm'
                                                                onClick={
                                                                    openDeleteAccountModal
                                                                }
                                                            >
                                                                Delete
                                                            </Button>
                                                        </Field>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </section>
                                    )}

                                    {/* Sessions Section */}
                                    {activeTab === 'sessions' && (
                                        <section id='sessions'>
                                            <ActiveSessions userId={target} />
                                        </section>
                                    )}

                                    {/* Activity Section */}
                                    {activeTab === 'activity' && isAdmin && (
                                        <section id='activity'>
                                            <UserActivityList username={user.username} />
                                        </section>
                                    )}

                                    {/* OAuth Section */}
                                    {activeTab === 'oauth' &&
                                        Object.keys(mergedOAuthConnections).length >
                                            0 && (
                                            <section id='oauth'>
                                                <div className='space-y-4'>
                                                    <Card className='rounded-lg border-border bg-muted/5 space-y-0'>
                                                        <CardContent className='px-4 py-1'>
                                                            {Object.entries(
                                                                mergedOAuthConnections,
                                                            ).map(
                                                                (
                                                                    [
                                                                        provider,
                                                                        connected,
                                                                    ],
                                                                    index,
                                                                    all,
                                                                ) => {
                                                                    const method =
                                                                        oauthMethods.find(
                                                                            (item) =>
                                                                                getOAuthKey(
                                                                                    item,
                                                                                ) ===
                                                                                provider,
                                                                        );
                                                                    const label = method
                                                                        ? getOAuthLabel(
                                                                              method,
                                                                          )
                                                                        : provider;
                                                                    return (
                                                                        <div
                                                                            key={
                                                                                provider
                                                                            }
                                                                        >
                                                                            <div className='flex items-center justify-between py-2'>
                                                                                <div>
                                                                                    <span className='text-sm text-muted-foreground block mb-0.5'>
                                                                                        {
                                                                                            label
                                                                                        }
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
                                                                                            provider ||
                                                                                        oauthDisconnectMutation.isPending
                                                                                    }
                                                                                >
                                                                                    {connected
                                                                                        ? 'Disconnect'
                                                                                        : 'Connect'}
                                                                                </Button>
                                                                            </div>
                                                                            {index <
                                                                                all.length -
                                                                                    1 && (
                                                                                <Separator />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                },
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            </section>
                                        )}

                                    {/* OAuth empty state */}
                                    {activeTab === 'oauth' &&
                                        Object.keys(mergedOAuthConnections).length ===
                                            0 && (
                                            <section id='oauth'>
                                                <p className='text-sm text-muted-foreground'>
                                                    No OAuth providers are configured
                                                </p>
                                            </section>
                                        )}

                                    {/* Appearance Section */}
                                    {activeTab === 'appearance' && (
                                        <section id='appearance'>
                                            <div className='space-y-4'>
                                                <Card className='rounded-lg border-border bg-muted/5 space-y-0'>
                                                    <CardContent className='px-4 py-1'>
                                                            <Field orientation='horizontal' className='py-2'>
                                                                <FieldContent className='flex-1'>
                                                                    <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                                                        Theme
                                                                    </FieldLabel>
                                                                    <FieldDescription className='text-sm'>
                                                                        Select a color theme for the interface
                                                                    </FieldDescription>
                                                                </FieldContent>
                                                                <Popover
                                                                    open={themePopoverOpen}
                                                                    onOpenChange={setThemePopoverOpen}
                                                                >
                                                                    <PopoverTrigger asChild>
                                                                        <Button
                                                                            variant='outline'
                                                                            role='combobox'
                                                                            aria-expanded={themePopoverOpen}
                                                                            className='w-full sm:w-64 justify-between'
                                                                        >
                                                                            <span className='truncate'>
                                                                                {selectedThemeType === 'custom'
                                                                                    ? 'Custom'
                                                                                    : PRESET_THEMES.find(
                                                                                          (p) => p.id === selectedThemeType,
                                                                                      )?.label || 'Select theme...'}
                                                                            </span>
                                                                            <ChevronsUpDown className='ml-2 size-4 shrink-0 opacity-50' />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent
                                                                        className='w-[var(--radix-popover-trigger-width)] p-0'
                                                                        align='start'
                                                                    >
                                                                        <Command>
                                                                            <CommandInput placeholder='Search themes...' />
                                                                            <CommandList>
                                                                                <CommandEmpty>No themes found.</CommandEmpty>
                                                                                <CommandGroup>
                                                                                    {PRESET_THEMES.map((preset) => (
                                                                                        <CommandItem
                                                                                            key={preset.id}
                                                                                            value={preset.label}
                                                                                            onSelect={() => {
                                                                                                handleThemeTypeChange(preset.id);
                                                                                                setThemePopoverOpen(false);
                                                                                            }}
                                                                                        >
                                                                                            <Check
                                                                                                className={cn(
                                                                                                    'mr-2 size-4',
                                                                                                    selectedThemeType === preset.id
                                                                                                        ? 'opacity-100'
                                                                                                        : 'opacity-0',
                                                                                                )}
                                                                                            />
                                                                                            {preset.label}
                                                                                        </CommandItem>
                                                                                    ))}
                                                                                    <CommandItem
                                                                                        value='Custom'
                                                                                        onSelect={() => {
                                                                                            handleThemeTypeChange('custom');
                                                                                            setThemePopoverOpen(false);
                                                                                        }}
                                                                                    >
                                                                                        <Check
                                                                                            className={cn(
                                                                                                'mr-2 size-4',
                                                                                                selectedThemeType === 'custom'
                                                                                                    ? 'opacity-100'
                                                                                                    : 'opacity-0',
                                                                                            )}
                                                                                        />
                                                                                        Custom
                                                                                    </CommandItem>
                                                                                </CommandGroup>
                                                                            </CommandList>
                                                                        </Command>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </Field>

                                                            {selectedThemeType ===
                                                                'custom' && (
                                                                <div className='space-y-2'>
                                                                    <Label className='text-sm text-muted-foreground block'>
                                                                        Custom Theme JSON
                                                                    </Label>
                                                                    <p className='text-sm text-muted-foreground'>
                                                                        Provide a JSON object
                                                                        with CSS variable
                                                                        values.
                                                                    </p>
                                                                    <Textarea
                                                                        rows={10}
                                                                        className='font-mono text-xs'
                                                                        placeholder='{"--background":"oklch(0.145 0 0)","--foreground":"oklch(0.985 0 0)"}'
                                                                        value={
                                                                            customThemeJSON
                                                                        }
                                                                        onChange={(e) =>
                                                                            setCustomThemeJSON(
                                                                                e.target.value,
                                                                            )
                                                                        }
                                                                    />
                                                                    <div className='flex justify-end'>
                                                                        <Button
                                                                            type='button'
                                                                            onClick={
                                                                                handleApplyCustomTheme
                                                                            }
                                                                        >
                                                                            Apply Custom
                                                                            Theme
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </section>
                                    )}

                                    {/* Editor Settings Section */}
                                    {activeTab === 'editor' && (
                                        <section id='editor'>
                                            <div className='space-y-4'>
                                                <Card className='rounded-lg border-border bg-muted/5 space-y-0'>
                                                    <CardContent className='px-4 py-1'>
                                                        <div className='py-2'>
                                                            <div className='flex items-center justify-between gap-4'>
                                                                <div className='flex-1'>
                                                                    <Label
                                                                        htmlFor={
                                                                            vimModeId
                                                                        }
                                                                        className='text-sm text-muted-foreground block mb-0.5'
                                                                    >
                                                                        Vim Mode
                                                                    </Label>
                                                                    <p className='text-sm text-muted-foreground'>
                                                                        Use Vim
                                                                        keybindings in
                                                                        the markdown
                                                                        editor
                                                                    </p>
                                                                </div>
                                                                <Controller
                                                                    name='vimMode'
                                                                    control={control}
                                                                    render={({
                                                                        field,
                                                                    }) => (
                                                                        <Switch
                                                                            id={
                                                                                vimModeId
                                                                            }
                                                                            name={
                                                                                field.name
                                                                            }
                                                                            data-testid='vim-toggle'
                                                                            checked={
                                                                                field.value
                                                                            }
                                                                            onCheckedChange={
                                                                                field.onChange
                                                                            }
                                                                        />
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>

                                                        <Separator />

                                                        <Field
                                                            orientation='horizontal'
                                                            className='py-2'
                                                        >
                                                            <FieldContent className='flex-1'>
                                                                <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                                                    Note Template
                                                                </FieldLabel>
                                                                <FieldDescription className='text-sm'>
                                                                    Preset structure for
                                                                    new notes you create
                                                                </FieldDescription>
                                                            </FieldContent>
                                                            <Button
                                                                type='button'
                                                                variant='outline'
                                                                size='sm'
                                                                onClick={
                                                                    openNoteTemplateModal
                                                                }
                                                                disabled={
                                                                    noteTemplateLoading
                                                                }
                                                            >
                                                                {noteTemplateLoading
                                                                    ? 'Loading...'
                                                                    : 'Edit'}
                                                            </Button>
                                                        </Field>

                                                        <Separator />

                                                        <Field
                                                            orientation='horizontal'
                                                            className='py-2'
                                                        >
                                                            <FieldContent className='flex-1'>
                                                                <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                                                    Note Snippets
                                                                </FieldLabel>
                                                                <FieldDescription className='text-sm'>
                                                                    Reusable text blocks
                                                                    you can insert with
                                                                    shortcuts
                                                                </FieldDescription>
                                                            </FieldContent>
                                                            <Button
                                                                type='button'
                                                                variant='outline'
                                                                size='sm'
                                                                onClick={() => {
                                                                    snippetListRef.current?.handleAddSnippet();
                                                                }}
                                                            >
                                                                New Snippet
                                                            </Button>
                                                        </Field>
                                                        <SnippetList
                                                            ref={snippetListRef}
                                                            userId={target}
                                                            showTitle={false}
                                                        />
                                                    </CardContent>
                                                </Card>
                                                <div className='flex justify-end pt-2'>
                                                    <Button
                                                        type='button'
                                                        onClick={handleSave}
                                                        disabled={
                                                            saveMutation.isPending ||
                                                            !isDirty
                                                        }
                                                    >
                                                        {saveMutation.isPending
                                                            ? 'Saving...'
                                                            : 'Save Changes'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </section>
                                    )}
                                </form>
                            </div>
                        </div>
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
                    const meKey = queryKeys.users.detail(target);
                    queryClient.setQueryData(meKey, (prevProfile: any) => ({
                        ...prevProfile,
                        defaultNoteTemplate: content,
                    }));
                    await saveNoteTemplateMutation.mutateAsync({
                        userId: target,
                        template: content,
                    });
                }}
            />
        </main>
    );
}