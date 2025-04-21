import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';
import { Tabs, Tab } from '../Tabs/Tabs';
import {
    getSettings,
    setSettings,
} from '../../services/managementService/managementService';

const accountSettingsSchema = Yup.object().shape({
    allowRegistration: Yup.boolean(),
    requireEmailActivation: Yup.boolean(),
    requireAdminConfirmation: Yup.boolean(),
});

export default function UserSettingsForm({ onAdd }) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(accountSettingsSchema),
        defaultValues: {
            allowRegistration: false,
            requireEmailActivation: false,
            requireAdminConfirmation: false,
        },
    });

    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    useEffect(() => {
        async function fetchSettings() {
            try {
                const response = await getSettings();
                if (response.status === 200 && response.data) {
                    reset({
                        allowRegistration:
                            response.data.users?.allow_registration ?? false,
                        requireEmailActivation:
                            response.data.users?.require_email_confirmation ?? false,
                        requireAdminConfirmation:
                            response.data.users?.require_admin_confirmation ?? false,
                    });
                }
            } catch (error) {
                console.error(error);
                setAlert({
                    show: true,
                    message: 'Failed to fetch account settings',
                    color: 'red',
                });
            }
        }
        fetchSettings();
    }, [reset]);

    const onSubmit = async (data) => {
        try {
            const response = await setSettings({
                users: {
                    allow_registration: data.allowRegistration,
                    require_email_confirmation: data.requireEmailActivation,
                    require_admin_confirmation: data.requireAdminConfirmation,
                },
            });
            if (response.status === 200) {
                setAlert({
                    show: true,
                    message: 'Account settings updated successfully!',
                    color: 'green',
                });
            }
        } catch (error) {
            console.error(error);
            setAlert({
                show: true,
                message: 'Error updating account settings',
                color: 'red',
            });
        }
    };

    return (
        <div className='flex items-center justify-center min-h-screen'>
            <div className='w-full max-w-2xl px-4'>
                <h1 className='text-center text-xl font-bold text-primary mb-4'>
                    Account Settings
                </h1>
                <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-blur-sm rounded-md'>
                    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6 mb-3'>
                        <Tabs tabClasses='tabs gap-1' perTabClass='tab-pill'>
                            <Tab title='Settings'>
                                <div className='flex flex-col gap-3 pt-2'>
                                    <FormField
                                        type='checkbox'
                                        name='allowRegistration'
                                        labelText='Allow Registration'
                                        className='switch switch-ghost-primary'
                                        row={true}
                                        {...register('allowRegistration')}
                                        error={errors.allowRegistration?.message}
                                    />
                                    <FormField
                                        type='checkbox'
                                        name='requireEmailActivation'
                                        labelText='Require Email Activation'
                                        className='switch switch-ghost-primary'
                                        row={true}
                                        {...register('requireEmailActivation')}
                                        error={errors.requireEmailActivation?.message}
                                    />
                                    <FormField
                                        type='checkbox'
                                        name='requireAdminConfirmation'
                                        labelText='Require Admin Confirmation of New Accounts'
                                        className='switch switch-ghost-primary'
                                        row={true}
                                        {...register('requireAdminConfirmation')}
                                        error={errors.requireAdminConfirmation?.message}
                                    />
                                    <div className='flex gap-2 pt-4'>
                                        <button
                                            type='submit'
                                            className='btn btn-primary btn-block'
                                        >
                                            Save Settings
                                        </button>
                                    </div>
                                </div>
                            </Tab>
                        </Tabs>
                    </form>
                    <AlertBox alert={alert} />
                </div>
            </div>
        </div>
    );
}
