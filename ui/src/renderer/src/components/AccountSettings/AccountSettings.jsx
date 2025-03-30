import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';
import useAuth from '../../hooks/useAuth/useAuth';
import { displayError } from '../../utils/responseUtils/responseUtils';
import {
    getUser,
    updateUser,
    deleteUser,
    createUser,
} from '../../services/userService/userService';
import { Tabs, Tab } from '../Tabs/Tabs';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';
import { useModal } from '../../contexts/ModalContext/ModalContext';

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

export default function AccountSettings({ target, isEdit = true }) {
    const navigate = useNavigate();
    const auth = useAuth();
    const isAdmin = auth?.isAdmin();
    const isOwnAccount = isEdit ? target === 'me' || auth?.userId === target : false;
    const isAdminAndNotOwn = isAdmin && !isOwnAccount;
    const { setModal } = useModal();

    const defaultValues = isEdit
        ? {
              id: '',
              username: '',
              email: '',
              password: 'password',
              vtKey: 'apikey',
              catalystKey: 'apikey',
              role: 'user',
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
              email_confirmed: false,
              is_active: false,
          };

    const {
        register,
        handleSubmit,
        reset,
        getValues,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(accountSettingsSchema, {
            context: { isEdit, isAdminAndNotOwn },
        }),
        defaultValues,
    });

    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

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
                        catalystKey: res.data.catalyst_api_key ? 'apikey' : '',
                        role: res.data.role || 'user',
                        email_confirmed: res.data.email_confirmed || false,
                        is_active: res.data.is_active || false,
                    });
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
            if (isAdminAndNotOwn) {
                payload.username = data.username;
                payload.email = data.email;
                payload.email_confirmed = data.email_confirmed;
                payload.is_active = data.is_active;
                payload.role = data.role;
            }
            try {
                await updateUser(data.id, payload);
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
            };
            try {
                await createUser(payload);
                setAlert({
                    show: true,
                    message: 'User created successfully',
                    color: 'green',
                });
                reset();
                navigate('/admin');
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

    return (
        <>
            <div className='flex items-center justify-center min-h-screen'>
                <div className='w-full max-w-md'>
                    <h1 className='text-center text-xl font-bold text-cradle2 mb-4'>
                        {isEdit ? 'Account Settings' : 'Add New User'}
                    </h1>
                    <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-blur-sm rounded-md'>
                        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                            <Tabs tabClasses='tabs gap-1' perTabClass='tab-pill'>
                                <Tab title='Settings'>
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

                                    <div className='mt-4' />
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
                                    {isAdmin && (!isEdit || isAdminAndNotOwn) && (
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
                                </Tab>
                            </Tabs>
                            <AlertBox alert={alert} />
                            <button
                                type='submit'
                                className='btn btn-primary btn-block mt-4'
                            >
                                {isEdit ? 'Save' : 'Add'}
                            </button>
                            {isEdit && isOwnAccount && (
                                <div className='flex justify-between'>
                                    <button
                                        type='button'
                                        className='btn btn-ghost btn-block hover:bg-red-500'
                                        onClick={() =>
                                            setModal(ConfirmDeletionModal, {
                                                text: 'Are you sure you want to delete your account? All data related to you will be deleted.',
                                                onConfirm: handleDelete,
                                            })
                                        }
                                    >
                                        Delete Account
                                    </button>
                                    <button
                                        type='button'
                                        className='btn btn-ghost btn-block'
                                        onClick={() => navigate('/change-password')}
                                    >
                                        Change Password
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
