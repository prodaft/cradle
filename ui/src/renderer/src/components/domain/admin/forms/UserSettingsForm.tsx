import useApi from '@/hooks/api/useApi';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { SettingsCard, SettingsSeparator, SettingsToggle } from '../../../forms';
import { useNotif } from '@/contexts/ui/NotificationContext';

interface UserSettingsFormProps {
    onAdd?: () => void;
}

interface FormData {
    allowRegistration: boolean;
    requireEmailActivation: boolean;
    requireAdminConfirmation: boolean;
}

const accountSettingsSchema = Yup.object().shape({
    allowRegistration: Yup.boolean().default(false),
    requireEmailActivation: Yup.boolean().default(false),
    requireAdminConfirmation: Yup.boolean().default(false),
});

export default function UserSettingsForm({ onAdd }: UserSettingsFormProps) {
    const { managementApi } = useApi();
    const { notify } = useNotif();
    const [isLoading, setIsLoading] = useState(true);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: yupResolver(accountSettingsSchema),
        defaultValues: {
            allowRegistration: false,
            requireEmailActivation: false,
            requireAdminConfirmation: false,
        },
    });

    useEffect(() => {
        async function fetchSettings() {
            try {
                const settings = await managementApi.managementSettingsRetrieve();
                if (settings && settings.users) {
                    reset({
                        allowRegistration: settings.users.allow_registration ?? false,
                        requireEmailActivation:
                            settings.users.require_email_confirmation ?? false,
                        requireAdminConfirmation:
                            settings.users.require_admin_confirmation ?? false,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch account settings:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, [managementApi, reset]);

    const onSubmit = async (data: FormData) => {
        try {
            await managementApi.managementSettingsCreate({
                requestBody: {
                    users: {
                        allow_registration: data.allowRegistration,
                        require_email_confirmation: data.requireEmailActivation,
                        require_admin_confirmation: data.requireAdminConfirmation,
                    },
                },
            });
            notify({
                type: 'success',
                text: 'Account settings updated successfully!',
            });
            if (onAdd) onAdd();
        } catch (error) {
            notify({
                type: 'error',
                text: 'Failed to save settings',
            });
        }
    };

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='animate-pulse cradle-text-secondary'>Loading...</div>
            </div>
        );
    }

    return (
        <div className='w-full h-full overflow-auto'>
            {/* Page Header */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        User Settings
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                        Configure user registration and authentication
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full'>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        {/* Registration Section */}
                        <section id='registration' className='pb-8'>
                            <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                                Registration
                            </h2>
                            <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                Control how new users can join the system
                            </p>

                            <div className='space-y-4'>
                                <SettingsCard>
                                    <SettingsToggle
                                        label='Allow Registration'
                                        description='Allow new users to register for accounts'
                                        {...register('allowRegistration')}
                                        watch={watch}
                                        error={errors.allowRegistration}
                                    />

                                    <SettingsSeparator />

                                    <SettingsToggle
                                        label='Require Email Activation'
                                        description='Users must verify their email before accessing the system'
                                        {...register('requireEmailActivation')}
                                        watch={watch}
                                        error={errors.requireEmailActivation}
                                    />

                                    <SettingsSeparator />

                                    <SettingsToggle
                                        label='Require Admin Confirmation'
                                        description='New accounts must be approved by an administrator'
                                        {...register('requireAdminConfirmation')}
                                        watch={watch}
                                        error={errors.requireAdminConfirmation}
                                    />
                                </SettingsCard>
                            </div>
                        </section>

                        {/* Save Button */}
                        <div className='border-t border-white/5 pt-5 flex justify-end'>
                            <button
                                type='submit'
                                className='cradle-btn cradle-btn-primary px-6 rounded-full'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
