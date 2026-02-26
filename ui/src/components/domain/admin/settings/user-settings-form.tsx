import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { queryKeys } from '@/hooks/query';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetchClient } from '@services/openapi/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';
import * as z from 'zod';

interface UserSettingsFormProps {
    onAdd?: () => void;
}

const accountSettingsSchema = z.object({
    allowRegistration: z.boolean(),
    requireEmailActivation: z.boolean(),
    requireAdminConfirmation: z.boolean(),
});

type UserSettingsFormData = z.infer<typeof accountSettingsSchema>;

export default function UserSettingsForm({ onAdd }: UserSettingsFormProps) {
    const {
        handleSubmit,
        reset,
        control,
        formState: { isDirty, isSubmitting },
    } = useForm<UserSettingsFormData>({
        resolver: zodResolver(accountSettingsSchema),
        defaultValues: {
            allowRegistration: false,
            requireEmailActivation: false,
            requireAdminConfirmation: false,
        },
    });

    const { data: settingsData, isPending } = useQuery({
        queryKey: queryKeys.management.settings(),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/management/settings/',
            );
            if (error) throw { response };
            return data;
        },
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (data: UserSettingsFormData) => {
            const { error, response } = await fetchClient.POST(
                '/management/settings/',
                {
                    body: {
                        users: {
                            allow_registration: data.allowRegistration,
                            require_email_confirmation: data.requireEmailActivation,
                            require_admin_confirmation: data.requireAdminConfirmation,
                        },
                    } as any,
                },
            );
            if (error) throw { response };
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.management.settings() }],
            successMessage: 'Account settings updated successfully!',
        },
        onSuccess: (_, variables) => {
            reset(variables);
        },
    });

    useEffect(() => {
        const settings = settingsData as any;
        if (settings?.users) {
            reset({
                allowRegistration: settings.users.allow_registration ?? false,
                requireEmailActivation:
                    settings.users.require_email_confirmation ?? false,
                requireAdminConfirmation:
                    settings.users.require_admin_confirmation ?? false,
            });
        }
    }, [settingsData, reset]);

    const onSubmit: SubmitHandler<UserSettingsFormData> = async (data) => {
        try {
            await saveMutation.mutateAsync(data);
            onAdd?.();
        } catch (_error) {
            // Error already handled by mutation
        }
    };

    if (isPending) {
        return (
            <div className='flex items-center justify-center min-h-screen text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className='flex flex-col gap-6'>
                {/* Registration Section */}
                <div className='flex flex-col gap-4'>
                    <h3 className='font-semibold text-base'>Registration</h3>
                    <FieldGroup className='gap-4'>
                        <Controller
                            name='allowRegistration'
                            control={control}
                            render={({ field }) => (
                                <Field orientation='responsive'>
                                    <FieldContent className='flex-1'>
                                        <FieldLabel
                                            htmlFor='allowRegistration'
                                            className='text-sm block mb-0.5'
                                        >
                                            Allow Registration
                                        </FieldLabel>
                                        <FieldDescription>
                                            Allow new users to register for accounts
                                        </FieldDescription>
                                    </FieldContent>
                                    <Switch
                                        id='allowRegistration'
                                        name={field.name}
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className='self-start md:self-center'
                                    />
                                </Field>
                            )}
                        />

                        <Separator />

                        <Controller
                            name='requireEmailActivation'
                            control={control}
                            render={({ field }) => (
                                <Field orientation='responsive'>
                                    <FieldContent className='flex-1'>
                                        <FieldLabel
                                            htmlFor='requireEmailActivation'
                                            className='text-sm block mb-0.5'
                                        >
                                            Require Email Activation
                                        </FieldLabel>
                                        <FieldDescription>
                                            Users must verify their email before
                                            accessing the system
                                        </FieldDescription>
                                    </FieldContent>
                                    <Switch
                                        id='requireEmailActivation'
                                        name={field.name}
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className='self-start md:self-center'
                                    />
                                </Field>
                            )}
                        />

                        <Separator />

                        <Controller
                            name='requireAdminConfirmation'
                            control={control}
                            render={({ field }) => (
                                <Field orientation='responsive'>
                                    <FieldContent className='flex-1'>
                                        <FieldLabel
                                            htmlFor='requireAdminConfirmation'
                                            className='text-sm block mb-0.5'
                                        >
                                            Require Admin Confirmation
                                        </FieldLabel>
                                        <FieldDescription>
                                            New accounts must be approved by an
                                            administrator
                                        </FieldDescription>
                                    </FieldContent>
                                    <Switch
                                        id='requireAdminConfirmation'
                                        name={field.name}
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className='self-start md:self-center'
                                    />
                                </Field>
                            )}
                        />
                    </FieldGroup>
                </div>
            </div>
            {/* Save Button */}
            <div className='pt-2 flex justify-end'>
                <Button
                    type='submit'
                    variant='default'
                    disabled={isSubmitting || !isDirty}
                >
                    {isSubmitting ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
        </form>
    );
}
