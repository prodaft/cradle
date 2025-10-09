import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import {
    getSettings,
    setSettings,
} from '../../services/managementService/managementService';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';
import { Tab, Tabs } from '../Tabs/Tabs';

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
        <div className='min-h-screen cradle-bg-primary'>
            {/* Page Header - Full Width */}
            <div className='cradle-border-b cradle-bg-elevated'>
                <div className='max-w-6xl mx-auto px-6 py-6'>
                    <div className='flex items-center justify-between'>
                        <div>
                            <h1 className='text-2xl font-bold cradle-text-primary cradle-mono tracking-tight'>
                                System Settings
                            </h1>
                            <p className='text-sm cradle-text-tertiary cradle-mono mt-1'>
                                Configure system-wide preferences and policies
                            </p>
                        </div>
                        <div className='text-xs cradle-text-muted cradle-mono tracking-wider'>
                            SYSTEM SETTINGS
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className='max-w-6xl mx-auto px-6 py-8'>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Tabs
                        tabClasses='tabs gap-1 !bg-opacity-0'
                        perTabClass='tab-pill'
                    >
                        <Tab title='User Management'>
                            <div className='cradle-border cradle-bg-elevated p-6 mt-6'>
                                <div className='space-y-4'>
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
                                    <button
                                        type='submit'
                                        className='cradle-btn cradle-btn-primary w-full mt-6'
                                    >
                                        Save Settings
                                    </button>
                                </div>
                            </div>
                        </Tab>
                    </Tabs>
                    
                    {/* Alert at bottom */}
                    {alert.show && (
                        <div className='mt-6'>
                            <AlertBox alert={alert} />
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
