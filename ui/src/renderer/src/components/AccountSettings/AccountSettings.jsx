import { yupResolver } from '@hookform/resolvers/yup';
import { Edit, Key, Lock, Settings, User } from 'iconoir-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import vimIcon from '../../assets/vim32x32.gif';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useAuth from '../../hooks/useAuth/useAuth';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import {
    changePassword,
    createUser,
    deleteUser,
    generateApiKey,
    getDefaultNoteTemplate,
    getUser,
    setDefaultNoteTemplate,
    updateUser,
} from '../../services/userService/userService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertBox from '../AlertBox/AlertBox';
import AlertDismissible from '../AlertDismissible/AlertDismissible.jsx';
import FormField from '../FormField/FormField';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';
import MarkdownEditorModal from '../Modals/MarkdownEditorModal.jsx';
import SnippetList from '../SnippetList/SnippetList';

const accountSettingsSchema = Yup.object().shape({
    username: Yup.string().required('Username is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string().when('$isEdit', {
        is: false,
        then: () => Yup.string().required('Password is required'),
        otherwise: () => Yup.string(),
    }),
    vtKey: Yup.string(),
    catalystKey: Yup.string(),
    role: Yup.string().when('$isAdminAndNotOwn', {
        is: true,
        then: () => Yup.string().required('Role is required'),
        otherwise: () => Yup.string(),
    }),
    email_confirmed: Yup.boolean(),
    is_active: Yup.boolean(),
    vim_mode: Yup.boolean(),
});

export default function AccountSettings({ target, isEdit = true, onAdd }) {
    const { navigate, navigateLink } = useCradleNavigate();
    const auth = useAuth();
    const { profile, setProfile, isAdmin } = useProfile();
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showApiKeyGenerate, setShowApiKeyGenerate] = useState(false);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [activeSection, setActiveSection] = useState('account');
    const isOwnAccount = isEdit ? target === 'me' || profile?.userId === target : false;
    const isAdminAndNotOwn = isAdmin() && !isOwnAccount;
    const { setModal } = useModal();
    const vimModeId = useId();

    const defaultValues = isEdit
        ? {
              id: '',
              username: '',
              email: '',
              password: 'password',
              vtKey: 'apikey',
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
              vtKey: '',
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
        formState: { errors, isDirty },
    } = useForm({
        resolver: yupResolver(accountSettingsSchema, {
            context: { isEdit, isAdminAndNotOwn },
        }),
        defaultValues,
    });

    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [popup, setPopup] = useState({ show: false, message: '', color: 'red' });

    // Prepopulate form in edit mode.
    useEffect(() => {
        if (isEdit && target) {
            getUser(target)
                .then((res) => {
                    reset({
                        id: res.data.id,
                        username: res.data.username,
                        email: res.data.email,
                        password: 'password',
                        vtKey: res.data.vt_api_key ? 'apikey' : '',
                        vimMode: res.data.vim_mode || false,
                        theme: res.data.theme || 'dark',
                        catalystKey: res.data.catalyst_api_key ? 'apikey' : '',
                        role: res.data.role || 'user',
                        email_confirmed: res.data.email_confirmed || false,
                        is_active: res.data.is_active || false,
                    });
                    setTwoFactorEnabled(res.data.two_factor_enabled || false);
                })
                .catch(displayError(setAlert, navigate));
        } else {
            reset(defaultValues);
        }
    }, [isEdit, target, reset, navigate]);

    const onSubmit = async (data) => {
        if (isEdit) {
            const payload = {};
            if (data.password !== 'password') {
                payload.password = data.password;
            }
            if (data.vtKey !== 'apikey') {
                payload.vt_api_key = data.vtKey;
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
                const response = await updateUser(data.id, payload);
                if (response.status !== 200) {
                    displayError(setAlert, navigate)(response.data);
                    return;
                }

                if (isOwnAccount) {
                    setProfile((prevProfile) => ({
                        ...prevProfile,
                        ...response.data,
                    }));
                }

                setPopup({
                    show: true,
                    message: 'User updated successfully',
                    color: 'green',
                });
            } catch (err) {
                displayError(setAlert, navigate)(err);
            }
        } else {
            const payload = {
                username: data.username,
                email: data.email,
                password: data.password,
                vt_api_key: data.vtKey,
                catalyst_api_key: data.catalystKey,
                role: data.role,
                email_confirmed: data.email_confirmed,
                is_active: data.is_active,
                vim_mode: data.vimMode,
                theme: data.theme,
            };
            try {
                let result = await createUser(payload);

                if (result.status === 200) {
                    setPopup({
                        show: true,
                        message: 'User created successfully',
                        color: 'green',
                    });
                    reset();
                    onAdd(result.data);
                } else {
                    displayError(setAlert, navigate)(result.data);
                }
            } catch (err) {
                displayError(setAlert, navigate)(err);
            }
        }
    };

    const handleDelete = async () => {
        try {
            const response = await deleteUser(getValues('id'));
            if (response.status === 200) {
                auth.logOut();
            }
        } catch (err) {
            displayError(setAlert)(err);
        }
    };

    const handleGenerateApiKey = async () => {
        try {
            const response = await generateApiKey(getValues('id'));
            if (response.status === 200) {
                setPopup({
                    show: true,
                    message: 'API key generated successfully!',
                    color: 'green',
                    code: response.data.api_key,
                });
                setShowApiKeyGenerate(false);
            }
        } catch (err) {
            displayError(setAlert)(err);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');

        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
        }

        try {
            await changePassword(currentPassword, newPassword);
            setPopup({
                show: true,
                message: 'Password changed successfully!',
                color: 'green',
            });
            setShowChangePassword(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPasswordError(err.response?.data?.message || 'Failed to change password');
        }
    };

    const editDefaultNoteTemplate = async () => {
        const defaultNoteResponse = await getDefaultNoteTemplate(target);
        if (defaultNoteResponse.status !== 200) {
            displayError(setAlert)(defaultNoteResponse.data);
            return;
        }

        setModal(MarkdownEditorModal, {
            title: 'Edit Default Note Template',
            noteTitle: 'Default Note Template',
            initialContent: defaultNoteResponse.data.template || '',
            onConfirm: (content) => {
                if (isOwnAccount) {
                    setProfile((prevProfile) => ({
                        ...prevProfile,
                        defaultNoteTemplate: content,
                    }));
                }

                setDefaultNoteTemplate(target, content).then((response) => {
                    if (response.status === 200) {
                        setPopup({
                            show: true,
                            message: 'Default note template updated successfully!',
                            color: 'green',
                        });
                    } else {
                        displayError(setAlert)(response.data);
                    }
                });
            },
            titleEditable: false,
        });
    };

    const handle2FASetup = async () => {
        if (twoFactorEnabled) {
            if (isOwnAccount) {
                setShow2FASetup(true);
            } else {
                updateUser(target, {
                    two_factor_enabled: false,
                });
                setTwoFactorEnabled(false);
                setPopup({
                    show: true,
                    message:
                        '2FA has been successfully disabled for the selected account!',
                    color: 'green',
                });
            }
        } else {
            setShow2FASetup(true);
            // Initiate 2FA setup
            try {
                const { initiate2FA } = await import('../../services/userService/userService');
                const response = await initiate2FA();
                setQrCodeUrl(response.data.config_url);
            } catch (err) {
                displayError(setAlert)(err);
            }
        }
    };

    const handle2FASubmit = async (e) => {
        e.preventDefault();
        try {
            if (twoFactorEnabled) {
                const { disable2FA } = await import('../../services/userService/userService');
                await disable2FA(twoFactorCode);
                setTwoFactorEnabled(false);
                setPopup({
                    show: true,
                    message: '2FA has been successfully disabled for your account',
                    color: 'green',
                });
            } else {
                const { enable2FA } = await import('../../services/userService/userService');
                await enable2FA(twoFactorCode);
                setTwoFactorEnabled(true);
                setPopup({
                    show: true,
                    message: '2FA has been successfully enabled for your account',
                    color: 'green',
                });
            }
            setShow2FASetup(false);
            setTwoFactorCode('');
            setQrCodeUrl('');
        } catch (err) {
            displayError(setAlert)(err);
        }
    };


    const sidebarItems = [
        { id: 'account', label: 'Account', icon: User },
        ...(isEdit && (twoFactorEnabled || isOwnAccount) ? [{ id: 'security', label: 'Security', icon: Lock }] : []),
        { id: 'apikeys', label: 'API Keys', icon: Key },
        { id: 'interface', label: 'Interface', icon: Settings },
    ];

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
                            <div className='w-full'>
                                <label className='cradle-label cradle-text-tertiary block mb-2'>
                                    User ID
                                </label>
                                <input
                                    type='text'
                                    value={profile?.id || ''}
                                    className='cradle-search w-full'
                                    disabled
                                    readOnly
                                />
                                <p className='text-xs cradle-text-muted mt-1'>
                                    Unique identifier for this account
                                </p>
                            </div>

                            <FormField
                                name='username'
                                type='text'
                                labelText='Username'
                                placeholder='Username'
                                {...register('username')}
                                error={errors.username?.message}
                                disabled={!isAdminAndNotOwn && isEdit}
                            />

                            <FormField
                                name='email'
                                type='text'
                                labelText='Email'
                                placeholder='Email'
                                {...register('email')}
                                error={errors.email?.message}
                                disabled={!isAdminAndNotOwn && isEdit}
                            />

                            {/* Role - Read Only */}
                            <div className='w-full'>
                                <label className='cradle-label cradle-text-tertiary block mb-2'>
                                    Role
                                </label>
                                <input
                                    type='text'
                                    value={profile?.role || ''}
                                    className='cradle-search w-full'
                                    disabled
                                    readOnly
                                />
                                <p className='text-xs cradle-text-muted mt-1'>
                                    Current user role and permissions level
                                </p>
                            </div>

                            {isEdit ? (
                                isAdminAndNotOwn && (
                                    <FormField
                                        name='password'
                                        type='password'
                                        labelText='Password'
                                        placeholder='Password'
                                        {...register('password')}
                                        error={errors.password?.message}
                                    />
                                )
                            ) : (
                                <FormField
                                    name='password'
                                    type='password'
                                    labelText='Password'
                                    placeholder='Password'
                                    {...register('password')}
                                    error={errors.password?.message}
                                />
                            )}

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
                                            <option value='entrymanager'>Entry Manager</option>
                                            <option value='admin'>Admin</option>
                                        </select>
                                        {errors.role && (
                                            <p className='cradle-status-error text-sm mt-2'>
                                                {errors.role.message}
                                            </p>
                                        )}
                                    </div>

                                    <FormField
                                        type='checkbox'
                                        labelText='Email Confirmed'
                                        className='switch switch-ghost-primary'
                                        {...register('email_confirmed')}
                                        row={true}
                                        error={errors.email_confirmed?.message}
                                    />

                                    <FormField
                                        type='checkbox'
                                        labelText='Account Active'
                                        className='switch switch-ghost-primary'
                                        {...register('is_active')}
                                        row={true}
                                        error={errors.is_active?.message}
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
                                            <div className='flex items-center justify-between mb-3'>
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
                                                    onClick={() => {
                                                        setShowChangePassword(!showChangePassword);
                                                        setPasswordError('');
                                                    }}
                                                >
                                                    {showChangePassword ? 'Cancel' : 'Change Password'}
                                                </button>
                                            </div>

                                            {showChangePassword && (
                                                <div className='mt-4 p-4 border cradle-border rounded'>
                                                    <form onSubmit={handleChangePassword} className='space-y-4'>
                                                        <div>
                                                            <label className='cradle-label cradle-text-tertiary block mb-2'>
                                                                Current Password
                                                            </label>
                                                            <input
                                                                type='password'
                                                                className='cradle-search w-full'
                                                                value={currentPassword}
                                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className='cradle-label cradle-text-tertiary block mb-2'>
                                                                New Password
                                                            </label>
                                                            <input
                                                                type='password'
                                                                className='cradle-search w-full'
                                                                value={newPassword}
                                                                onChange={(e) => setNewPassword(e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className='cradle-label cradle-text-tertiary block mb-2'>
                                                                Confirm New Password
                                                            </label>
                                                            <input
                                                                type='password'
                                                                className='cradle-search w-full'
                                                                value={confirmPassword}
                                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        {passwordError && (
                                                            <p className='cradle-status-error text-sm'>{passwordError}</p>
                                                        )}
                                                        <div className='flex justify-end'>
                                                            <button
                                                                type='submit'
                                                                className='cradle-btn cradle-btn-primary'
                                                            >
                                                                Update Password
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            )}
                                        </div>

                                        <div className='cradle-separator'></div>

                                        {/* API Key Section */}
                                        <div className='py-3'>
                                            <div className='flex items-center justify-between mb-3'>
                                                <div>
                                                    <label className='cradle-label cradle-text-tertiary block mb-1'>
                                                        API Key
                                                    </label>
                                                    <p className='text-xs cradle-text-muted'>
                                                        Generate a new API key for programmatic access
                                                    </p>
                                                </div>
                                                <button
                                                    type='button'
                                                    className='cradle-btn cradle-btn-ghost'
                                                    onClick={() => setShowApiKeyGenerate(!showApiKeyGenerate)}
                                                >
                                                    {showApiKeyGenerate ? 'Cancel' : 'Generate API Key'}
                                                </button>
                                            </div>

                                            {showApiKeyGenerate && (
                                                <div className='mt-4 p-4 border cradle-border rounded'>
                                                    <p className='cradle-text-secondary mb-4'>
                                                        Are you sure you want to generate a new API key? This will invalidate the current key.
                                                    </p>
                                                    <div className='flex justify-end gap-2'>
                                                        <button
                                                            type='button'
                                                            className='cradle-btn cradle-btn-ghost'
                                                            onClick={() => setShowApiKeyGenerate(false)}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type='button'
                                                            className='cradle-btn cradle-btn-primary'
                                                            onClick={handleGenerateApiKey}
                                                        >
                                                            Confirm
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className='cradle-separator'></div>
                                    </>
                                )}

                                {(twoFactorEnabled || isOwnAccount) && (
                                    <>
                                        {/* Two-Factor Authentication Section */}
                                        <div className='py-3'>
                                            <div className='flex items-center justify-between mb-3'>
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
                                                    onClick={() => {
                                                        if (show2FASetup) {
                                                            setShow2FASetup(false);
                                                            setTwoFactorCode('');
                                                            setQrCodeUrl('');
                                                        } else {
                                                            handle2FASetup();
                                                        }
                                                    }}
                                                >
                                                    {show2FASetup ? 'Cancel' : (isEdit && twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA')}
                                                </button>
                                            </div>

                                            {show2FASetup && (
                                                <div className='mt-4 p-4 border cradle-border rounded'>
                                                    <form onSubmit={handle2FASubmit} className='space-y-4'>
                                                        {!twoFactorEnabled && qrCodeUrl && (
                                                            <>
                                                                <div className='flex justify-center mb-4'>
                                                                    <div className='p-4 bg-white rounded'>
                                                                        <QRCodeSVG value={qrCodeUrl} size={200} level='H' />
                                                                    </div>
                                                                </div>
                                                                <div className='mb-4 p-3 cradle-bg-secondary rounded'>
                                                                    <p className='text-sm cradle-text-tertiary mb-2'>
                                                                        Can't scan the QR code? Enter this secret key manually:
                                                                    </p>
                                                                    <code className='block cradle-bg-elevated p-2 rounded text-center select-all cradle-text-primary'>
                                                                        {new URL(qrCodeUrl).searchParams.get('secret')}
                                                                    </code>
                                                                </div>
                                                            </>
                                                        )}
                                                        <div>
                                                            <label className='cradle-label cradle-text-tertiary block mb-2'>
                                                                {twoFactorEnabled 
                                                                    ? 'Enter verification code to disable 2FA'
                                                                    : 'Enter verification code from your authenticator app'}
                                                            </label>
                                                            <input
                                                                type='text'
                                                                className='cradle-search w-full'
                                                                placeholder='000000'
                                                                value={twoFactorCode}
                                                                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                                pattern='[0-9]*'
                                                                maxLength='6'
                                                                required
                                                            />
                                                        </div>
                                                        <div className='flex justify-end'>
                                                            <button
                                                                type='submit'
                                                                className={`cradle-btn ${twoFactorEnabled ? 'cradle-status-error !bg-opacity-10' : 'cradle-btn-primary'}`}
                                                                disabled={twoFactorCode.length !== 6}
                                                            >
                                                                {twoFactorEnabled ? 'Disable 2FA' : 'Verify and Enable'}
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            )}
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
                                                    Permanently delete your account and all associated data
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
                                name='vtKey'
                                type='password'
                                labelText='VirusTotal API Key'
                                placeholder='VirusTotal API Key'
                                {...register('vtKey')}
                                error={errors.vtKey?.message}
                            />

                            <FormField
                                name='catalystKey'
                                type='password'
                                labelText='Catalyst API Key'
                                placeholder='Catalyst API Key'
                                {...register('catalystKey')}
                                error={errors.catalystKey?.message}
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
                                    name='vim-toggle'
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
                                <h3 className='text-sm font-semibold cradle-text-secondary cradle-mono mb-4'>
                                    Note Templates
                                </h3>
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
                            <div>
                                <h3 className='text-sm font-semibold cradle-text-secondary cradle-mono mb-4'>
                                    Code Snippets
                                </h3>
                                <SnippetList userId={target} />
                            </div>
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
            <AlertDismissible alert={popup} setAlert={setPopup} />
            <div className='w-full h-full'>
                {/* Page Header */}
                <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                    <div>
                        <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                            {isEdit ? 'Settings' : 'Add New User'}
                        </h1>
                        <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                            {isEdit ? 'Manage your account preferences and security' : 'Create a new user account'}
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
                                                onClick={() => setActiveSection(item.id)}
                                                className={`cradle-btn w-full flex items-center gap-3 ${
                                                    activeSection === item.id
                                                        ? 'cradle-btn-primary'
                                                        : 'cradle-btn-ghost'
                                                }`}
                                            >
                                                <Icon className='w-5 h-5 flex-shrink-0' />
                                                <span className='text-left flex-1'>{item.label}</span>
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