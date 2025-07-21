import React, { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import AlertBox from '../AlertBox/AlertBox';
import vimIcon from '../../assets/vim32x32.gif';
import { Edit } from 'iconoir-react';
import FormField from '../FormField/FormField';
import useAuth from '../../hooks/useAuth/useAuth';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import SnippetList from '../SnippetList/SnippetList';
import { displayError } from '../../utils/responseUtils/responseUtils';
import {
    getUser,
    updateUser,
    deleteUser,
    createUser,
    generateApiKey,
    setDefaultNoteTemplate,
    getDefaultNoteTemplate,
} from '../../services/userService/userService';
import { Tabs, Tab } from '../Tabs/Tabs';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import ActionConfirmationModal from '../Modals/ActionConfirmationModal.jsx';
import MarkdownEditorModal from '../Modals/MarkdownEditorModal.jsx';
import TwoFactorSetupModal from '../Modals/TwoFactorSetupModal';
import AlertDismissible from '../AlertDismissible/AlertDismissible.jsx';

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
});

export default function AccountSettings({ target, isEdit = true, onAdd }) {
    const navigate = useNavigate();
    const auth = useAuth();
    const { profile, setProfile, isAdmin } = useProfile();
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
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

                setAlert({
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
            };
            try {
                let result = await createUser(payload);

                if (result.status === 200) {
                    setAlert({
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

    const handleGenerateApiKey = () => {
        setModal(ActionConfirmationModal, {
            text: 'Are you sure you want to generate a new API key? This will invalidate the current key.',
            onConfirm: async () => {
                try {
                    const response = await generateApiKey(getValues('id'));
                    if (response.status === 200) {
                        setAlert({
                            show: true,
                            message: 'API key generated successfully!',
                            color: 'green',
                            code: response.data.api_key,
                        });
                    }
                } catch (err) {
                    displayError(setAlert)(err);
                }
            },
        });
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

    const handle2FASetup = () => {
        if (twoFactorEnabled) {
            if (isOwnAccount) {
                setModal(TwoFactorSetupModal, {
                    isDisabling: true,
                    onSuccess: () => {
                        setTwoFactorEnabled(false);
                        setAlert({
                            show: true,
                            message:
                                '2FA has been successfully disabled for your account',
                            color: 'green',
                        });
                    },
                });
            } else {
                updateUser(target, {
                    two_factor_enabled: false,
                });
                setTwoFactorEnabled(false);
                setAlert({
                    show: true,
                    message:
                        '2FA has been successfully disabled for the selected account!',
                    color: 'green',
                });
            }
        } else {
            setModal(TwoFactorSetupModal, {
                isDisabling: false,
                onSuccess: () => {
                    setTwoFactorEnabled(true);
                    setAlert({
                        show: true,
                        message: '2FA has been successfully enabled for your account',
                        color: 'green',
                    });
                },
            });
        }
    };

    return (
        <>
            <AlertDismissible alert={popup} setAlert={setPopup} />
            <div className='flex items-center justify-center min-h-screen'>
                <div className='w-full max-w-2xl px-4'>
                    <h1 className='text-center text-xl font-bold text-primary mb-4'>
                        {isEdit ? 'Settings' : 'Add New User'}
                    </h1>
                    <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-blur-sm rounded-md'>
                        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                            <Tabs tabClasses='tabs gap-1' perTabClass='tab-pill'>
                                <Tab title='Account'>
                                    <div className='mt-4' />
                                    <FormField
                                        name='username'
                                        type='text'
                                        labelText='Username'
                                        placeholder='Username'
                                        {...register('username')}
                                        error={errors.username?.message}
                                        disabled={!isAdminAndNotOwn && isEdit}
                                    />
                                    <div className='mt-4' />
                                    <FormField
                                        name='email'
                                        type='text'
                                        labelText='Email'
                                        placeholder='Email'
                                        {...register('email')}
                                        error={errors.email?.message}
                                        disabled={!isAdminAndNotOwn && isEdit}
                                    />

                                    {isEdit ? (
                                        isAdminAndNotOwn && (
                                            <div className='mt-4'>
                                                <FormField
                                                    name='password'
                                                    type='password'
                                                    labelText='Password'
                                                    placeholder='Password'
                                                    {...register('password')}
                                                    error={errors.password?.message}
                                                />
                                            </div>
                                        )
                                    ) : (
                                        <div className='mt-4'>
                                            <FormField
                                                name='password'
                                                type='password'
                                                labelText='Password'
                                                placeholder='Password'
                                                {...register('password')}
                                                error={errors.password?.message}
                                            />
                                        </div>
                                    )}
                                    {isAdmin() && (!isEdit || isAdminAndNotOwn) && (
                                        <>
                                            <div className='w-full mt-4'>
                                                <label className='block text-sm font-medium'>
                                                    Role
                                                </label>
                                                <div className='mt-1'>
                                                    <select
                                                        className='form-select select select-ghost-primary select-block focus:ring-0'
                                                        {...register('role')}
                                                    >
                                                        <option value='author'>
                                                            User
                                                        </option>
                                                        <option value='entrymanager'>
                                                            Entry Manager
                                                        </option>
                                                        <option value='admin'>
                                                            Admin
                                                        </option>
                                                    </select>
                                                </div>
                                                {errors.role && (
                                                    <p className='text-red-600 text-sm'>
                                                        {errors.role.message}
                                                    </p>
                                                )}
                                            </div>
                                            <div className='mt-4' />
                                            <FormField
                                                type='checkbox'
                                                labelText='Email Confirmed'
                                                className='switch switch-ghost-primary'
                                                {...register('email_confirmed')}
                                                row={true}
                                                error={errors.email_confirmed?.message}
                                            />
                                            <div className='mt-4' />
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

                                    <button
                                        type='submit'
                                        className='btn btn-primary btn-block mt-4'
                                        disabled={!isDirty}
                                    >
                                        {isEdit ? 'Save' : 'Add'}
                                    </button>
                                </Tab>
                                <Tab title='API Keys'>
                                    <div className='mt-4' />
                                    <FormField
                                        name='vtKey'
                                        type='password'
                                        labelText='VirusTotal API Key'
                                        placeholder='VirusTotal API Key'
                                        {...register('vtKey')}
                                        error={errors.vtKey?.message}
                                    />
                                    <div className='mt-4' />
                                    <FormField
                                        name='catalystKey'
                                        type='password'
                                        labelText='Catalyst API Key'
                                        placeholder='Catalyst API Key'
                                        {...register('catalystKey')}
                                        error={errors.catalystKey?.message}
                                    />

                                    <button
                                        type='submit'
                                        className='btn btn-primary btn-block mt-4'
                                        disabled={!isDirty}
                                    >
                                        {isEdit ? 'Save' : 'Add'}
                                    </button>
                                </Tab>
                                {isEdit && (twoFactorEnabled || isOwnAccount) && (
                                    <Tab title='Security'>
                                        <div className='space-y-4'>
                                            <div className='mt-4' />
                                            <div className='flex flex-col space-y-4'>
                                                {isOwnAccount && (
                                                    <>
                                                        <button
                                                            type='button'
                                                            className='btn btn-primary btn-block'
                                                            onClick={() =>
                                                                navigate(
                                                                    '/change-password',
                                                                )
                                                            }
                                                        >
                                                            Change Password
                                                        </button>

                                                        <button
                                                            type='button'
                                                            className='btn btn-primary btn-block'
                                                            onClick={
                                                                handleGenerateApiKey
                                                            }
                                                        >
                                                            Generate API Key
                                                        </button>
                                                    </>
                                                )}

                                                {(twoFactorEnabled || isOwnAccount) && (
                                                    <button
                                                        type='button'
                                                        className={`btn btn-primary btn-block ${twoFactorEnabled ? 'bg-red-500' : ''}`}
                                                        onClick={handle2FASetup}
                                                    >
                                                        {isEdit && twoFactorEnabled
                                                            ? 'Disable Two-Factor Authentication'
                                                            : 'Enable Two-Factor Authentication'}
                                                    </button>
                                                )}

                                                {isOwnAccount && (
                                                    <button
                                                        type='button'
                                                        className='btn btn-primary btn-block bg-red-500'
                                                        onClick={() =>
                                                            setModal(
                                                                ConfirmDeletionModal,
                                                                {
                                                                    text: 'Are you sure you want to delete your account? All data related to you will be deleted.',
                                                                    onConfirm:
                                                                        handleDelete,
                                                                },
                                                            )
                                                        }
                                                    >
                                                        Delete Account
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </Tab>
                                )}
                                <Tab title='Interface'>
                                    <div className='mt-4' />
                                    <div className='form-control flex flex-column justify-between items-center'>
                                        <label
                                            htmlFor={vimModeId}
                                            className='flex flex-row items-center cursor-pointer w-full'
                                        >
                                            <img
                                                src={vimIcon}
                                                alt=''
                                                style={{
                                                    width: '25px',
                                                    marginRight: '5px',
                                                }}
                                            />
                                            Vim Mode
                                            <input
                                                id={vimModeId}
                                                data-testid='vim-toggle'
                                                name='vim-toggle'
                                                type='checkbox'
                                                className='switch switch-ghost-primary ml-auto'
                                                {...register('vimMode')}
                                            />
                                        </label>
                                    </div>
                                    <div className='mt-4' />
                                    <FormField
                                        type='checkbox'
                                        labelText='Compact UI'
                                        className='switch switch-ghost-primary'
                                        {...register('compact_ui')}
                                        row={true}
                                        error={errors.email_confirmed?.message}
                                    />
                                    <div className='mt-4' />
                                    <SnippetList userId={target} />

                                    <div className='mt-4' />

                                    <button
                                        type='button'
                                        className={'btn btn-solid btn-block'}
                                        onClick={editDefaultNoteTemplate}
                                    >
                                        <span className='flex items-center'>
                                            <Edit className='w-4 h-4 mr-2' />
                                            Edit Default Note Template
                                        </span>
                                    </button>
                                    <button
                                        type='submit'
                                        className='btn btn-primary btn-block mt-4'
                                        disabled={!isDirty}
                                    >
                                        {isEdit ? 'Save' : 'Add'}
                                    </button>
                                </Tab>
                            </Tabs>
                            <AlertBox alert={alert} />
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
