import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import useApi from '@/hooks/api/useApi';
import { SettingsCard } from '../../../forms';

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
    const [isLoading, setIsLoading] = useState(true);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        control,
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
            toast.success('Account settings updated successfully!');
            if (onAdd) onAdd();
        } catch (error) {
            toast.error('Failed to save settings');
        }
    };

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='animate-pulse text-foreground'>Loading...</div>
            </div>
        );
    }

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>User Settings</h2>
                    <p className='text-muted-foreground'>Configure user registration and authentication</p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full'>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        {/* Registration Section */}
                        <section id='registration' className='pb-8'>
                            <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                                Registration
                            </h2>
                            <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                Control how new users can join the system
                            </p>

                            <div className='space-y-4'>
                                <SettingsCard>
                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <Label htmlFor='allowRegistration' className='text-sm text-muted-foreground block mb-0.5'>
                                                    Allow Registration
                                                </Label>
                                                <p className='text-sm text-muted-foreground'>Allow new users to register for accounts</p>
                                                {errors.allowRegistration && (
                                                    <p className='text-sm text-destructive mt-1'>{errors.allowRegistration.message}</p>
                                                )}
                                            </div>
                                            <Controller
                                                name='allowRegistration'
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id='allowRegistration'
                                                        name={field.name}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <Label htmlFor='requireEmailActivation' className='text-sm text-muted-foreground block mb-0.5'>
                                                    Require Email Activation
                                                </Label>
                                                <p className='text-sm text-muted-foreground'>Users must verify their email before accessing the system</p>
                                                {errors.requireEmailActivation && (
                                                    <p className='text-sm text-destructive mt-1'>{errors.requireEmailActivation.message}</p>
                                                )}
                                            </div>
                                            <Controller
                                                name='requireEmailActivation'
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id='requireEmailActivation'
                                                        name={field.name}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <Label htmlFor='requireAdminConfirmation' className='text-sm text-muted-foreground block mb-0.5'>
                                                    Require Admin Confirmation
                                                </Label>
                                                <p className='text-sm text-muted-foreground'>New accounts must be approved by an administrator</p>
                                                {errors.requireAdminConfirmation && (
                                                    <p className='text-sm text-destructive mt-1'>{errors.requireAdminConfirmation.message}</p>
                                                )}
                                            </div>
                                            <Controller
                                                name='requireAdminConfirmation'
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id='requireAdminConfirmation'
                                                        name={field.name}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>
                                </SettingsCard>
                            </div>
                        </section>

                        {/* Save Button */}
                        <div className='border-t border-white/5 pt-5 flex justify-end'>
                            <Button
                                type='submit'
                                variant='default'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : 'Save Settings'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
