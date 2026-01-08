import ApiKeyGenerateModal from '@/components/modals/auth/ApiKeyGenerateModal';
import ChangePasswordModal from '@/components/modals/auth/ChangePasswordModal';
import TwoFactorSetupModal from '@/components/modals/auth/TwoFactorSetupModal';
import ActionConfirmationModal from '@/components/modals/base/ActionConfirmationModal';
import ConfirmDeletionModal from '@/components/modals/base/ConfirmDeletionModal';
import MarkdownEditorModal from '@/components/modals/notes/MarkdownEditorModal';
import { useModal } from '@/contexts/ui/ModalContext';
import { useNotif } from '@/contexts/ui/NotificationContext';
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
import AlertBox from '@components/base/Alert/AlertBox';
import SnippetList, { SnippetListRef } from '@components/base/SnippetList/SnippetList';
import {
    SettingsButton,
    SettingsCard,
    SettingsField,
    SettingsSelect,
    SettingsSeparator,
    SettingsToggle,
} from '@components/forms';
import { yupResolver } from '@hookform/resolvers/yup';
import bytes from 'bytes';
import { HalfMoon, SunLight } from 'iconoir-react';
import { debounce } from 'lodash'; // Import lodash debounce
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
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
    const { usersApi } = useApi();
    const auth = useAuth();
    const { execute } = useAPICall();
    const { profile, setProfile, isAdmin } = useProfile();
    const { setModal } = useModal();
    const { notify } = useNotif();
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [user, setUser] = useState<UserRetrieve | null>(null);
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

            notify({
                type: 'success',
                text: 'User created successfully',
            });
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
                notify({
                    type: 'success',
                    text: twoFactorEnabled
                        ? 'Two-Factor Auth has been disabled.'
                        : 'Two-Factor Auth has been enabled.',
                });
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

    const openLogoutConfirmationModal = () => {
        setModal(ActionConfirmationModal, {
            onConfirm: () => auth.logOut(),
            text: 'Are you sure you want to log out? You will need to sign in again to access your account.',
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

                        notify({
                            type: 'success',
                            text: 'Default note template updated successfully!',
                        });
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
        notify({
            type: 'success',
            text: 'User deleted successfully',
        });
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
        <div className='w-full h-full overflow-auto'>
            {/* Page Header */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        {isEdit ? 'Settings' : 'Add New User'}
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
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
                            <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                                User Management
                            </h2>
                            <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
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

                                    <SettingsSeparator />

                                    <SettingsButton
                                        label='Email Confirmation'
                                        description='Send email verification to user'
                                        buttonText='Send Email'
                                        onClick={sendEmailConfirmation}
                                    />

                                    <SettingsSeparator />

                                    <SettingsButton
                                        label='Password Reset'
                                        description='Send password reset email'
                                        buttonText='Send Reset'
                                        onClick={sendPasswordResetEmail}
                                    />

                                    <SettingsSeparator />

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
                            <h2 className='text-lg cradle-text-primary tracking-tight'>
                                Account
                            </h2>
                            <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                Basic account details and credentials
                            </p>

                            <div className='space-y-4'>
                                {/* Alert */}
                                {alert.show && (
                                    <div className='pt-4'>
                                        <AlertBox alert={alert} />
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

                                    <SettingsSeparator />

                                    <SettingsField
                                        label='Email'
                                        description='Used for login and notifications'
                                        type='text'
                                        placeholder='Email'
                                        {...register('email')}
                                        error={errors.email}
                                        disabled={!isAdminAndNotOwn && isEdit}
                                    />

                                    <SettingsSeparator />

                                    <SettingsField
                                        label='User ID'
                                        description='Unique identifier for API integrations'
                                    >
                                        <input
                                            type='text'
                                            value={profile?.id || ''}
                                            className='cradle-input inline-block text-sm h-8 rounded-full opacity-60'
                                            style={{ width: 'auto' }}
                                            disabled
                                            readOnly
                                        />
                                    </SettingsField>

                                    <SettingsSeparator />

                                    <SettingsField
                                        label='Role'
                                        description='Determines your access permissions'
                                    >
                                        <input
                                            type='text'
                                            value={profile?.role || ''}
                                            className='cradle-input inline-block text-sm h-8 rounded-full opacity-60'
                                            style={{ width: 'auto' }}
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
                                        <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                                            Administrative
                                        </h2>
                                        <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
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

                                            <SettingsSeparator />

                                            <SettingsToggle
                                                label='Email Confirmed'
                                                description="User's email confirmation status"
                                                id='emailConfirmed'
                                                data-testid='emailConfirmed-toggle'
                                                {...register('emailConfirmed')}
                                                watch={watch}
                                            />

                                            <SettingsSeparator />

                                            <SettingsToggle
                                                label='Active'
                                                description='Disabled accounts cannot log in'
                                                id='isActive'
                                                data-testid='isActive-toggle'
                                                {...register('isActive')}
                                                watch={watch}
                                            />

                                            {isAdminAndNotOwn && (
                                                <>
                                                    <SettingsSeparator />
                                                    <SettingsField
                                                        label='Upload Limit'
                                                        description='Maximum file size allowed for uploads (leave empty to use global default)'
                                                        placeholder='e.g. 100MB, 1GB'
                                                        inputWidth='w-48'
                                                        {...register('fileUploadLimitOverride')}
                                                        error={errors.fileUploadLimitOverride}
                                                    />
                                                    <SettingsSeparator />
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
                                <h2 className='text-lg cradle-text-primary tracking-tight'>
                                    Security
                                </h2>
                                <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
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

                                                <SettingsSeparator />

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
                                                {isOwnAccount && <SettingsSeparator />}
                                                <div className='flex items-center justify-between py-2'>
                                                    <div>
                                                        <span className='text-sm cradle-text-tertiary block mb-0.5'>
                                                            Two-Factor Auth
                                                        </span>
                                                        <span className='text-sm cradle-text-muted'>
                                                            Protect your account with
                                                            one-time codes from an
                                                            authenticator app
                                                        </span>
                                                    </div>
                                                    <button
                                                        type='button'
                                                        className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${twoFactorEnabled
                                                            ? 'border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/10 bg-transparent'
                                                            : 'border-cradle-border-accent bg-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary text-cradle-text-secondary'
                                                            }`}
                                                        onClick={openTwoFactorModal}
                                                    >
                                                        <span>
                                                            {twoFactorEnabled
                                                                ? 'Disable'
                                                                : 'Enable'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {isOwnAccount && (
                                            <>
                                                <SettingsSeparator />
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
                                                <h3 className='text-sm font-medium cradle-text-tertiary'>
                                                    Active Sessions
                                                </h3>
                                            </div>
                                            <SettingsCard>
                                                <ActiveSessions userId={target} />
                                            </SettingsCard>

                                            <SettingsCard>
                                                <SettingsButton
                                                    label='Logout'
                                                    description='Sign out of your account'
                                                    buttonText='Logout'
                                                    variant='danger'
                                                    onClick={
                                                        openLogoutConfirmationModal
                                                    }
                                                />
                                            </SettingsCard>
                                        </>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Interface Section */}
                        <section
                            id='interface'
                            className='border-t border-white/5 pt-5 pb-8'
                        >
                            <h2 className='text-lg cradle-text-primary tracking-tight'>
                                Interface
                            </h2>
                            <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                Customize your editing and viewing experience
                            </p>

                            <div className='space-y-4'>
                                {/* Appearance Card */}
                                <SettingsCard>
                                    <div className='flex items-center justify-between gap-4 py-2'>
                                        <div className='flex-1'>
                                            <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                                Theme
                                            </label>
                                            <p className='text-sm cradle-text-muted'>
                                                Choose your preferred color scheme
                                            </p>
                                        </div>
                                        <button
                                            type='button'
                                            onClick={() =>
                                                setValue(
                                                    'theme',
                                                    watch('theme') === 'dark'
                                                        ? 'light'
                                                        : 'dark',
                                                )
                                            }
                                            className='p-2 rounded-full transition-colors bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                                        >
                                            {watch('theme') === 'dark' ? (
                                                <SunLight className='w-5 h-5' />
                                            ) : (
                                                <HalfMoon className='w-5 h-5' />
                                            )}
                                        </button>
                                    </div>

                                    <SettingsSeparator />

                                    <SettingsToggle
                                        label='Vim Mode'
                                        description='Use Vim keybindings in the markdown editor'
                                        id={vimModeId}
                                        data-testid='vim-toggle'
                                        {...register('vimMode')}
                                        watch={watch}
                                    />

                                    <SettingsSeparator />

                                    <SettingsButton
                                        label='Note Template'
                                        description='Preset structure for new notes you create'
                                        buttonText='Edit'
                                        onClick={openNoteTemplateModal}
                                        disabled={noteTemplateLoading}
                                        loading={noteTemplateLoading}
                                    />

                                    <SettingsSeparator />

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
                                <button
                                    type='submit'
                                    className='cradle-btn cradle-btn-primary px-6 rounded-lg'
                                    disabled={!isDirty}
                                >
                                    Create User
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
