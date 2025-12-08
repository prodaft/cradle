import vimIcon from '@/assets/vim32x32.gif';
import { useModal } from '@/contexts/ui/ModalContext';
import { useNotif } from '@/contexts/ui/NotificationContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useAuth from '@/hooks/auth/useAuth';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { UserCreateRequest, UserRetrieve, UserUpdateRequest } from '@/services/cradle/models';
import { displayError } from '@/utils/api';
import AlertBox from '@components/base/Alert/AlertBox';
import SnippetList from '@components/base/SnippetList/SnippetList';
import FormField from '@components/forms/FormField';
import ApiKeyGenerateModal from '@components/modals/auth/ApiKeyGenerateModal';
import ChangePasswordModal from '@components/modals/auth/ChangePasswordModal';
import TwoFactorSetupModal from '@components/modals/auth/TwoFactorSetupModal';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import MarkdownEditorModal from '@components/modals/notes/MarkdownEditorModal';
import { yupResolver } from '@hookform/resolvers/yup';
import { Edit, Key, Lock, Settings, User } from 'iconoir-react';
import type { ComponentType } from 'react';
import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';

interface AccountSettingsProps {
    target?: string;
    isEdit?: boolean;
    onAdd?: (user: any) => void;
}

interface SidebarItem {
    id: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
}

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

const accountSettingsSchema: Yup.ObjectSchema<UserUpdateRequest> = Yup.object().shape({
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
    twoFactorEnabled: Yup.boolean(),
    isActive: Yup.boolean(),
    vimMode: Yup.boolean(),
    theme: Yup.string(),
}) as Yup.ObjectSchema<UserUpdateRequest>;

export default function AccountSettings({
    target = 'me',
    isEdit = true,
    onAdd,
}: AccountSettingsProps) {
    const { navigate, navigateLink } = useCradleNavigate();
    const { execute } = useAPICall();
    const { usersApi } = useApi();
    const auth = useAuth();
    const { profile, setProfile, isAdmin } = useProfile();
    const { notify } = useNotif();
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [user, setUser] = useState<UserRetrieve | null>(null);
    const [activeSection, setActiveSection] = useState('account');
    const isOwnAccount = isEdit ? target === 'me' || profile?.id === target : false;
    const id = isEdit ? (target === 'me' ? profile?.id : target) : undefined;
    const isAdminAndNotOwn = isAdmin() && !isOwnAccount;
    const { setModal } = useModal();
    const vimModeId = useId();

    const defaultValues: UserUpdateRequest = isEdit
        ? {
            username: '',
            email: '',
            password: 'password',
            catalystApiKey: 'apikey',
            role: 'author',
            vimMode: false,
            emailConfirmed: false,
            isActive: false,
            twoFactorEnabled: false,
            theme: 'dark',
        }
        : {
            username: '',
            email: '',
            password: '',
            catalystApiKey: '',
            role: 'author',
            vimMode: false,
            emailConfirmed: false,
            isActive: false,
            twoFactorEnabled: false,
            theme: 'dark',
        };

    const {
        register,
        handleSubmit,
        reset,
        getValues,
        formState: { errors, isDirty },
    } = useForm<UserUpdateRequest>({
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

    // Prepopulate form in edit mode.
    useEffect(() => {
        const fetchUser = async () => {
            if (isEdit && target) {
                try {
                    const user = await execute(() =>
                        usersApi
                            .usersRetrieve({ userId: target }), { errorMessage: 'Failed to fetch user' });
                    setUser(user);
                    reset({
                        username: user.username,
                        email: user.email,
                        password: 'password',
                        theme: user.theme || 'dark',
                        catalystApiKey: user.catalystApiKey ? 'apikey' : '',
                        role: user.role || 'author',
                        emailConfirmed: user.emailConfirmed || false,
                        isActive: user.isActive || false,
                        vimMode: user.vimMode || false,
                        twoFactorEnabled: user.twoFactorEnabled || false,
                    });
                    setTwoFactorEnabled(user.twoFactorEnabled || false);
                } catch (err) {
                    setUser(null);
                }
            } else {
                reset(defaultValues);
            }
        }
        fetchUser();
    }, [isEdit, target, reset, navigate, usersApi]);

    const onSubmit = async (data: UserUpdateRequest) => {
        console.log(data);
        if (isEdit) {
            const payload: any = {};
            if (data.password !== 'password') {
                payload.password = data.password;
            }
            if (data.catalystApiKey !== 'apikey') {
                payload.catalystApiKey = data.catalystApiKey;
            }
            payload.vim_mode = data.vimMode;
            payload.theme = data.theme;
            if (isAdminAndNotOwn) {
                payload.username = data.username;
                payload.email = data.email;
                payload.emailConfirmed = data.emailConfirmed;
                payload.isActive = data.isActive;
                payload.role = data.role;
            }
            try {
                const updatedUser = await usersApi.usersUpdate({
                    userId: id!,
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
            try {
                let payload: UserCreateRequest = {
                    username: data.username!,
                    email: data.email!,
                    password: data.password!,
                    catalystApiKey: data.catalystApiKey,
                    vimMode: data.vimMode,
                    theme: data.theme,
                };
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

    const handleDelete = async () => {
        try {
            await usersApi.usersDestroy({ userId: id! });
            auth.logOut();
        } catch (err) {
            displayError(setAlert)(err);
        }
    };

    const handleGenerateApiKey = () => {
        setModal(ApiKeyGenerateModal, {
            userId: id!,
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

    const sidebarItems: SidebarItem[] = [
        { id: 'account', label: 'Account', icon: User },
        ...(isEdit && (twoFactorEnabled || isOwnAccount)
            ? [{ id: 'security', label: 'Security', icon: Lock }]
            : []),
        { id: 'apikeys', label: 'API Keys', icon: Key },
        { id: 'interface', label: 'Interface', icon: Settings },
    ];

    if (!user && id) {
        return <></>
    }

    const renderSection = () => {
        switch (activeSection) {
            case 'account':
                return (
                    <div className='p-6'>
                        <div className='mb-6'>
                            <h2 className='text-lg font-semibold cradle-text-primary cradle-mono mb-2'>
                                Account Information
                            </h2>
                            <p className='text-sm cradle-text-tertiary cradle-mono'>
                                Basic account details and credentials
                            </p>
                        </div>

                        <div className='space-y-4'>
                            {/* User ID - Read Only */}
                            {id && (
                                <div className='w-full'>
                                    <label className='cradle-label cradle-text-tertiary block mb-2'>
                                        User ID
                                    </label>
                                    <input
                                        type='text'
                                        value={id}
                                        className='cradle-search w-full'
                                        disabled
                                        readOnly
                                    />
                                    <p className='text-xs cradle-text-muted mt-1'>
                                        Unique identifier for this account
                                    </p>
                                </div>
                            )}

                            <FormField
                                label='Username'
                                type='text'
                                placeholder='Username'
                                {...register('username')}
                                error={errors.username}
                                disabled={!isAdminAndNotOwn && isEdit}
                            />

                            <FormField
                                label='Email'
                                type='text'
                                placeholder='Email'
                                {...register('email')}
                                error={errors.email}
                                disabled={!isAdminAndNotOwn && isEdit}
                            />

                            {/* Role - Read Only */}
                            <div className='w-full'>
                                <label className='cradle-label cradle-text-tertiary block mb-2'>
                                    Role
                                </label>
                                <input
                                    type='text'
                                    {...register('role')}
                                    className='cradle-search w-full'
                                    disabled
                                    readOnly
                                />
                                <p className='text-xs cradle-text-muted mt-1'>
                                    Current user role and permissions level
                                </p>
                            </div>


                            {isAdmin() && (!isEdit || isAdminAndNotOwn) && (
                                <>
                                    <div className='cradle-separator my-6'></div>
                                    <div className='mb-4'>
                                        <h3 className='text-lg font-semibold cradle-text-secondary cradle-mono mb-1'>
                                            Administrative Settings
                                        </h3>
                                        <p className='text-sm cradle-text-tertiary'>
                                            Administrative controls for this account
                                        </p>
                                    </div>

                                    <div className='w-full'>
                                        <label className='cradle-label cradle-text-tertiary block mb-2'>
                                            Role
                                        </label>
                                        <select
                                            className='cradle-search w-full'
                                            {...register('role')}
                                        >
                                            <option value='author'>User</option>
                                            <option value='entrymanager'>
                                                Entry Manager
                                            </option>
                                            <option value='admin'>Admin</option>
                                        </select>
                                        {errors.role && (
                                            <p className='cradle-status-error text-sm mt-2'>
                                                {errors.role.message}
                                            </p>
                                        )}
                                    </div>



                                    <FormField
                                        label='Password'
                                        type='password'
                                        placeholder='Password'
                                        {...register('password')}
                                        error={errors.password}
                                    />

                                    <FormField
                                        type='checkbox'
                                        label='Email Confirmed'
                                        className='switch switch-ghost-primary'
                                        {...register('emailConfirmed')}
                                        row={true}
                                    />

                                    <FormField
                                        type='checkbox'
                                        label='Account Active'
                                        className='switch switch-ghost-primary'
                                        {...register('isActive')}
                                        row={true}
                                    />
                                </>
                            )}
                        </div>

                        <div className='cradle-border-t pt-6 mt-6'>
                            <button
                                type='submit'
                                className='cradle-btn cradle-btn-primary w-full'
                                disabled={!isDirty}
                            >
                                {isEdit ? 'Save Changes' : 'Create User'}
                            </button>
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className='p-6'>
                        <div className='mb-6'>
                            <h2 className='text-lg font-semibold cradle-text-primary cradle-mono mb-2'>
                                Security Settings
                            </h2>
                            <p className='text-sm cradle-text-tertiary cradle-mono'>
                                Manage authentication and account security
                            </p>
                        </div>

                        <div className='space-y-3'>
                            {isOwnAccount && (
                                <>
                                    {/* Change Password Section */}
                                    <div className='py-3'>
                                        <div className='flex items-center justify-between'>
                                            <div>
                                                <label className='cradle-label cradle-text-tertiary block mb-1'>
                                                    Password
                                                </label>
                                                <p className='text-xs cradle-text-muted'>
                                                    Change your account password
                                                </p>
                                            </div>
                                            <button
                                                type='button'
                                                className='cradle-btn cradle-btn-ghost'
                                                onClick={handleChangePassword}
                                            >
                                                Change Password
                                            </button>
                                        </div>
                                    </div>

                                    <div className='cradle-separator'></div>

                                    {/* API Key Section */}
                                    <div className='py-3'>
                                        <div className='flex items-center justify-between'>
                                            <div>
                                                <label className='cradle-label cradle-text-tertiary block mb-1'>
                                                    API Key
                                                </label>
                                                <p className='text-xs cradle-text-muted'>
                                                    Generate a new API key for
                                                    programmatic access
                                                </p>
                                            </div>
                                            <button
                                                type='button'
                                                className='cradle-btn cradle-btn-ghost'
                                                onClick={handleGenerateApiKey}
                                            >
                                                Generate API Key
                                            </button>
                                        </div>
                                    </div>

                                    <div className='cradle-separator'></div>
                                </>
                            )}

                            {(twoFactorEnabled || isOwnAccount) && (
                                <>
                                    {/* Two-Factor Authentication Section */}
                                    <div className='py-3'>
                                        <div className='flex items-center justify-between'>
                                            <div>
                                                <label className='cradle-label cradle-text-tertiary block mb-1'>
                                                    Two-Factor Authentication
                                                </label>
                                                <p className='text-xs cradle-text-muted'>
                                                    {twoFactorEnabled
                                                        ? 'Two-factor authentication is currently enabled'
                                                        : 'Add an extra layer of security to your account'}
                                                </p>
                                            </div>
                                            <button
                                                type='button'
                                                className={`cradle-btn ${twoFactorEnabled ? 'cradle-status-error !bg-opacity-10' : 'cradle-btn-ghost'}`}
                                                onClick={handle2FASetup}
                                            >
                                                {twoFactorEnabled
                                                    ? 'Disable 2FA'
                                                    : 'Enable 2FA'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className='cradle-separator'></div>
                                </>
                            )}

                            {isOwnAccount && (
                                <div className='mt-6'>
                                    <div className='mb-4'>
                                        <h3 className='text-lg font-semibold cradle-status-error cradle-mono mb-1'>
                                            Danger Zone
                                        </h3>
                                        <p className='text-sm cradle-text-tertiary'>
                                            Irreversible actions require confirmation
                                        </p>
                                    </div>
                                    <div className='flex items-center justify-between py-3 border-2 border-red-500/20 rounded px-4'>
                                        <div>
                                            <label className='cradle-label cradle-text-tertiary block mb-1'>
                                                Delete Account
                                            </label>
                                            <p className='text-xs cradle-text-muted'>
                                                Permanently delete your account and all
                                                associated data
                                            </p>
                                        </div>
                                        <button
                                            type='button'
                                            className='cradle-btn cradle-status-error !bg-opacity-10'
                                            onClick={() =>
                                                setModal(ConfirmDeletionModal, {
                                                    text: 'Are you sure you want to delete your account? All data related to you will be deleted.',
                                                    onConfirm: handleDelete,
                                                })
                                            }
                                        >
                                            Delete Account
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'apikeys':
                return (
                    <div className='p-6'>
                        <div className='mb-6'>
                            <h2 className='text-lg font-semibold cradle-text-primary cradle-mono mb-2'>
                                API Integration
                            </h2>
                            <p className='text-sm cradle-text-tertiary cradle-mono'>
                                Configure third-party service API keys
                            </p>
                        </div>

                        <div className='space-y-4'>
                            <FormField
                                label='Catalyst API Key'
                                type='password'
                                placeholder='Catalyst API Key'
                                {...register('catalystApiKey')}
                            />
                        </div>

                        <div className='cradle-border-t pt-6 mt-6'>
                            <button
                                type='submit'
                                className='cradle-btn cradle-btn-primary w-full'
                                disabled={!isDirty}
                            >
                                {isEdit ? 'Save Changes' : 'Create User'}
                            </button>
                        </div>
                    </div>
                );
            case 'interface':
                return (
                    <div className='p-6'>
                        <div className='mb-6'>
                            <h2 className='text-lg font-semibold cradle-text-primary cradle-mono mb-2'>
                                Interface Preferences
                            </h2>
                            <p className='text-sm cradle-text-tertiary cradle-mono'>
                                Customize your editing and viewing experience
                            </p>
                        </div>

                        <div className='space-y-6'>
                            {/* Editor Settings */}
                            <div>
                                <h3 className='text-sm font-semibold cradle-text-secondary cradle-mono mb-4'>
                                    Editor Settings
                                </h3>
                                <div className='flex items-center justify-between py-3'>
                                    <label
                                        htmlFor={vimModeId}
                                        className='flex items-center gap-3 cursor-pointer flex-1'
                                    >
                                        <img
                                            src={vimIcon}
                                            alt='Vim'
                                            className='w-6 h-6'
                                        />
                                        <div>
                                            <span className='cradle-label cradle-text-tertiary block mb-1'>
                                                Vim Mode
                                            </span>
                                            <p className='text-xs cradle-text-muted'>
                                                Enable Vim keybindings in the editor
                                            </p>
                                        </div>
                                    </label>
                                    <input
                                        id={vimModeId}
                                        data-testid='vim-toggle'
                                        type='checkbox'
                                        className='switch switch-ghost-primary'
                                        {...register('vimMode')}
                                    />
                                </div>
                            </div>

                            {/* Appearance */}
                            <div>
                                <h3 className='text-sm font-semibold cradle-text-secondary cradle-mono mb-4'>
                                    Appearance
                                </h3>
                                <div className='w-full'>
                                    <label className='cradle-label cradle-text-tertiary block mb-2'>
                                        Theme
                                    </label>
                                    <select
                                        className='cradle-search w-full'
                                        {...register('theme')}
                                    >
                                        <option value='dark'>Dark</option>
                                        <option value='light'>Light</option>
                                    </select>
                                    {errors.theme && (
                                        <p className='cradle-status-error text-sm mt-2'>
                                            {errors.theme.message}
                                        </p>
                                    )}
                                    <p className='text-xs cradle-text-muted mt-1'>
                                        Choose your preferred color scheme
                                    </p>
                                </div>
                            </div>

                            {/* Note Templates */}
                            <div>
                                <div className='flex items-center justify-between py-3'>
                                    <div>
                                        <label className='cradle-label cradle-text-tertiary block mb-1'>
                                            Default Note Template
                                        </label>
                                        <p className='text-xs cradle-text-muted'>
                                            Customize the template used for new notes
                                        </p>
                                    </div>
                                    <button
                                        type='button'
                                        className='cradle-btn cradle-btn-ghost flex items-center gap-2'
                                        onClick={editDefaultNoteTemplate}
                                    >
                                        <Edit className='w-4 h-4' />
                                        Edit Template
                                    </button>
                                </div>
                            </div>

                            {/* Snippets */}
                            <SnippetList userId={target} />
                        </div>

                        <div className='cradle-border-t pt-6 mt-6'>
                            <button
                                type='submit'
                                className='cradle-btn cradle-btn-primary w-full'
                                disabled={!isDirty}
                            >
                                {isEdit ? 'Save Changes' : 'Create User'}
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <div className='w-full h-full'>
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

                {/* Content Area - Sidebar Layout */}
                <div className='flex flex-col space-y-4 p-4'>
                    <div className='flex gap-4'>
                        {/* Sidebar */}
                        <div className='w-64 flex-shrink-0'>
                            <div className='cradle-border cradle-border-l cradle-border-r cradle-bg-elevated sticky top-6'>
                                <nav className='p-4 space-y-2'>
                                    {sidebarItems.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.id}
                                                type='button'
                                                onClick={() =>
                                                    setActiveSection(item.id)
                                                }
                                                className={`cradle-btn w-full flex items-center gap-3 ${activeSection === item.id
                                                    ? 'cradle-btn-primary'
                                                    : 'cradle-btn-ghost'
                                                    }`}
                                            >
                                                <Icon className='w-5 h-5 flex-shrink-0' />
                                                <span className='text-left flex-1'>
                                                    {item.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className='flex-1'>
                            <div className='cradle-border cradle-border-l cradle-border-r cradle-bg-elevated'>
                                <form onSubmit={handleSubmit(onSubmit)}>
                                    {renderSection()}

                                    {/* Alert at bottom */}
                                    {alert.show && (
                                        <div className='p-6 cradle-border-t'>
                                            <AlertBox alert={alert} />
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
