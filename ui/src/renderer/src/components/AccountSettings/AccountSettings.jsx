import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import useAuth from '../../hooks/useAuth/useAuth';
import { displayError } from '../../utils/responseUtils/responseUtils';
import {
    getUser,
    updateUser,
    deleteUser,
    createUser,
} from '../../services/userService/userService';

/*
  The Yup schema is context-sensitive:
  - When adding a user (isEdit=false) the password is required.
  - When editing (isEdit=true), the default password value "password" means "unchanged".
  - Admin-only fields (role, email_confirmed, is_active) are only required when the logged in user is an admin
    editing another account (or adding a user).
*/
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

export default function AccountSettings({ isEdit = true }) {
    const { target } = useParams();
    const navigate = useNavigate();
    const auth = useAuth();
    const isAdmin = auth?.isAdmin();

    const isOwnAccount = isEdit ? target === 'me' || auth?.userId === target : false;
    const isAdminAndNotOwn = isAdmin && !isOwnAccount;

    // For deletion and update, the form's id is important.
    // In add mode, there is no existing id.
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
    const [dialog, setDialog] = useState(false);

    // In edit mode, load the user details to prepopulate the form.
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
        }
    }, [isEdit, target, reset, navigate]);

    const onSubmit = async (data) => {
        if (isEdit) {
            // For editing, only update password if it has been changed.
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
            // In add mode, all fields (including password) are taken as entered.
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
            <ConfirmationDialog
                open={dialog}
                setOpen={setDialog}
                title='Are you sure you want to delete your account?'
                description='This is permanent'
                handleConfirm={handleDelete}
            />
            <div className='flex flex-row items-center justify-center h-screen'>
                <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 md:h-fit xl:w-1/3'>
                    <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8'>
                        <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                            <h1 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-cradle2'>
                                {isEdit ? 'Account Settings' : 'Add New User'}
                            </h1>
                        </div>
                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm space-y-6'
                        >
                            <FormField
                                name='username'
                                type='text'
                                labelText='Username'
                                placeholder='Username'
                                {...register('username')}
                                error={errors.username?.message}
                                disabled={isEdit}
                            />
                            <FormField
                                name='email'
                                type='text'
                                labelText='Email'
                                placeholder='Email'
                                {...register('email')}
                                error={errors.email?.message}
                                disabled={isEdit}
                            />

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
                                // In add mode, always show the password field (and require it).
                                <FormField
                                    name='password'
                                    type='password'
                                    labelText='Password'
                                    placeholder='Password'
                                    {...register('password')}
                                    error={errors.password?.message}
                                />
                            )}

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

                            {isAdmin && (!isEdit || isAdminAndNotOwn) && (
                                <>
                                    <div className='w-full'>
                                        <label className='block text-sm font-medium leading-6'>
                                            Role
                                        </label>
                                        <div className='mt-2'>
                                            <select
                                                className='form-select select select-ghost-primary select-block focus:ring-0'
                                                {...register('role')}
                                            >
                                                <option value='author'>User</option>
                                                <option value='entrymanager'>
                                                    Entry Manager
                                                </option>
                                                <option value='admin'>Admin</option>
                                            </select>
                                        </div>
                                        {errors.role && (
                                            <p className='text-red-600 text-sm'>
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

                            <AlertBox alert={alert} />

                            <button type='submit' className='btn btn-primary btn-block'>
                                {isEdit ? 'Save' : 'Add'}
                            </button>
                            {isEdit && isOwnAccount && (
                                <div className='flex justify-between'>
                                    <button
                                        type='button'
                                        className='btn btn-ghost btn-block hover:bg-red-500'
                                        onClick={() => setDialog(!dialog)}
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
