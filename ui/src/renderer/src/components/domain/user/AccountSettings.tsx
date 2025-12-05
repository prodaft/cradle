import vimIcon from '@/assets/vim32x32.gif';
import { useModal } from '@/contexts/ui/ModalContext';
import { useNotif } from '@/contexts/ui/NotificationContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import useAuth from '@/hooks/auth/useAuth';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { UserCreateRequestThemeEnum, UserRetrieve } from '@/services/cradle/models';
import { displayError } from '@/utils/api';
import AlertBox from '@components/base/Alert/AlertBox';
import SnippetList from '@components/base/SnippetList/SnippetList';
import ApiKeyGenerateModal from '@components/modals/auth/ApiKeyGenerateModal';
import ChangePasswordModal from '@components/modals/auth/ChangePasswordModal';
import TwoFactorSetupModal from '@components/modals/auth/TwoFactorSetupModal';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import MarkdownEditorModal from '@components/modals/notes/MarkdownEditorModal';
import { yupResolver } from '@hookform/resolvers/yup';
import { Edit, SunLight, HalfMoon } from 'iconoir-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';

interface AccountFormData {
    id: string;
    username: string;
    email: string;
    password: string;
    catalystKey: string;
    role: string;
    vim_mode: boolean;
    vimMode?: boolean;
    theme?: UserCreateRequestThemeEnum;
    email_confirmed: boolean;
    is_active: boolean;
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
    catalystKey: Yup.string(),
    role: Yup.string().when('$isAdminAndNotOwn', {
        is: true,
        then: () => Yup.string().required('Role is required'),
        otherwise: () => Yup.string(),
    }),
    email_confirmed: Yup.boolean(),
    is_active: Yup.boolean(),
    vim_mode: Yup.boolean(),
    vimMode: Yup.boolean().notRequired(),
    theme: Yup.string().notRequired(),
}) as Yup.ObjectSchema<AccountFormData>;

export default function AccountSettings({
    target = 'me',
    isEdit = true,
    onAdd,
}: AccountSettingsProps) {
    const { navigate, navigateLink } = useCradleNavigate();
    const { usersApi } = useApi();
    const auth = useAuth();
    const { profile, setProfile, isAdmin } = useProfile();
    const { notify } = useNotif();
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [user, setUser] = useState<UserRetrieve | null>(null);
    const isOwnAccount = isEdit ? target === 'me' || profile?.id === target : false;
    const isAdminAndNotOwn = isAdmin() && !isOwnAccount;
    const { setModal } = useModal();
    const vimModeId = useId();

    const defaultValues: AccountFormData = isEdit
        ? {
              id: '',
              username: '',
              email: '',
              password: 'password',
              catalystKey: 'apikey',
              role: 'user',
              vim_mode: false,
              email_confirmed: false,
              is_active: false,
          }
        : {
              id: '',
              username: '',
              email: '',
              password: '',
              catalystKey: '',
              role: 'user',
              vim_mode: false,
              email_confirmed: false,
              is_active: false,
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

    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialLoad = useRef(true);
    const previousValuesRef = useRef<Partial<AccountFormData> | null>(null);

    // Prepopulate form in edit mode.
    useEffect(() => {
        if (isEdit && target) {
            usersApi
                .usersRetrieve({ userId: target })
                .then((user) => {
                    setUser(user);
                    reset({
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        password: 'password',
                        vimMode: user.vimMode || false,
                        theme: user.theme || 'dark',
                        catalystKey: user.catalystApiKey ? 'apikey' : '',
                        role: user.role || 'user',
                        email_confirmed: user.emailConfirmed || false,
                        is_active: user.isActive || false,
                        vim_mode: user.vimMode || false,
                    });
                    setTwoFactorEnabled(user.twoFactorEnabled || false);
                    // Store initial values for comparison
                    previousValuesRef.current = {
                        username: user.username,
                        email: user.email,
                        password: 'password',
                        catalystKey: user.catalystApiKey ? 'apikey' : '',
                        vimMode: user.vimMode || false,
                        theme: user.theme || 'dark',
                        role: user.role || 'user',
                        email_confirmed: user.emailConfirmed || false,
                        is_active: user.isActive || false,
                    };
                    // Mark initial load as complete after a short delay
                    setTimeout(() => {
                        isInitialLoad.current = false;
                    }, 1000);
                })
                .catch(displayError(setAlert, navigate));
        } else {
            reset(defaultValues);
            isInitialLoad.current = false;
        }
    }, [isEdit, target, reset, navigate, usersApi]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, []);

    const onSubmit = async (data: AccountFormData) => {
        if (isEdit) {
            const payload: any = {};
            if (data.password !== 'password') {
                payload.password = data.password;
            }
            if (data.catalystKey !== 'apikey') {
                payload.catalyst_api_key = data.catalystKey;
            }
            payload.vim_mode = data.vimMode;
            payload.theme = data.theme;
            if (isAdminAndNotOwn) {
                payload.username = data.username;
                payload.email = data.email;
                payload.email_confirmed = data.email_confirmed;
                payload.is_active = data.is_active;
                payload.role = data.role;
            }
            try {
                const updatedUser = await usersApi.usersUpdate({
                    userId: data.id,
                    userUpdateRequest: payload,
                });

                if (isOwnAccount) {
                    setProfile((prevProfile: any) => ({
                        ...prevProfile,
                        ...updatedUser,
                    }));
                }

                notify({
                    type: 'success',
                    text: 'User updated successfully',
                });
            } catch (err) {
                displayError(setAlert, navigate)(err);
            }
        } else {
            const payload = {
                username: data.username,
                email: data.email,
                password: data.password,
                catalyst_api_key: data.catalystKey,
                role: data.role,
                email_confirmed: data.email_confirmed,
                is_active: data.is_active,
                vim_mode: data.vimMode,
                theme: data.theme,
            };
            try {
                const newUser = await usersApi.usersCreate({
                    userCreateRequest: payload,
                });

                notify({
                    type: 'success',
                    text: 'User created successfully',
                });
                reset();
                if (onAdd) onAdd(newUser);
            } catch (err) {
                displayError(setAlert, navigate)(err);
            }
        }
    };

    const autoSave = async (data: AccountFormData, previousData: Partial<AccountFormData> | null) => {
        if (!isEdit || !data.id) return;

        // Check if any relevant field actually changed
        const hasChanges = 
            (isAdminAndNotOwn && (
                data.username !== previousData?.username ||
                data.email !== previousData?.email ||
                data.role !== previousData?.role ||
                data.email_confirmed !== previousData?.email_confirmed ||
                data.is_active !== previousData?.is_active
            )) ||
            (data.password !== 'password' && data.password !== previousData?.password) ||
            (data.catalystKey !== 'apikey' && data.catalystKey !== previousData?.catalystKey) ||
            data.vimMode !== previousData?.vimMode ||
            data.theme !== previousData?.theme;

        if (!hasChanges) return;

        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Debounce auto-save by 500ms
        autoSaveTimeoutRef.current = setTimeout(async () => {
            const payload: any = {};
            if (data.password !== 'password' && data.password !== previousData?.password) {
                payload.password = data.password;
            }
            if (data.catalystKey !== 'apikey' && data.catalystKey !== previousData?.catalystKey) {
                payload.catalyst_api_key = data.catalystKey;
            }
            if (data.vimMode !== previousData?.vimMode) {
                payload.vim_mode = data.vimMode;
            }
            if (data.theme !== previousData?.theme) {
                payload.theme = data.theme;
            }
            if (isAdminAndNotOwn) {
                if (data.username !== previousData?.username) payload.username = data.username;
                if (data.email !== previousData?.email) payload.email = data.email;
                if (data.email_confirmed !== previousData?.email_confirmed) payload.email_confirmed = data.email_confirmed;
                if (data.is_active !== previousData?.is_active) payload.is_active = data.is_active;
                if (data.role !== previousData?.role) payload.role = data.role;
            }

            // Only save if there are actual changes in payload
            if (Object.keys(payload).length === 0) return;

            try {
                const updatedUser = await usersApi.usersUpdate({
                    userId: data.id,
                    userUpdateRequest: payload,
                });

                if (isOwnAccount) {
                    setProfile((prevProfile: any) => ({
                        ...prevProfile,
                        ...updatedUser,
                    }));
                }

                // Update previous values after successful save
                previousValuesRef.current = {
                    username: data.username,
                    email: data.email,
                    password: data.password,
                    catalystKey: data.catalystKey,
                    vimMode: data.vimMode,
                    theme: data.theme,
                    role: data.role,
                    email_confirmed: data.email_confirmed,
                    is_active: data.is_active,
                };
            } catch (err) {
                displayError(setAlert, navigate)(err);
            }
        }, 500);
    };

    // Watch for form changes and auto-save
    const watchedValues = watch(['username', 'email', 'password', 'catalystKey', 'vimMode', 'theme', 'role', 'email_confirmed', 'is_active']);
    useEffect(() => {
        if (isEdit && getValues('id') && !isInitialLoad.current) {
            const currentValues = getValues();
            autoSave(currentValues, previousValuesRef.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [watchedValues, isEdit]);

    const handleDelete = async () => {
        try {
            await usersApi.usersDestroy({ userId: getValues('id') });
            auth.logOut();
        } catch (err) {
            displayError(setAlert)(err);
        }
    };

    const handleGenerateApiKey = () => {
        setModal(ApiKeyGenerateModal, {
            userId: getValues('id'),
        });
    };

    const handleChangePassword = () => {
        setModal(ChangePasswordModal, {
            onSuccess: () => {
                notify({
                    type: 'success',
                    text: 'Password changed successfully!',
                });
            },
        });
    };

    const editDefaultNoteTemplate = async () => {
        try {
            const defaultNoteResponse = await usersApi.usersDefaultNoteTemplateRetrieve(
                {
                    userId: target,
                },
            );

            setModal(MarkdownEditorModal, {
                title: 'Edit Default Note Template',
                initialContent: defaultNoteResponse.template || '',
                onConfirm: (content: string) => {
                    if (isOwnAccount) {
                        setProfile((prevProfile: any) => ({
                            ...prevProfile,
                            defaultNoteTemplate: content,
                        }));
                    }

                    usersApi
                        .usersDefaultNoteTemplateCreate({
                            userId: target,
                            defaultNoteTemplateRequest: { template: content },
                        })
                        .then(() => {
                            notify({
                                type: 'success',
                                text: 'Default note template updated successfully!',
                            });
                        })
                        .catch((err) => {
                            displayError(setAlert)(err);
                        });
                },
                titleEditable: false,
            });
        } catch (err) {
            displayError(setAlert)(err);
        }
    };

    const handle2FASetup = () => {
        if (twoFactorEnabled) {
            if (isOwnAccount) {
                // Show modal to disable 2FA
                setModal(TwoFactorSetupModal, {
                    isDisabling: true,
                    onSuccess: () => {
                        setTwoFactorEnabled(false);
                        notify({
                            type: 'success',
                            text: '2FA has been successfully disabled for your account',
                        });
                    },
                });
            } else if (user) {
                // Admin disabling 2FA for another user
                usersApi.usersUpdate({
                    userId: target,
                    userUpdateRequest: {
                        username: user.username,
                        email: user.email,
                        twoFactorEnabled: false,
                    },
                });
                setTwoFactorEnabled(false);
                notify({
                    type: 'success',
                    text: '2FA has been successfully disabled for the selected account!',
                });
            }
        } else {
            // Show modal to enable 2FA
            setModal(TwoFactorSetupModal, {
                isDisabling: false,
                onSuccess: () => {
                    setTwoFactorEnabled(true);
                    notify({
                        type: 'success',
                        text: '2FA has been successfully enabled for your account',
                    });
                },
            });
        }
    };


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
                            ? 'Manage your account preferences and security'
                            : 'Create a new user account'}
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='max-w-4xl mx-auto'>
                        <form onSubmit={isEdit ? (e) => e.preventDefault() : handleSubmit(onSubmit)}>
                            {/* Account Section */}
                            <section
                                id='account'
                                className='pb-8'
                            >
                                <h2 className='text-lg font-semibold cradle-text-primary cradle-mono'>
                                    Account
                                </h2>
                                <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                    Basic account details and credentials
                                </p>

                                <div className='space-y-4'>
                                    {/* Basic Information Card */}
                                    <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-0'>
                                        <div className='flex items-center justify-between gap-4 py-2'>
                                            <div className='flex-1'>
                                                <label className='cradle-label cradle-text-tertiary text-sm block mb-1'>
                                                    Username
                                                </label>
                                                <p className='text-sm cradle-text-muted'>Your display name across the platform</p>
                                                {errors.username && (
                                                    <p className='text-sm text-red-500 mt-1'>{errors.username.message}</p>
                                                )}
                                            </div>
                                            <div className='w-64'>
                                                <input
                                                    type='text'
                                                    placeholder='Username'
                                                    className='cradle-input w-full text-sm h-10'
                                                    {...register('username')}
                                                    disabled={!isAdminAndNotOwn && isEdit}
                                                />
                                            </div>
                                        </div>

                                        <div className='cradle-separator'></div>

                                        <div className='flex items-center justify-between gap-4 py-2'>
                                            <div className='flex-1'>
                                                <label className='cradle-label cradle-text-tertiary text-sm block mb-1'>
                                                    Email
                                                </label>
                                                <p className='text-sm cradle-text-muted'>Used for login and notifications</p>
                                                {errors.email && (
                                                    <p className='text-sm text-red-500 mt-1'>{errors.email.message}</p>
                                                )}
                                            </div>
                                            <div className='w-72'>
                                                <input
                                                    type='text'
                                                    placeholder='Email'
                                                    className='cradle-input w-full text-sm h-10'
                                                    {...register('email')}
                                                    disabled={!isAdminAndNotOwn && isEdit}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Read-Only Information Card */}
                                    <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-0'>
                                        <div className='flex items-center justify-between gap-4 py-2'>
                                            <div className='flex-1'>
                                                <label className='cradle-label cradle-text-tertiary text-sm block mb-1'>
                                                    User ID
                                                </label>
                                                <p className='text-sm cradle-text-muted'>Unique identifier for API integrations</p>
                                            </div>
                                            <div className='w-72'>
                                                <input
                                                    type='text'
                                                    value={profile?.id || ''}
                                                    className='cradle-input w-full text-sm h-10 opacity-60'
                                                    disabled
                                                    readOnly
                                                />
                                            </div>
                                        </div>

                                        <div className='cradle-separator'></div>

                                        <div className='flex items-center justify-between gap-4 py-2'>
                                            <div className='flex-1'>
                                                <label className='cradle-label cradle-text-tertiary text-sm block mb-1'>
                                                    Role
                                                </label>
                                                <p className='text-sm cradle-text-muted'>Determines your access permissions</p>
                                            </div>
                                            <div className='w-32'>
                                                <input
                                                    type='text'
                                                    value={profile?.role || ''}
                                                    className='cradle-input w-full text-sm h-10 opacity-60'
                                                    disabled
                                                    readOnly
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {!isEdit && (
                                        <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] p-4'>
                                            <div className='flex items-center justify-between gap-4'>
                                                <div className='flex-1'>
                                                    <label className='cradle-label cradle-text-tertiary text-sm block mb-1'>
                                                        Password
                                                    </label>
                                                    <p className='text-sm cradle-text-muted'>Minimum 8 characters recommended</p>
                                                    {errors.password && (
                                                        <p className='text-sm text-red-500 mt-1'>{errors.password.message}</p>
                                                    )}
                                                </div>
                                                <div className='w-48'>
                                                    <input
                                                        type='password'
                                                        placeholder='Password'
                                                        className='cradle-input w-full text-sm h-10'
                                                        {...register('password')}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {isAdmin() && (!isEdit || isAdminAndNotOwn) && (
                                        <>
                                            {/* Administrative Settings Card */}
                                            <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-0'>
                                                <h3 className='text-base font-semibold cradle-text-secondary cradle-mono mb-2'>
                                                    Administrative
                                                </h3>

                                                <div className='flex items-center justify-between gap-4 py-2'>
                                                    <div className='flex-1'>
                                                        <label className='cradle-label cradle-text-tertiary text-sm block mb-1'>
                                                            Role
                                                        </label>
                                                        <p className='text-sm cradle-text-muted'>Controls feature access level</p>
                                                    </div>
                                                    <div className='w-40'>
                                                        <select
                                                            className='cradle-input w-full text-sm h-10'
                                                            {...register('role')}
                                                        >
                                                            <option value='author'>User</option>
                                                            <option value='entrymanager'>Entry Manager</option>
                                                            <option value='admin'>Admin</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className='cradle-separator'></div>

                                                <div>
                                                    <label className='flex items-center gap-2 cursor-pointer py-2'>
                                                        <input
                                                            type='checkbox'
                                                            className='switch switch-ghost-primary'
                                                            {...register('email_confirmed')}
                                                        />
                                                        <div>
                                                            <span className='text-sm cradle-text-tertiary block'>Email Confirmed</span>
                                                            <span className='text-sm cradle-text-muted'>Allow login without email verification</span>
                                                        </div>
                                                    </label>
                                                    <div className='cradle-separator'></div>
                                                    <label className='flex items-center gap-2 cursor-pointer py-2'>
                                                        <input
                                                            type='checkbox'
                                                            className='switch switch-ghost-primary'
                                                            {...register('is_active')}
                                                        />
                                                        <div>
                                                            <span className='text-sm cradle-text-tertiary block'>Active</span>
                                                            <span className='text-sm cradle-text-muted'>Disabled accounts cannot log in</span>
                                                        </div>
                                                    </label>
                                                </div>

                                                {isAdminAndNotOwn && (
                                                    <>
                                                        <div className='cradle-separator'></div>
                                                        <div className='flex items-center justify-between gap-4 py-2'>
                                                            <div className='flex-1'>
                                                                <label className='cradle-label cradle-text-tertiary text-sm block mb-1'>
                                                                    Password
                                                                </label>
                                                                <p className='text-sm cradle-text-muted'>Set a new password for this user</p>
                                                            </div>
                                                            <div className='w-48'>
                                                                <input
                                                                    type='password'
                                                                    placeholder='Password'
                                                                    className='cradle-input w-full text-sm h-10'
                                                                    {...register('password')}
                                                                />
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </section>

                            {/* Security Section */}
                            <section
                                id='security'
                                className='border-t border-white/5 pt-8 pb-8'
                            >
                                <h2 className='text-lg font-semibold cradle-text-primary cradle-mono'>
                                    Security
                                </h2>
                                <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                    Authentication, API keys, and account security
                                </p>

                                <div className='space-y-4'>
                                    {/* Authentication Card */}
                                    {(isOwnAccount || (twoFactorEnabled || isOwnAccount)) && (
                                        <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-0'>
                                            {isOwnAccount && (
                                                <>
                                                    <div className='flex items-center justify-between py-2'>
                                                        <div>
                                                            <span className='text-base cradle-text-primary block'>Password</span>
                                                            <span className='text-sm cradle-text-muted'>Change your account password</span>
                                                        </div>
                                                        <button
                                                            type='button'
                                                            className='cradle-btn cradle-btn-ghost text-sm px-3 py-1.5'
                                                            onClick={handleChangePassword}
                                                        >
                                                            Change
                                                        </button>
                                                    </div>

                                                    <div className='cradle-separator'></div>

                                                    <div className='flex items-center justify-between py-2'>
                                                        <div>
                                                            <span className='text-base cradle-text-primary block'>API Key</span>
                                                            <span className='text-sm cradle-text-muted'>Generate key for programmatic access</span>
                                                        </div>
                                                        <button
                                                            type='button'
                                                            className='cradle-btn cradle-btn-ghost text-sm px-3 py-1.5'
                                                            onClick={handleGenerateApiKey}
                                                        >
                                                            Generate
                                                        </button>
                                                    </div>
                                                </>
                                            )}

                                            {(twoFactorEnabled || isOwnAccount) && (
                                                <>
                                                    {isOwnAccount && <div className='cradle-separator'></div>}
                                                    <div className='flex items-center justify-between py-2'>
                                                        <div>
                                                            <span className='text-base cradle-text-primary block'>Two-Factor Auth</span>
                                                            <span className='text-sm cradle-text-muted'>
                                                                {twoFactorEnabled ? 'Currently enabled' : 'Add extra security layer'}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type='button'
                                                            className={`text-sm px-3 py-1.5 rounded ${twoFactorEnabled ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'cradle-btn cradle-btn-ghost'}`}
                                                            onClick={handle2FASetup}
                                                        >
                                                            {twoFactorEnabled ? 'Disable' : 'Enable'}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* API Integration Card */}
                                    <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] p-4'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <label className='cradle-label cradle-text-tertiary text-sm block mb-1'>
                                                    Catalyst API Key
                                                </label>
                                                <p className='text-sm cradle-text-muted'>
                                                    Enables threat intelligence enrichment from PRODAFT Catalyst
                                                </p>
                                            </div>
                                            <div className='w-72'>
                                                <input
                                                    type='password'
                                                    placeholder='Enter API key'
                                                    className='cradle-input w-full text-sm h-10'
                                                    {...register('catalystKey')}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {isOwnAccount && (
                                        <>
                                            {/* Danger Zone Card */}
                                            <div className='rounded-lg border border-red-500/20 bg-red-500/[0.02] p-4'>
                                                <div className='flex items-center justify-between'>
                                                    <div>
                                                        <span className='text-base text-red-400 block'>Delete Account</span>
                                                        <span className='text-sm cradle-text-muted'>Permanently remove account and data</span>
                                                    </div>
                                                    <button
                                                        type='button'
                                                        className='text-sm px-3 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                                        onClick={() =>
                                                            setModal(ConfirmDeletionModal, {
                                                                text: 'Are you sure you want to delete your account? All data related to you will be deleted.',
                                                                onConfirm: handleDelete,
                                                            })
                                                        }
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </section>

                            {/* Interface Section */}
                            <section
                                id='interface'
                                className='border-t border-white/5 pt-8 pb-8'
                            >
                                <h2 className='text-lg font-semibold cradle-text-primary cradle-mono'>
                                    Interface
                                </h2>
                                <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                    Customize your editing and viewing experience
                                </p>

                                <div className='space-y-4'>
                                    {/* Appearance Card */}
                                    <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-0'>
                                        <div className='flex items-center justify-between gap-4 py-2'>
                                            <div className='flex-1'>
                                                <label className='cradle-label cradle-text-tertiary text-sm block mb-1'>
                                                    Theme
                                                </label>
                                                <p className='text-sm cradle-text-muted'>Choose your preferred color scheme</p>
                                            </div>
                                            <button
                                                type='button'
                                                onClick={() => setValue('theme', watch('theme') === 'dark' ? 'light' : 'dark')}
                                                className='p-2 rounded transition-colors bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                                            >
                                                {watch('theme') === 'dark' ? (
                                                    <SunLight className='w-5 h-5' />
                                                ) : (
                                                    <HalfMoon className='w-5 h-5' />
                                                )}
                                            </button>
                                        </div>

                                        <div className='cradle-separator'></div>

                                        <div className='py-2'>
                                            <div className='flex items-center justify-between gap-4'>
                                                <div className='flex-1'>
                                                    <label className='cradle-label cradle-text-tertiary text-sm block mb-1 flex items-center gap-2'>
                                                        Vim Mode
                                                        <img src={vimIcon} alt='Vim' className='w-4 h-4' />
                                                    </label>
                                                    <p className='text-sm cradle-text-muted'>Use Vim keybindings in the markdown editor</p>
                                                </div>
                                                <label
                                                    htmlFor={vimModeId}
                                                    className='relative inline-flex items-center cursor-pointer'
                                                >
                                                    <input
                                                        id={vimModeId}
                                                        data-testid='vim-toggle'
                                                        type='checkbox'
                                                        className='sr-only'
                                                        {...register('vimMode')}
                                                    />
                                                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${watch('vimMode') ? 'bg-orange-500' : 'bg-gray-600'}`}>
                                                        <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform duration-200 ease-in-out ${watch('vimMode') ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Note Template Card */}
                                    <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] p-4'>
                                        <div className='flex items-center justify-between'>
                                            <div>
                                                <span className='text-sm cradle-text-tertiary block mb-0.5'>Note Template</span>
                                                <span className='text-sm cradle-text-muted'>Preset structure for new notes you create</span>
                                            </div>
                                            <button
                                                type='button'
                                                className='cradle-btn cradle-btn-ghost text-sm px-3 py-1.5 flex items-center gap-1.5'
                                                onClick={editDefaultNoteTemplate}
                                            >
                                                <Edit className='w-3.5 h-3.5' />
                                                Edit
                                            </button>
                                        </div>
                                    </div>

                                    {/* Snippets Card */}
                                    <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] p-4'>
                                        <p className='text-sm cradle-text-muted mb-2'>Reusable text blocks you can insert with shortcuts</p>
                                        <SnippetList userId={target} />
                                    </div>
                                </div>
                            </section>

                            {/* Save Button - Only for new user creation */}
                            {!isEdit && (
                                <div className='border-t border-white/5 pt-5'>
                                    <button
                                        type='submit'
                                        className='cradle-btn cradle-btn-primary px-6'
                                        disabled={!isDirty}
                                    >
                                        Create User
                                    </button>
                                </div>
                            )}

                            {/* Alert */}
                            {alert.show && (
                                <div className='pt-4'>
                                    <AlertBox alert={alert} />
                                </div>
                            )}
                        </form>
                </div>
            </div>
        </div>
    );
}
