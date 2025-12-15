import vimIcon from '@/assets/vim32x32.gif';
import ApiKeyGenerateModal from '@/components/modals/auth/ApiKeyGenerateModal';
import ChangePasswordModal from '@/components/modals/auth/ChangePasswordModal';
import TwoFactorSetupModal from '@/components/modals/auth/TwoFactorSetupModal';
import ConfirmDeletionModal from '@/components/modals/base/ConfirmDeletionModal';
import MarkdownEditorModal from '@/components/modals/notes/MarkdownEditorModal';
import { useModal } from '@/contexts/ui/ModalContext';
import { useNotif } from '@/contexts/ui/NotificationContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useAuth from '@/hooks/auth/useAuth';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { UserCreateRequestThemeEnum, UserRetrieve, UserUpdateRequest, UserUpdateRequestRoleEnum } from '@/services/cradle/models';
import { displayError } from '@/utils/api';
import AlertBox from '@components/base/Alert/AlertBox';
import SnippetList, { SnippetListRef } from '@components/base/SnippetList/SnippetList';
import { yupResolver } from '@hookform/resolvers/yup';
import { Edit, HalfMoon, Key, Lock, Plus, SunLight, Trash } from 'iconoir-react';
import { debounce } from 'lodash'; // Import lodash debounce
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';

interface AccountFormData extends UserUpdateRequest {
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
}) as Yup.ObjectSchema<AccountFormData>;

export default function AccountSettings({
    target = 'me',
    isEdit = true,
    onAdd,
}: AccountSettingsProps) {
    const { navigate, navigateLink } = useCradleNavigate();
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
                const user = await execute(() => usersApi.usersRetrieve({ userId: target }));
                setUser(user);

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
        })()
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
            (isAdminAndNotOwn && (
                data.username !== previousData?.username ||
                data.email !== previousData?.email ||
                data.role !== previousData?.role ||
                data.emailConfirmed !== previousData?.emailConfirmed ||
                data.isActive !== previousData?.isActive
            )) ||
            (data.password !== 'password' && data.password !== previousData?.password) ||
            (data.catalystApiKey !== 'apikey' && data.catalystApiKey !== previousData?.catalystApiKey) ||
            data.vimMode !== previousData?.vimMode ||
            data.theme !== previousData?.theme;

        if (!hasChanges) return;

        const payload: any = {};
        if (data.password !== 'password' && data.password !== previousData?.password) {
            payload.password = data.password;
        }
        if (data.catalystApiKey !== 'apikey' && data.catalystApiKey !== previousData?.catalystApiKey) {
            payload.catalyst_api_key = data.catalystApiKey;
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
            if (data.emailConfirmed !== previousData?.emailConfirmed) payload.emailConfirmed = data.emailConfirmed;
            if (data.isActive !== previousData?.isActive) payload.isActive = data.isActive;
            if (data.role !== previousData?.role) payload.role = data.role;
        }

        if (Object.keys(payload).length === 0) return;

        try {
            const updatedUser = await execute(() => usersApi.usersUpdate({
                userId: data.id,
                userUpdateRequest: payload,
            }), {
                // Optional: Reduce noise by removing success message on autosave
                successMessage: 'Saved',
                errorMessage: 'Failed to auto-save',
            });

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
            console.error("Autosave failed", error);
        }
    };

    const processAutoSaveRef = useRef(processAutoSave);

    useEffect(() => {
        processAutoSaveRef.current = processAutoSave;
    });

    const debouncedSave = useMemo(
        () => debounce((data: AccountFormData) => {
            processAutoSaveRef.current(data);
        }, 1000),
        []
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
            const newUser = await execute(() => usersApi.usersCreate({
                userCreateRequest: payload,
            }));

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

    const openNoteTemplateModal = async () => {
        setNoteTemplateLoading(true);
        try {
            const defaultNoteResponse = await execute(() => usersApi.usersDefaultNoteTemplateRetrieve({
                userId: target,
            }));
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
        } catch (err) {
            displayError(setAlert)(err);
        } finally {
            setNoteTemplateLoading(false);
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
                <div className='w-full'>
                    <form onSubmit={isEdit ? (e) => e.preventDefault() : handleSubmit(onSubmit)}>
                        {/* Account Section */}
                        <section
                            id='account'
                            className='pb-8'
                        >
                            <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
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
                                <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-1 space-y-0'>
                                    <div className='flex items-center justify-between gap-4 py-2'>
                                        <div className='flex-1'>
                                            <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                                Username
                                            </label>
                                            <p className='text-sm cradle-text-muted'>Your display name across the platform</p>
                                            {errors.username && (
                                                <p className='text-sm text-red-500 mt-1'>{errors.username.message}</p>
                                            )}
                                        </div>
                                        <div className='w-auto'>
                                            <input
                                                type='text'
                                                placeholder='Username'
                                                className='cradle-input w-fit text-sm h-10 rounded-full'
                                                {...register('username')}
                                                disabled={!isAdminAndNotOwn && isEdit}
                                            />
                                        </div>
                                    </div>

                                    <div className='cradle-separator'></div>

                                    <div className='flex items-center justify-between gap-4 py-2'>
                                        <div className='flex-1'>
                                            <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                                Email
                                            </label>
                                            <p className='text-sm cradle-text-muted'>Used for login and notifications</p>
                                            {errors.email && (
                                                <p className='text-sm text-red-500 mt-1'>{errors.email.message}</p>
                                            )}
                                        </div>
                                        <div className='w-auto'>
                                            <input
                                                type='text'
                                                placeholder='Email'
                                                className='cradle-input w-fit text-sm h-10 rounded-full'
                                                {...register('email')}
                                                disabled={!isAdminAndNotOwn && isEdit}
                                            />
                                        </div>
                                    </div>

                                    <div className='cradle-separator'></div>

                                    <div className='flex items-center justify-between gap-4 py-2'>
                                        <div className='flex-1'>
                                            <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                                User ID
                                            </label>
                                            <p className='text-sm cradle-text-muted'>Unique identifier for API integrations</p>
                                        </div>
                                        <div className='w-auto'>
                                            <input
                                                type='text'
                                                value={profile?.id || ''}
                                                className='cradle-input inline-block text-sm h-10 rounded-full opacity-60'
                                                style={{ width: 'auto' }}
                                                disabled
                                                readOnly
                                            />
                                        </div>
                                    </div>

                                    <div className='cradle-separator'></div>

                                    <div className='flex items-center justify-between gap-4 py-2'>
                                        <div className='flex-1'>
                                            <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                                Role
                                            </label>
                                            <p className='text-sm cradle-text-muted'>Determines your access permissions</p>
                                        </div>
                                        <div className='w-auto'>
                                            <input
                                                type='text'
                                                value={profile?.role || ''}
                                                className='cradle-input inline-block text-sm h-10 rounded-full opacity-60'
                                                style={{ width: 'auto' }}
                                                disabled
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>

                                {!isEdit && (
                                    <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-1'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                                    Password
                                                </label>
                                                <p className='text-sm cradle-text-muted'>Minimum 8 characters recommended</p>
                                                {errors.password && (
                                                    <p className='text-sm text-red-500 mt-1'>{errors.password.message}</p>
                                                )}
                                            </div>
                                            <div className='w-auto'>
                                                <input
                                                    type='password'
                                                    placeholder='Password'
                                                    className='cradle-input inline-block text-sm h-10 rounded-full'
                                                    style={{ width: 'auto' }}
                                                    {...register('password')}
                                                />
                                            </div>
                                        </div>
                                    </div>
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
                                        <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-1 space-y-0'>
                                            <div className='flex items-center justify-between gap-4 py-2'>
                                                <div className='flex-1'>
                                                    <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                                        Role
                                                    </label>
                                                    <p className='text-sm cradle-text-muted'>Controls feature access level</p>
                                                </div>
                                                <div className='w-auto'>
                                                    <select
                                                        className='cradle-input inline-block text-sm h-10 rounded-full'
                                                        style={{ width: 'auto' }}
                                                        {...register('role')}
                                                    >
                                                        <option value='author'>User</option>
                                                        <option value='entrymanager'>Entry Manager</option>
                                                        <option value='admin'>Admin</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className='cradle-separator'></div>

                                            <div className='flex items-center justify-between gap-4 py-2'>
                                                <div className='flex-1'>
                                                    <label className='text-sm cradle-text-tertiary block mb-0.5 flex items-center gap-2'>
                                                        Email Confirmed
                                                    </label>
                                                    <p className='text-sm cradle-text-muted'>User's email confirmation status</p>
                                                </div>
                                                <label
                                                    htmlFor="emailConfirmed"
                                                    className='relative inline-flex items-center cursor-pointer'
                                                >
                                                    <input
                                                        id="emailConfirmed"
                                                        data-testid='emailConfirmed-toggle'
                                                        type='checkbox'
                                                        className='sr-only'
                                                        {...register('emailConfirmed')}
                                                    />
                                                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${watch('emailConfirmed') ? 'bg-cradle-accent-primary' : 'bg-gray-600'}`}>
                                                        <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform duration-200 ease-in-out ${watch('emailConfirmed') ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className='cradle-separator'></div>

                                            <div className='flex items-center justify-between gap-4 py-2'>
                                                <div className='flex-1'>
                                                    <label className='text-sm cradle-text-tertiary block mb-0.5 flex items-center gap-2'>
                                                        Active
                                                    </label>
                                                    <p className='text-sm cradle-text-muted'>Disabled accounts cannot log in</p>
                                                </div>
                                                <label
                                                    htmlFor="isActive"
                                                    className='relative inline-flex items-center cursor-pointer'
                                                >
                                                    <input
                                                        id="isActive"
                                                        data-testid='isActive-toggle'
                                                        type='checkbox'
                                                        className='sr-only'
                                                        {...register('isActive')}
                                                    />
                                                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${watch('isActive') ? 'bg-cradle-accent-primary' : 'bg-gray-600'}`}>
                                                        <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform duration-200 ease-in-out ${watch('isActive') ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                                    </div>
                                                </label>
                                            </div>

                                            {isAdminAndNotOwn && (
                                                <>
                                                    <div className='cradle-separator'></div>
                                                    <div className='flex items-center justify-between gap-4 py-2'>
                                                        <div className='flex-1'>
                                                            <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                                                Password
                                                            </label>
                                                            <p className='text-sm cradle-text-muted'>Set a new password for this user</p>
                                                        </div>
                                                        <div className='w-48'>
                                                            <input
                                                                type='password'
                                                                placeholder='Password'
                                                                className='cradle-input w-full text-sm h-10 rounded-full'
                                                                {...register('password')}
                                                            />
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </section>
                                )}
                            </div>
                        </section>

                        {(isOwnAccount || (twoFactorEnabled || isOwnAccount)) && (
                            <section
                                id='security'
                                className='border-t border-white/5 pt-5 pb-8'
                            >
                                <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                                    Security
                                </h2>
                                <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                    Authentication, API keys, and account security
                                </p>

                                <div className='space-y-4'>
                                    {/* Authentication Card */}
                                    <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-1 space-y-0'>
                                        {isOwnAccount && (
                                            <>
                                                <div className='flex items-center justify-between py-2'>
                                                    <div>
                                                        <span className='text-sm cradle-text-tertiary block mb-0.5'>
                                                            Password
                                                        </span>
                                                        <span className='text-sm cradle-text-muted'>
                                                            Change your account password
                                                        </span>
                                                    </div>
                                                    <button
                                                        type='button'
                                                        className='rounded-full border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary text-sm px-3 py-1.5 flex items-center gap-1.5'
                                                        onClick={openChangePasswordModal}
                                                        title='Change Password'
                                                    >
                                                        <Lock className='w-3.5 h-3.5' />
                                                        <span>Change</span>
                                                    </button>
                                                </div>

                                                <div className='cradle-separator'></div>

                                                <div className='flex items-center justify-between py-2'>
                                                    <div>
                                                        <span className='text-sm cradle-text-tertiary block mb-0.5'>
                                                            API Key
                                                        </span>
                                                        <span className='text-sm cradle-text-muted'>
                                                            Generate key for API access
                                                        </span>
                                                    </div>
                                                    <button
                                                        type='button'
                                                        className='rounded-full border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary text-sm px-3 py-1.5 flex items-center gap-1.5'
                                                        onClick={openApiKeyModal}
                                                        title='Generate API Key'
                                                    >
                                                        <Key className='w-3.5 h-3.5' />
                                                        <span>Generate</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {(twoFactorEnabled || isOwnAccount) && (
                                            <>
                                                {isOwnAccount && <div className='cradle-separator'></div>}
                                                <div className='flex items-center justify-between py-2'>
                                                    <div>
                                                        <span className='text-sm cradle-text-tertiary block mb-0.5'>
                                                            Two-Factor Auth
                                                        </span>
                                                        <span className='text-sm cradle-text-muted'>
                                                            Protect your account with one-time codes from an authenticator app
                                                        </span>
                                                    </div>
                                                    <button
                                                        type='button'
                                                        className={`text-sm px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${twoFactorEnabled
                                                            ? 'border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/10 bg-transparent'
                                                            : 'border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent text-cradle-text-secondary hover:text-cradle-text-primary'
                                                            }`}
                                                        onClick={openTwoFactorModal}
                                                    >
                                                        <Lock className='w-3.5 h-3.5' />
                                                        <span>{twoFactorEnabled ? 'Disable' : 'Enable'}</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {isOwnAccount && (
                                            <>
                                                <div className='cradle-separator'></div>
                                                <div className='flex items-center justify-between py-2'>
                                                    <div>
                                                        <span className='text-sm cradle-text-tertiary block mb-0.5'>
                                                            Delete Account
                                                        </span>
                                                        <span className='text-sm cradle-text-muted'>
                                                            Permanently remove account and data
                                                        </span>
                                                    </div>
                                                    <button
                                                        type='button'
                                                        className='rounded-full border border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/10 bg-transparent text-sm px-3 py-1.5 transition-colors flex items-center gap-1.5'
                                                        onClick={openDeleteAccountModal}
                                                    >
                                                        <Trash className='w-3.5 h-3.5' />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Interface Section */}
                        <section
                            id='interface'
                            className='border-t border-white/5 pt-5 pb-8'
                        >
                            <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                                Interface
                            </h2>
                            <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                Customize your editing and viewing experience
                            </p>

                            <div className='space-y-4'>
                                {/* Appearance Card */}
                                <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-1 space-y-0'>
                                    <div className='flex items-center justify-between gap-4 py-2'>
                                        <div className='flex-1'>
                                            <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                                Theme
                                            </label>
                                            <p className='text-sm cradle-text-muted'>Choose your preferred color scheme</p>
                                        </div>
                                        <button
                                            type='button'
                                            onClick={() => setValue('theme', watch('theme') === 'dark' ? 'light' : 'dark')}
                                            className='p-2 rounded-full transition-colors bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
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
                                                <label className='text-sm cradle-text-tertiary block mb-0.5 flex items-center gap-2'>
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
                                                <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${watch('vimMode') ? 'bg-cradle-accent-primary' : 'bg-gray-600'}`}>
                                                    <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform duration-200 ease-in-out ${watch('vimMode') ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className='cradle-separator'></div>

                                    <div className='flex items-center justify-between py-2'>
                                        <div>
                                            <span className='text-sm cradle-text-tertiary block mb-0.5'>
                                                Note Template
                                            </span>
                                            <span className='text-sm cradle-text-muted'>
                                                Preset structure for new notes you create
                                            </span>
                                        </div>
                                        <button
                                            type='button'
                                            className='rounded-full border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary text-sm px-3 py-1.5 flex items-center gap-1.5'
                                            onClick={openNoteTemplateModal}
                                            disabled={noteTemplateLoading}
                                        >
                                            <Edit className='w-3.5 h-3.5' />
                                            {noteTemplateLoading ? 'Loading...' : 'Edit'}
                                        </button>
                                    </div>

                                    <div className='cradle-separator'></div>

                                    <div className='flex items-center justify-between py-2'>
                                        <div>
                                            <span className='text-sm cradle-text-tertiary block mb-0.5'>Note Snippets</span>
                                            <p className='text-sm cradle-text-muted'>Reusable text blocks you can insert with shortcuts</p>
                                        </div>
                                        <button
                                            type='button'
                                            className='rounded-full border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary text-sm px-3 py-1.5 flex items-center gap-1.5'
                                            onClick={() => {
                                                snippetListRef.current?.handleAddSnippet();
                                            }}
                                        >
                                            <Plus className='w-3.5 h-3.5' />
                                            New Snippet
                                        </button>
                                    </div>
                                    <div className='mt-4'>
                                        <SnippetList ref={snippetListRef} userId={target} showTitle={false} />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Save Button - Only for new user creation */}
                        {!isEdit && (
                            <div className='border-t border-white/5 pt-5 flex justify-end'>
                                <button
                                    type='submit'
                                    className='cradle-btn cradle-btn-primary px-6 rounded-full'
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