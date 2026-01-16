import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

interface UserSettingsFormProps {
    onAdd?: () => void;
}

const accountSettingsSchema = z.object({
    allowRegistration: z.boolean().default(false),
    requireEmailActivation: z.boolean().default(false),
    requireAdminConfirmation: z.boolean().default(false),
});

type UserSettingsFormData = z.infer<typeof accountSettingsSchema>;

export default function UserSettingsForm({ onAdd }: UserSettingsFormProps) {
    const { managementApi } = useApi();

    const {
        register,
        handleSubmit,
        reset,
        watch,
        control,
        formState: { errors, isSubmitting },
    } = useForm<UserSettingsFormData>({
        resolver: zodResolver(accountSettingsSchema) as any,
        defaultValues: {
            allowRegistration: false,
            requireEmailActivation: false,
            requireAdminConfirmation: false,
        },
    });

    // Query for management settings
    const {
        data: settingsData,
        isPending,
        isPaused,
    } = useQuery({
        queryKey: queryKeys.management.settings(),
        queryFn: () => managementApi.managementSettingsRetrieve(),
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    // Mutation for saving settings
    const saveMutation = useMutation({
        mutationFn: (data: UserSettingsFormData) =>
            managementApi.managementSettingsCreate({
                requestBody: {
                    users: {
                        allow_registration: data.allowRegistration,
                        require_email_confirmation: data.requireEmailActivation,
                        require_admin_confirmation: data.requireAdminConfirmation,
                    },
                },
            }),
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.management.settings() }],
            successMessage: 'Account settings updated successfully!',
            errorMessage: 'Failed to save settings',
        },
    });

    // Populate form when settings data is loaded
    useEffect(() => {
        if (settingsData && settingsData.users) {
            reset({
                allowRegistration: settingsData.users.allow_registration ?? false,
                requireEmailActivation:
                    settingsData.users.require_email_confirmation ?? false,
                requireAdminConfirmation:
                    settingsData.users.require_admin_confirmation ?? false,
            });
        }
    }, [settingsData, reset]);

    const onSubmit = async (data: UserSettingsFormData) => {
        try {
            await saveMutation.mutateAsync(data);
            if (onAdd) onAdd();
        } catch (error) {
            // Error already handled by mutation
        }
    };

    if (isPending) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='animate-pulse text-foreground'>Loading...</div>
            </div>
        );
    }

    return (
        <div className='w-full h-full'>
            <div className='w-full'>
                <form onSubmit={handleSubmit(onSubmit as any)}>
                    {/* Registration Section */}
                    <section id='registration' className='pb-8'>
                        <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                            Registration
                        </h2>
                        <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                            Control how new users can join the system
                        </p>

                        <div className='space-y-4'>
                            <Card className='rounded-lg border-border bg-muted/5 space-y-0'>
                                <CardContent className='px-4 py-1'>
                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <Label
                                                    htmlFor='allowRegistration'
                                                    className='text-sm text-muted-foreground block mb-0.5'
                                                >
                                                    Allow Registration
                                                </Label>
                                                <p className='text-sm text-muted-foreground'>
                                                    Allow new users to register for
                                                    accounts
                                                </p>
                                                {errors.allowRegistration && (
                                                    <p className='text-sm text-destructive mt-1'>
                                                        {
                                                            errors.allowRegistration
                                                                .message
                                                        }
                                                    </p>
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
                                                <Label
                                                    htmlFor='requireEmailActivation'
                                                    className='text-sm text-muted-foreground block mb-0.5'
                                                >
                                                    Require Email Activation
                                                </Label>
                                                <p className='text-sm text-muted-foreground'>
                                                    Users must verify their email before
                                                    accessing the system
                                                </p>
                                                {errors.requireEmailActivation && (
                                                    <p className='text-sm text-destructive mt-1'>
                                                        {
                                                            errors
                                                                .requireEmailActivation
                                                                .message
                                                        }
                                                    </p>
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
                                                <Label
                                                    htmlFor='requireAdminConfirmation'
                                                    className='text-sm text-muted-foreground block mb-0.5'
                                                >
                                                    Require Admin Confirmation
                                                </Label>
                                                <p className='text-sm text-muted-foreground'>
                                                    New accounts must be approved by an
                                                    administrator
                                                </p>
                                                {errors.requireAdminConfirmation && (
                                                    <p className='text-sm text-destructive mt-1'>
                                                        {
                                                            errors
                                                                .requireAdminConfirmation
                                                                .message
                                                        }
                                                    </p>
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
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    {/* Save Button */}
                    <div className='pt-2 flex justify-end'>
                        <Button type='submit' variant='default' disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
