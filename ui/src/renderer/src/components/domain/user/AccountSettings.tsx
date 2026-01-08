import ApiKeyGenerateModal from '@/components/modals/auth/ApiKeyGenerateModal';
import ChangePasswordModal from '@/components/modals/auth/ChangePasswordModal';
import TwoFactorSetupModal from '@/components/modals/auth/TwoFactorSetupModal';
import ActionConfirmationModal from '@/components/modals/base/ActionConfirmationModal';
import ConfirmDeletionModal from '@/components/modals/base/ConfirmDeletionModal';
import MarkdownEditorModal from '@/components/modals/notes/MarkdownEditorModal';
import { useModal } from '@/contexts/ui/ModalContext';
import { toast } from 'sonner';
import { useProfile } from '@/contexts/user/ProfileContext';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useAuth from '@/hooks/auth/useAuth';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import {
    UserCreateRequestThemeEnum,
    UserRetrieve,
    UserUpdateRequestRoleEnum
} from '@/services/cradle/models';
import { displayError } from '@/utils/api';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { WarningCircle } from 'iconoir-react';
import SnippetList, { SnippetListRef } from '@components/base/SnippetList/SnippetList';
import { SettingsButton, SettingsCard, SettingsField, SettingsSelect } from '@components/forms';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { yupResolver } from '@hookform/resolvers/yup';
import bytes from 'bytes';
import { HalfMoon, SunLight } from 'iconoir-react';
import { debounce } from 'lodash'; // Import lodash debounce
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import * as Yup from 'yup';
import ActiveSessions from './ActiveSessions';

interface AccountFormData {
    id: string;
    username: string;
    email: string;
    password: string;
    catalystApiKey: string;
    role: UserUpdateRequestRoleEnum;
    vimMode?: boolean;
    theme?: UserCreateRequestThemeEnum;
    emailConfirmed: boolean;
    isActive: boolean;
    fileUploadLimitOverride?: string;
}

interface AccountSettingsProps {
    target?: string;
    isEdit?: boolean;
    onAdd?: (user: any) => void;
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

const accountSettingsSchema: Yup.ObjectSchema<AccountFormData> = Yup.object().shape({
    id: Yup.string().notRequired(),
    username: Yup.string().required('Username is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string().when('$isEdit', {
        is: false,
        then: () => Yup.string().required('Password is required'),
        otherwise: () => Yup.string(),
    }),
    catalystApiKey: Yup.string(),
    role: Yup.string().when('$isAdminAndNotOwn', {
        is: true,
        then: () => Yup.string().required('Role is required'),
        otherwise: () => Yup.string(),
    }),
    emailConfirmed: Yup.boolean(),
    isActive: Yup.boolean(),
    vimMode: Yup.boolean().notRequired(),
    theme: Yup.string().notRequired(),
    fileUploadLimitOverride: Yup.string().when('$isAdminAndNotOwn', {
        is: true,
        then: () =>
            Yup.string().test(
                'is-valid-bytes',
                'Enter a valid size (e.g. 100MB, 1GB) or leave empty to use global default',
                (value) => {
                    if (!value || value === '') return true; // Allow empty to use global default
                    return typeof bytes(value) === 'number';
                },
            ),
        otherwise: () => Yup.string().notRequired(),
    }),
}) as Yup.ObjectSchema<AccountFormData>;

export default function AccountSettings({
    target = 'me',
    isEdit = true,
    onAdd,
}: AccountSettingsProps) {
    const { navigate, nativeNavigate } = useCradleNavigate();
    const { usersApi, basePath } = useApi();
    const auth = useAuth();
    const { execute } = useAPICall();
    const { profile, setProfile, isAdmin } = useProfile();
    const { setModal } = useModal();
    const location = useLocation();
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [user, setUser] = useState<UserRetrieve | null>(null);
    const [oauthConnections, setOauthConnections] = useState<
        Record<string, boolean>
    >({});
    const [oauthMethods, setOauthMethods] = useState<OAuthMethod[]>([]);
    const [oauthBusyProvider, setOauthBusyProvider] = useState<string | null>(null);
    const isOwnAccount = isEdit ? target === 'me' || profile?.id === target : false;
    const isAdminAndNotOwn = isAdmin() && !isOwnAccount;
    const vimModeId = useId();
    const snippetListRef = useRef<SnippetListRef>(null);

    // Note template loading state
    const [noteTemplateLoading, setNoteTemplateLoading] = useState(false);

    const defaultValues: AccountFormData = isEdit
        ? {
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
        }
        : {
            id: '',
            username: '',
            email: '',
            password: '',
            catalystApiKey: '',
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
        resolver: yupResolver(accountSettingsSchema, {
            context: { isEdit, isAdminAndNotOwn },
        }),
        defaultValues,
    });

    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });

    const isInitialLoad = useRef(true);
    const previousValuesRef = useRef<Partial<AccountFormData> | null>(null);

    // Prepopulate form in edit mode.
    useEffect(() => {
        (async () => {
            if (isEdit && target) {
                let user: UserRetrieve | null = null;
                try {
                    user = await execute(() =>
                        usersApi.usersRetrieve({ userId: target }),
                    );
                } catch (error) {
                    setUser(null);
                    return;
                }
                setUser(user);
                const connections =
                    (user as any).oauthConnections ||
                    (user as any).oauth_connections ||
                    {};
                setOauthConnections(connections);

                const fileUploadLimitBytes = user.fileUploadLimitOverride;
                const fileUploadLimitFormatted = fileUploadLimitBytes
                    ? bytes.format(fileUploadLimitBytes, { unitSeparator: ' ' })
                    : '';

                const initialData = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    password: 'password',
                    theme: user.theme || 'dark',
                    catalystApiKey: user.catalystApiKey ? 'apikey' : '',
                    role: user.role || 'author',
                    emailConfirmed: user.emailConfirmed || false,
                    isActive: user.isActive || false,
                    vimMode: user.vimMode || false,
                    fileUploadLimitOverride: fileUploadLimitFormatted,
                };

                reset(initialData);
                setTwoFactorEnabled(user.twoFactorEnabled || false);

                // Store initial values for comparison
                previousValuesRef.current = initialData;

                // Mark initial load as complete
                setTimeout(() => {
                    isInitialLoad.current = false;
                }, 1000);
            } else {
                reset(defaultValues);
                isInitialLoad.current = false;
            }
        })();
    }, [isEdit, target, reset, navigate, usersApi]);

    useEffect(() => {
        if (!basePath || !isOwnAccount) {
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
    }, [basePath, isOwnAccount]);

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
        const method = oauthMethods.find(
            (item) => getOAuthKey(item) === provider,
        );
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
            const token = await auth.getAccessToken();
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


    /**
     * Performs the actual API call and diffing.
     * This function is not debounced directly; it is called by the debounced wrapper.
     */
    const processAutoSave = async (data: AccountFormData) => {
        const previousData = previousValuesRef.current;

        if (!isEdit || !data.id) return;

        // Check if any relevant field actually changed using strict equality
        const hasChanges =
            (isAdminAndNotOwn &&
                (data.username !== previousData?.username ||
                    data.email !== previousData?.email ||
                    data.role !== previousData?.role ||
                    data.emailConfirmed !== previousData?.emailConfirmed ||
                    data.isActive !== previousData?.isActive ||
                    data.fileUploadLimitOverride !== previousData?.fileUploadLimitOverride)) ||
            (data.password !== 'password' &&
                data.password !== previousData?.password) ||
            (data.catalystApiKey !== 'apikey' &&
                data.catalystApiKey !== previousData?.catalystApiKey) ||
            data.vimMode !== previousData?.vimMode ||
            data.theme !== previousData?.theme;

        if (!hasChanges) return;

        const payload: any = {};
        if (data.password !== 'password' && data.password !== previousData?.password) {
            payload.password = data.password;
        }
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
        if (isAdminAndNotOwn) {
            if (data.username !== previousData?.username)
                payload.username = data.username;
            if (data.email !== previousData?.email) payload.email = data.email;
            if (data.emailConfirmed !== previousData?.emailConfirmed)
                payload.emailConfirmed = data.emailConfirmed;
            if (data.isActive !== previousData?.isActive)
                payload.isActive = data.isActive;
            if (data.role !== previousData?.role) payload.role = data.role;
            if (data.fileUploadLimitOverride !== previousData?.fileUploadLimitOverride) {
                // Convert to bytes if provided, or null to use global default
                if (data.fileUploadLimitOverride && data.fileUploadLimitOverride.trim() !== '') {
                    payload.fileUploadLimitOverride = bytes.parse(data.fileUploadLimitOverride);
                } else {
                    payload.file_upload_limit = null;
                }
            }
        }

        if (Object.keys(payload).length === 0) return;

        try {
            const updatedUser = await execute(
                () =>
                    usersApi.usersUpdate({
                        userId: data.id,
                        userUpdateRequest: payload,
                    }),
                {
                    // Optional: Reduce noise by removing success message on autosave
                    successMessage: 'Saved',
                    errorMessage: 'Failed to auto-save',
                },
            );

            if (isOwnAccount) {
                setProfile((prevProfile: any) => ({
                    ...prevProfile,
                    ...updatedUser,
                }));
            }

            // Update previous values AFTER successful save
            previousValuesRef.current = {
                ...previousData,
                ...data,
                // Ensure password/api key reset to placeholder in our reference to match form state
                password: 'password',
                catalystApiKey: data.catalystApiKey ? 'apikey' : '',
            };
        } catch (error) {
            console.error('Autosave failed', error);
        }
    };

    const processAutoSaveRef = useRef(processAutoSave);

    useEffect(() => {
        processAutoSaveRef.current = processAutoSave;
    });

    const debouncedSave = useMemo(
        () =>
            debounce((data: AccountFormData) => {
                processAutoSaveRef.current(data);
            }, 1000),
        [],
    );

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            debouncedSave.cancel();
        };
    }, [debouncedSave]);

    // Watch for form changes
    const watchedValues = watch(); // Watch all fields

    useEffect(() => {
        if (isEdit && getValues('id') && !isInitialLoad.current) {
            const currentValues = getValues();
            debouncedSave(currentValues);
        }
    }, [watchedValues, isEdit, debouncedSave, getValues]);

    const onSubmit = async (data: AccountFormData) => {
        if (isEdit) {
            debouncedSave.flush(); // Force immediate execution of pending autosaves
        } else {
            const payload = {
                username: data.username,
                email: data.email,
                password: data.password,
                catalyst_api_key: data.catalystApiKey,
                role: data.role,
                emailConfirmed: data.emailConfirmed,
                isActive: data.isActive,
                vim_mode: data.vimMode,
                theme: data.theme,
            };
            const newUser = await execute(() =>
                usersApi.usersCreate({
                    userCreateRequest: payload,
                }),
            );

            toast.success('User created successfully');
            reset();
            if (onAdd) onAdd(newUser);
        }
    };

    const handleDelete = async () => {
        await execute(() => usersApi.usersDestroy({ userId: getValues('id') }));
        auth.logOut();
    };

    const openChangePasswordModal = () => {
        setModal(ChangePasswordModal);
    };

    const openApiKeyModal = () => {
        const id = getValues('id');
        if (!id) return;
        setModal(ApiKeyGenerateModal, {
            userId: id,
        });
    };

    const openTwoFactorModal = () => {
        setModal(TwoFactorSetupModal, {
            isDisabling: twoFactorEnabled,
            onSuccess: () => {
                setTwoFactorEnabled((prev) => !prev);
                toast.success(twoFactorEnabled
                    ? 'Two-Factor Auth has been disabled.'
                    : 'Two-Factor Auth has been enabled.');
            },
        });
    };

    const openDeleteAccountModal = () => {
        setModal(ConfirmDeletionModal, {
            onConfirm: handleDelete,
            confirmText: 'DELETE',
            text: 'Deleting your account will permanently remove all your data, including notes, entries, and settings. This action cannot be undone.',
        });
    };

    const openNoteTemplateModal = async () => {
        setNoteTemplateLoading(true);
        try {
            const defaultNoteResponse = await execute(() =>
                usersApi.usersDefaultNoteTemplateRetrieve({
                    userId: target,
                }),
            );
            const initialTemplate = defaultNoteResponse.template || '';

            setModal(MarkdownEditorModal, {
                title: 'Default Note Template',
                titleEditable: false,
                initialContent: initialTemplate,
                helpText:
                    'This markdown template will be used as the starting content for new notes you create.',
                onConfirm: async (content: string) => {
                    try {
                        if (isOwnAccount) {
                            setProfile((prevProfile: any) => ({
                                ...prevProfile,
                                defaultNoteTemplate: content,
                            }));
                        }

                        await usersApi.usersDefaultNoteTemplateCreate({
                            userId: target,
                            defaultNoteTemplateRequest: { template: content },
                        });

                        toast.success('Default note template updated successfully!');
                    } catch (err) {
                        displayError(setAlert)(err);
                    }
                },
            });
        } finally {
            setNoteTemplateLoading(false);
        }
    };

    // Admin-only actions
    const simulateSession = async () => {
        const res = await execute(() =>
            usersApi.usersManageRetrieve({
                userId: target,
                actionName: 'simulate',
            }),
        );
        auth.setTokensDirectly(res as any);
        nativeNavigate('/', { replace: true });
    };

    const sendEmailConfirmation = () => {
        execute(
            () =>
                usersApi.usersManageRetrieve({
                    userId: target,
                    actionName: 'send_email_confirmation',
                }),
            { successMessage: 'Email confirmation sent successfully' },
        ).catch(() => { });
    };

    const sendPasswordResetEmail = () => {
        execute(
            () =>
                usersApi.usersManageRetrieve({
                    userId: target,
                    actionName: 'password_reset_email',
                }),
            { successMessage: 'Password reset email sent successfully' },
        ).catch(() => { });
    };

    const handleDeleteUser = async () => {
        await execute(() => usersApi.usersDestroy({ userId: target }));
        toast.success('User deleted successfully');
        navigate('/admin/users');
    };

    const openDeleteUserModal = () => {
        setModal(ConfirmDeletionModal, {
            onConfirm: handleDeleteUser,
            confirmText: getValues('username') || 'DELETE',
            text: 'Deleting this user will permanently remove all their data, including notes, entries, and settings. This action cannot be undone.',
        });
    };

    if (!user) return <div></div>;

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>
                        {isEdit ? 'Settings' : 'Add New User'}
                    </h2>
                    <p className='text-muted-foreground'>
                        {isEdit
                            ? 'Manage account preferences and security'
                            : 'Create a new user account'}
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full'>
                    {/* Admin Actions Section - Only visible to admins viewing other users */}
                    {isAdminAndNotOwn && isEdit && (
                        <section
                            id='admin-actions'
                            className='border-b border-white/5 pb-8'
                        >
                            <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                                User Management
                            </h2>
                            <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                Administrative actions for this user
                            </p>

                            <div className='space-y-4'>
                                <SettingsCard>
                                    <SettingsButton
                                        label='Simulate Session'
                                        description='Jump into a session for this user'
                                        buttonText='Simulate'
                                        onClick={simulateSession}
                                    />

                                    <Separator />

                                    <SettingsButton
                                        label='Email Confirmation'
                                        description='Send email verification to user'
                                        buttonText='Send Email'
                                        onClick={sendEmailConfirmation}
                                    />

                                    <Separator />

                                    <SettingsButton
                                        label='Password Reset'
                                        description='Send password reset email'
                                        buttonText='Send Reset'
                                        onClick={sendPasswordResetEmail}
                                    />

                                    <Separator />

                                    <SettingsButton
                                        label='Delete User'
                                        description='Permanently remove this user and all their data'
                                        buttonText='Delete'
                                        variant='danger'
                                        onClick={openDeleteUserModal}
                                    />
                                </SettingsCard>
                            </div>
                        </section>
                    )}
                    <form
                        onSubmit={
                            isEdit ? (e) => e.preventDefault() : handleSubmit(onSubmit)
                        }
                    >
                        {/* Account Section */}
                        <section
                            id='account'
                            className={`pb-8 ${isEdit && isAdminAndNotOwn ? 'pt-5' : ''}`}
                        >
                            <h2 className='text-lg text-foreground tracking-tight'>
                                Account
                            </h2>
                            <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                Basic account details and credentials
                            </p>

                            <div className='space-y-4'>
                                {/* Alert */}
                                {alert.show && (
                                    <div className='pt-4'>
                                        <AlertComponent variant={alert.color === 'red' || alert.color === 'error' ? 'destructive' : 'default'}>
                                            <WarningCircle />
                                            <AlertDescription>{alert.message}</AlertDescription>
                                        </AlertComponent>
                                    </div>
                                )}

                                {/* Basic Information Card */}
                                <SettingsCard>
                                    <SettingsField
                                        label='Username'
                                        description='Your display name across the platform'
                                        placeholder='Username'
                                        {...register('username')}
                                        error={errors.username}
                                        disabled={!isAdminAndNotOwn && isEdit}
                                    />

                                    <Separator />

                                    <SettingsField
                                        label='Email'
                                        description='Used for login and notifications'
                                        type='text'
                                        placeholder='Email'
                                        {...register('email')}
                                        error={errors.email}
                                        disabled={!isAdminAndNotOwn && isEdit}
                                    />

                                    <Separator />

                                    <SettingsField
                                        label='User ID'
                                        description='Unique identifier for API integrations'
                                    >
                                        <Input
                                            type='text'
                                            value={profile?.id || ''}
                                            className='opacity-60'
                                            disabled
                                            readOnly
                                        />
                                    </SettingsField>

                                    <Separator />

                                    <SettingsField
                                        label='Role'
                                        description='Determines your access permissions'
                                    >
                                        <Input
                                            type='text'
                                            value={profile?.role || ''}
                                            className='opacity-60'
                                            disabled
                                            readOnly
                                        />
                                    </SettingsField>
                                </SettingsCard>

                                {!isEdit && (
                                    <SettingsCard>
                                        <SettingsField
                                            label='Password'
                                            description='Minimum 8 characters recommended'
                                            type='password'
                                            placeholder='Password'
                                            {...register('password')}
                                            error={errors.password}
                                        />
                                    </SettingsCard>
                                )}

                                {isAdmin() && (!isEdit || isAdminAndNotOwn) && (
                                    <section
                                        id='interface'
                                        className='border-t border-white/5 pt-5'
                                    >
                                        <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                                            Administrative
                                        </h2>
                                        <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                            Manage user permissions and settings
                                        </p>

                                        {/* Administrative Settings Card */}
                                        <SettingsCard>
                                            <SettingsSelect
                                                label='Role'
                                                description='Controls feature access level'
                                                {...register('role')}
                                            >
                                                <option value='author'>User</option>
                                                <option value='entrymanager'>
                                                    Entry Manager
                                                </option>
                                                <option value='admin'>Admin</option>
                                            </SettingsSelect>

                                            <Separator />

                                            <div className='py-2'>
                                                <div className='flex items-center justify-between gap-4'>
                                                    <div className='flex-1'>
                                                        <Label htmlFor='emailConfirmed' className='text-sm text-muted-foreground block mb-0.5'>
                                                            Email Confirmed
                                                        </Label>
                                                        <p className='text-sm text-muted-foreground'>User's email confirmation status</p>
                                                    </div>
                                                    <Controller
                                                        name='emailConfirmed'
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Switch
                                                                id='emailConfirmed'
                                                                name={field.name}
                                                                data-testid='emailConfirmed-toggle'
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            <Separator />

                                            <div className='py-2'>
                                                <div className='flex items-center justify-between gap-4'>
                                                    <div className='flex-1'>
                                                        <Label htmlFor='isActive' className='text-sm text-muted-foreground block mb-0.5'>
                                                            Active
                                                        </Label>
                                                        <p className='text-sm text-muted-foreground'>Disabled accounts cannot log in</p>
                                                    </div>
                                                    <Controller
                                                        name='isActive'
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Switch
                                                                id='isActive'
                                                                name={field.name}
                                                                data-testid='isActive-toggle'
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            {isAdminAndNotOwn && (
                                                <>
                                                    <Separator />
                                                    <SettingsField
                                                        label='Password'
                                                        description='Set a new password for this user'
                                                        type='password'
                                                        placeholder='Password'
                                                        inputWidth='w-48'
                                                        {...register('password')}
                                                    />
                                                </>
                                            )}
                                        </SettingsCard>
                                    </section>
                                )}
                            </div>
                        </section>

                        {(isOwnAccount || twoFactorEnabled || isOwnAccount) && (
                            <section
                                id='security'
                                className='border-t border-white/5 pt-5 pb-8'
                            >
                                <h2 className='text-lg text-foreground tracking-tight'>
                                    Security
                                </h2>
                                <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                    Authentication, API keys, and account security
                                </p>

                                <div className='space-y-4'>
                                    {/* Authentication Card */}
                                    <SettingsCard>
                                        {isOwnAccount && (
                                            <>
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
                                            </>
                                        )}

                                        {(twoFactorEnabled || isOwnAccount) && (
                                            <>
                                                {isOwnAccount && <Separator />}
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
                                                        variant={twoFactorEnabled ? 'destructive' : 'outline'}
                                                        size='sm'
                                                        onClick={openTwoFactorModal}
                                                    >
                                                        {twoFactorEnabled ? 'Disable' : 'Enable'}
                                                    </Button>
                                                </div>
                                            </>
                                        )}

                                        {isOwnAccount && (
                                            <>
                                                <Separator />
                                                <SettingsButton
                                                    label='Delete Account'
                                                    description='Permanently remove account and data'
                                                    buttonText='Delete'
                                                    variant='danger'
                                                    onClick={openDeleteAccountModal}
                                                />
                                            </>
                                        )}
                                    </SettingsCard>

                                    {/* Session Management - Only visible when viewing own account */}
                                    {isOwnAccount && isEdit && (
                                        <>
                                            <div className='mb-3'>
                                                <h3 className='text-sm font-medium text-muted-foreground'>
                                                    Active Sessions
                                                </h3>
                                            </div>
                                            <SettingsCard>
                                                <ActiveSessions userId={target} />
                                            </SettingsCard>
                                        </>
                                    )}
                                </div>
                            </section>
                        )}

                        {isOwnAccount && Object.keys(mergedOAuthConnections).length > 0 && (
                            <section
                                id='oauth'
                                className='border-t border-white/5 pt-5 pb-8'
                            >
                                <h2 className='text-lg cradle-text-primary tracking-tight'>
                                    OAuth Connections
                                </h2>
                                <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                    Link or unlink external identity providers
                                </p>

                                <div className='space-y-4'>
                                    <SettingsCard>
                                        {Object.entries(mergedOAuthConnections).map(
                                            ([provider, connected], index, all) => {
                                                const method = oauthMethods.find(
                                                    (item) =>
                                                        getOAuthKey(item) === provider,
                                                );
                                                const label = method
                                                    ? getOAuthLabel(method)
                                                    : provider;
                                                return (
                                                    <div key={provider}>
                                                        <div className='flex items-center justify-between py-2'>
                                                            <div>
                                                                <span className='text-sm cradle-text-tertiary block mb-0.5'>
                                                                    {label}
                                                                </span>
                                                                <span className='text-sm cradle-text-muted'>
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
                                                                    if (connected) {
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
                                                        {index < all.length - 1 && (
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

                        {/* Interface Section */}
                        <section
                            id='interface'
                            className='border-t border-white/5 pt-5 pb-8'
                        >
                            <h2 className='text-lg text-foreground tracking-tight'>
                                Interface
                            </h2>
                            <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                Customize your editing and viewing experience
                            </p>

                            <div className='space-y-4'>
                                {/* Appearance Card */}
                                <SettingsCard>
                                    <div className='flex items-center justify-between gap-4 py-2'>
                                        <div className='flex-1'>
                                            <label className='text-sm text-muted-foreground block mb-0.5'>
                                                Theme
                                            </label>
                                            <p className='text-sm text-muted-foreground'>
                                                Choose your preferred color scheme
                                            </p>
                                        </div>
                                        <Button
                                            type='button'
                                            variant='ghost'
                                            size='icon'
                                            onClick={() => setValue('theme', watch('theme') === 'dark' ? 'light' : 'dark')}
                                            className='bg-accent text-accent-foreground hover:bg-accent/80'
                                        >
                                            {watch('theme') === 'dark' ? (
                                                <SunLight className='w-5 h-5' />
                                            ) : (
                                                <HalfMoon className='w-5 h-5' />
                                            )}
                                        </Button>
                                    </div>

                                    <Separator />

                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <Label htmlFor={vimModeId} className='text-sm text-muted-foreground block mb-0.5'>
                                                    Vim Mode
                                                </Label>
                                                <p className='text-sm text-muted-foreground'>Use Vim keybindings in the markdown editor</p>
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
                                                        onCheckedChange={field.onChange}
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
                            </div>
                        </section>

                        {/* Save Button - Only for new user creation */}
                        {!isEdit && (
                            <div className='border-t border-white/5 pt-5 flex justify-end'>
                                <Button
                                    type='submit'
                                    variant='default'
                                    size='default'
                                    disabled={!isDirty}
                                >
                                    Create User
                                </Button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
