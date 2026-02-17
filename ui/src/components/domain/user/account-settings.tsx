import ConfirmDeletionDialog from '@/components/dialogs/base/confirm-deletion-dialog';
import MarkdownEditorDialog from '@/components/dialogs/base/markdown-editor-dialog';
import ApiKeyGenerateDialog from '@/components/domain/user/dialogs/api-key-generate-dialog';
import ChangePasswordDialog from '@/components/domain/user/dialogs/change-password-dialog';
import TwoFactorSetupDialog from '@/components/domain/user/dialogs/two-factor-setup-dialog';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from '@/contexts/ui/theme-context';
import useApi from '@/hooks/api/use-api';
import { useAuthActions } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import { cn } from '@/lib/utils';
import { UserConfig, UserRetrieve } from '@/services/cradle/models';
import { PRESET_THEMES } from '@/utils/themes';
import SnippetList, {
    SnippetListRef,
} from '@components/base/snippet-list/snippet-list';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClockCounterClockwiseIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import bytes from 'bytes';
import { Check, ChevronsUpDown, Link, Lock, Palette } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
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
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/settings' });

    const { usersApi, basePath } = useApi();
    const { logOut } = useAuthActions();
    const queryClient = useQueryClient();
    const { setTheme } = useTheme();

    const tab = (search as any)?.tab ?? ACCOUNT_SETTINGS_ITEMS[0].id;

    const saveMutation = useMutation({
        mutationFn: async ({ userId, payload }: { userId: string; payload: any }) => {
            return await usersApi.usersUpdate({
                userId,
                userUpdateRequest: payload,
            });
        },
        meta: {
            successMessage: 'Settings saved successfully',
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
        },
    });
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
    const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
    const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
    const [twoFactorDisabling, setTwoFactorDisabling] = useState(false);
    const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
    const [noteTemplateDialogOpen, setNoteTemplateDialogOpen] = useState(false);
    const [noteTemplateContent, setNoteTemplateContent] = useState('');
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
        handleSubmit,
        reset,
        getValues,
        setValue,
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

    const previousValuesRef = useRef<Partial<AccountFormData> | null>(null);

    // Query for user data
    const { data: userData } = useQuery<UserRetrieve>({
        queryKey: queryKeys.users.detail(target),
        queryFn: () => usersApi.usersRetrieve({ userId: target }),
        enabled: !!target,
        meta: {
            showErrorToast: true,
            suppressNotification: true,
        },
    });

    // Populate form when user data is loaded
    useEffect(() => {
        if (!userData || !target) {
            return;
        }

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
                    const { name: _name, ...themeWithoutName } = userData.theme as any;
                    setCustomThemeJSON(JSON.stringify(themeWithoutName, null, 2));
                }
            } else {
                // Custom theme or no name field
                setSelectedThemeType('custom');
                const { name: _name, ...themeWithoutName } = userData.theme as any;
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
        onSuccess: (_, provider) => {
            setOauthConnections((prev) => ({ ...prev, [provider]: false }));
            toast.success(`${provider} disconnected.`);
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
            } catch {
                toast.error('Theme must be valid JSON.');
                return;
            }
        }

        if (Object.keys(payload).length === 0) {
            toast.info('No changes to save');
            return;
        }

        const userId = data.id;
        if (!userId) return;

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

    const openChangePasswordDialog = () => {
        setChangePasswordDialogOpen(true);
    };

    const openApiKeyDialog = () => {
        const id = getValues('id');
        if (!id) return;
        setApiKeyDialogOpen(true);
    };

    const openTwoFactorDialog = () => {
        setTwoFactorDisabling(twoFactorEnabled);
        setTwoFactorDialogOpen(true);
    };

    const openDeleteAccountDialog = () => {
        setDeleteAccountDialogOpen(true);
    };

    const openNoteTemplateDialog = async () => {
        setNoteTemplateLoading(true);
        try {
            const defaultNoteResponse =
                await fetchNoteTemplateMutation.mutateAsync(target);
            const initialTemplate = defaultNoteResponse.template || '';
            setNoteTemplateContent(initialTemplate);
            setNoteTemplateDialogOpen(true);
        } finally {
            setNoteTemplateLoading(false);
        }
    };

    const handleThemeTypeChange = (themeType: string) => {
        setSelectedThemeType(themeType);

        if (themeType === 'custom') {
            // When switching to custom, populate with current theme without name
            const currentTheme = userData?.theme || PRESET_THEMES[0].theme;
            const { name: _name, ...themeWithoutName } = currentTheme as any;
            setCustomThemeJSON(JSON.stringify(themeWithoutName, null, 2));
        } else {
            // Apply preset theme immediately
            const preset = PRESET_THEMES.find((p) => p.id === themeType);
            if (preset) {
                const presetTheme: any = preset.theme;
                const themeWithName =
                    presetTheme &&
                    typeof presetTheme === 'object' &&
                    !Array.isArray(presetTheme)
                        ? 'name' in presetTheme
                            ? presetTheme
                            : { name: preset.id, ...presetTheme }
                        : { name: preset.id };

                setTheme(themeWithName);
                setValue('theme', JSON.stringify(themeWithName, null, 2), {
                    shouldDirty: true,
                });
                toast.success(`Applied ${preset.label} theme`);
            }
        }
    };

    const handleApplyCustomTheme = () => {
        try {
            const parsed = JSON.parse(customThemeJSON);
            if (
                typeof parsed !== 'object' ||
                parsed === null ||
                Array.isArray(parsed)
            ) {
                toast.error('Theme must be a JSON object.');
                return;
            }
            // Auto-add name field as 'custom'
            const themeWithName = {
                name: 'custom',
                ...parsed,
            };
            setTheme(themeWithName);
            setValue('theme', JSON.stringify(themeWithName, null, 2), {
                shouldDirty: true,
            });
            toast.success('Custom theme applied');
        } catch {
            toast.error('Invalid JSON format');
        }
    };

    // Require user to be loaded
    if (!userData) return <div></div>;

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
    const currentDescription = currentTab?.description ?? '';

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
                                        {currentDescription}
                                    </p>
                                </div>
                                <Separator
                                    data-orientation='horizontal'
                                    role='none'
                                    className='bg-border mb-4 flex-none'
                                />
                                <form
                                    className='flex flex-col gap-6'
                                    onSubmit={handleSubmit(() => void handleSave())}
                                >
                                    {/* Security Section */}
                                    {tab === 'security' && (
                                        <section id='security'>
                                            <div className='flex flex-col gap-4'>
                                                <FieldGroup className='gap-4'>
                                                    <Field
                                                        orientation='horizontal'
                                                        className='gap-2'
                                                    >
                                                        <FieldContent className='flex-1'>
                                                            <FieldLabel className='text-sm block mb-0.5'>
                                                                Password
                                                            </FieldLabel>
                                                            <FieldDescription>
                                                                Change your account
                                                                password
                                                            </FieldDescription>
                                                        </FieldContent>
                                                        <Button
                                                            type='button'
                                                            variant='outline'
                                                            size='sm'
                                                            className='self-center'
                                                            onClick={
                                                                openChangePasswordDialog
                                                            }
                                                            title='Change Password'
                                                        >
                                                            Change
                                                        </Button>
                                                    </Field>

                                                    <Separator />

                                                    <Field
                                                        orientation='horizontal'
                                                        className='gap-2'
                                                    >
                                                        <FieldContent className='flex-1'>
                                                            <FieldLabel className='text-sm block mb-0.5'>
                                                                API Key
                                                            </FieldLabel>
                                                            <FieldDescription>
                                                                Generate key for API
                                                                access
                                                            </FieldDescription>
                                                        </FieldContent>
                                                        <Button
                                                            type='button'
                                                            variant='outline'
                                                            size='sm'
                                                            className='self-center'
                                                            onClick={openApiKeyDialog}
                                                            title='Generate API Key'
                                                        >
                                                            Generate
                                                        </Button>
                                                    </Field>

                                                    <Separator />

                                                    <Field
                                                        orientation='horizontal'
                                                        className='gap-2'
                                                    >
                                                        <FieldContent className='flex-1'>
                                                            <FieldLabel className='text-sm block mb-0.5'>
                                                                Two-Factor Auth
                                                            </FieldLabel>
                                                            <FieldDescription>
                                                                Protect your account
                                                                with one-time codes from
                                                                an authenticator app
                                                            </FieldDescription>
                                                        </FieldContent>
                                                        <Button
                                                            type='button'
                                                            variant={
                                                                twoFactorEnabled
                                                                    ? 'destructive'
                                                                    : 'outline'
                                                            }
                                                            size='sm'
                                                            className='self-center'
                                                            onClick={
                                                                openTwoFactorDialog
                                                            }
                                                        >
                                                            {twoFactorEnabled
                                                                ? 'Disable'
                                                                : 'Enable'}
                                                        </Button>
                                                    </Field>

                                                    <Separator />

                                                    <Field
                                                        orientation='horizontal'
                                                        className='gap-2'
                                                    >
                                                        <FieldContent className='flex-1'>
                                                            <FieldLabel className='text-sm block mb-0.5'>
                                                                Delete Account
                                                            </FieldLabel>
                                                            <FieldDescription>
                                                                Permanently remove
                                                                account and data
                                                            </FieldDescription>
                                                        </FieldContent>
                                                        <Button
                                                            type='button'
                                                            variant='destructive'
                                                            size='sm'
                                                            onClick={
                                                                openDeleteAccountDialog
                                                            }
                                                        >
                                                            Delete
                                                        </Button>
                                                    </Field>
                                                </FieldGroup>
                                            </div>
                                        </section>
                                    )}

                                    {/* Sessions Section */}
                                    {tab === 'sessions' && (
                                        <section id='sessions'>
                                            <ActiveSessions userId={target} />
                                        </section>
                                    )}

                                    {/* OAuth Section */}
                                    {tab === 'oauth' &&
                                        Object.keys(mergedOAuthConnections).length >
                                            0 && (
                                            <section id='oauth'>
                                                <div className='flex flex-col gap-4'>
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
                                                                    <Field
                                                                        orientation='horizontal'
                                                                        className='gap-2'
                                                                    >
                                                                        <FieldContent className='flex-1'>
                                                                            <FieldLabel className='text-sm block mb-0.5'>
                                                                                {label}
                                                                            </FieldLabel>
                                                                            <FieldDescription>
                                                                                {connected
                                                                                    ? 'Connected'
                                                                                    : 'Not connected'}
                                                                            </FieldDescription>
                                                                        </FieldContent>
                                                                        <Button
                                                                            type='button'
                                                                            variant={
                                                                                connected
                                                                                    ? 'destructive'
                                                                                    : 'outline'
                                                                            }
                                                                            size='sm'
                                                                            className='self-center'
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
                                                                    </Field>
                                                                    {index <
                                                                        all.length -
                                                                            1 && (
                                                                        <Separator />
                                                                    )}
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </section>
                                        )}

                                    {/* OAuth empty state */}
                                    {tab === 'oauth' &&
                                        Object.keys(mergedOAuthConnections).length ===
                                            0 && (
                                            <section id='oauth'>
                                                <p className='text-sm text-muted-foreground'>
                                                    No OAuth providers are configured
                                                </p>
                                            </section>
                                        )}

                                    {/* Appearance Section */}
                                    {tab === 'appearance' && (
                                        <section id='appearance'>
                                            <div className='flex flex-col gap-4'>
                                                <FieldGroup className='gap-4'>
                                                    <Field
                                                        orientation='horizontal'
                                                        className='gap-2'
                                                    >
                                                        <FieldContent className='flex-1'>
                                                            <FieldLabel className='text-sm block mb-0.5'>
                                                                Theme
                                                            </FieldLabel>
                                                            <FieldDescription>
                                                                Select a color theme for
                                                                the interface
                                                            </FieldDescription>
                                                        </FieldContent>
                                                        <Popover
                                                            open={themePopoverOpen}
                                                            onOpenChange={
                                                                setThemePopoverOpen
                                                            }
                                                        >
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant='outline'
                                                                    role='combobox'
                                                                    aria-expanded={
                                                                        themePopoverOpen
                                                                    }
                                                                    className='w-full sm:w-64 justify-between self-center'
                                                                >
                                                                    <span className='truncate'>
                                                                        {selectedThemeType ===
                                                                        'custom'
                                                                            ? 'Custom'
                                                                            : PRESET_THEMES.find(
                                                                                  (p) =>
                                                                                      p.id ===
                                                                                      selectedThemeType,
                                                                              )
                                                                                  ?.label ||
                                                                              'Select theme...'}
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
                                                                        <CommandEmpty>
                                                                            No themes
                                                                            found.
                                                                        </CommandEmpty>
                                                                        <CommandGroup>
                                                                            {PRESET_THEMES.map(
                                                                                (
                                                                                    preset,
                                                                                ) => (
                                                                                    <CommandItem
                                                                                        key={
                                                                                            preset.id
                                                                                        }
                                                                                        value={
                                                                                            preset.label
                                                                                        }
                                                                                        onSelect={() => {
                                                                                            handleThemeTypeChange(
                                                                                                preset.id,
                                                                                            );
                                                                                            setThemePopoverOpen(
                                                                                                false,
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        <Check
                                                                                            className={cn(
                                                                                                'mr-2 size-4',
                                                                                                selectedThemeType ===
                                                                                                    preset.id
                                                                                                    ? 'opacity-100'
                                                                                                    : 'opacity-0',
                                                                                            )}
                                                                                        />
                                                                                        {
                                                                                            preset.label
                                                                                        }
                                                                                    </CommandItem>
                                                                                ),
                                                                            )}
                                                                            <CommandItem
                                                                                value='Custom'
                                                                                onSelect={() => {
                                                                                    handleThemeTypeChange(
                                                                                        'custom',
                                                                                    );
                                                                                    setThemePopoverOpen(
                                                                                        false,
                                                                                    );
                                                                                }}
                                                                            >
                                                                                <Check
                                                                                    className={cn(
                                                                                        'mr-2 size-4',
                                                                                        selectedThemeType ===
                                                                                            'custom'
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

                                                    {selectedThemeType === 'custom' && (
                                                        <Field className='space-y-2'>
                                                            <FieldLabel
                                                                htmlFor='custom-theme-json'
                                                                className='text-sm block mb-0.5'
                                                            >
                                                                Custom Theme JSON
                                                            </FieldLabel>
                                                            <FieldDescription>
                                                                Provide a JSON object
                                                                with CSS variable
                                                                values.
                                                            </FieldDescription>
                                                            <Textarea
                                                                id='custom-theme-json'
                                                                rows={10}
                                                                className='font-mono text-xs'
                                                                placeholder='{"--background":"oklch(0.145 0 0)","--foreground":"oklch(0.985 0 0)"}'
                                                                value={customThemeJSON}
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
                                                                    Apply Custom Theme
                                                                </Button>
                                                            </div>
                                                        </Field>
                                                    )}
                                                </FieldGroup>
                                            </div>
                                        </section>
                                    )}

                                    {/* Editor Settings Section */}
                                    {tab === 'editor' && (
                                        <section id='editor'>
                                            <div className='flex flex-col gap-4'>
                                                <div className='flex items-center justify-between gap-4'>
                                                    <div className='flex-1'>
                                                        <Label
                                                            htmlFor={vimModeId}
                                                            className='text-sm block mb-0.5'
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

                                                <Separator />

                                                <FieldGroup className='gap-4'>
                                                    <Field
                                                        orientation='horizontal'
                                                        className='gap-2'
                                                    >
                                                        <FieldContent className='flex-1'>
                                                            <FieldLabel className='text-sm block mb-0.5'>
                                                                Note Template
                                                            </FieldLabel>
                                                            <FieldDescription>
                                                                Preset structure for new
                                                                notes you create
                                                            </FieldDescription>
                                                        </FieldContent>
                                                        <Button
                                                            type='button'
                                                            variant='outline'
                                                            size='sm'
                                                            className='self-center'
                                                            onClick={
                                                                openNoteTemplateDialog
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
                                                        className='gap-2'
                                                    >
                                                        <FieldContent className='flex-1'>
                                                            <FieldLabel className='text-sm block mb-0.5'>
                                                                Note Snippets
                                                            </FieldLabel>
                                                            <FieldDescription>
                                                                Reusable text blocks you
                                                                can insert with
                                                                shortcuts
                                                            </FieldDescription>
                                                        </FieldContent>
                                                        <Button
                                                            type='button'
                                                            variant='outline'
                                                            size='sm'
                                                            className='self-center'
                                                            onClick={() => {
                                                                snippetListRef.current?.handleAddSnippet();
                                                            }}
                                                        >
                                                            New Snippet
                                                        </Button>
                                                    </Field>
                                                </FieldGroup>
                                                <SnippetList
                                                    ref={snippetListRef}
                                                    userId={target}
                                                    showTitle={false}
                                                />
                                                <div className='flex justify-end pt-2'>
                                                    <Button
                                                        type='submit'
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
            <ChangePasswordDialog
                open={changePasswordDialogOpen}
                onOpenChange={setChangePasswordDialogOpen}
            />
            {getValues('id') && (
                <ApiKeyGenerateDialog
                    open={apiKeyDialogOpen}
                    onOpenChange={setApiKeyDialogOpen}
                    userId={getValues('id')!}
                />
            )}
            <TwoFactorSetupDialog
                open={twoFactorDialogOpen}
                onOpenChange={setTwoFactorDialogOpen}
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
            <ConfirmDeletionDialog
                open={deleteAccountDialogOpen}
                onOpenChange={setDeleteAccountDialogOpen}
                onConfirm={handleDelete}
                confirmText='DELETE'
                text='Deleting your account will permanently remove all your data, including notes, entries, and settings. This action cannot be undone.'
            />
            <MarkdownEditorDialog
                open={noteTemplateDialogOpen}
                onOpenChange={setNoteTemplateDialogOpen}
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
