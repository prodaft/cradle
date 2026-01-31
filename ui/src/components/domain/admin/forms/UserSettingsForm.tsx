import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
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
        formState: { errors, isDirty, isSubmitting },
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
        onSuccess: (_, variables) => {
            reset(variables);
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
            <div className='flex items-center justify-center min-h-screen text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit as any)}>
            <div className='flex flex-col gap-6'>
                {/* Registration Section */}
                <div className='flex flex-col gap-4'>
                    <h3 className='font-semibold text-base'>Registration</h3>
                    <FieldGroup>
                        <Controller
                            name='allowRegistration'
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field
                                    orientation='responsive'
                                    data-invalid={fieldState.invalid}
                                >
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
                                        {fieldState.invalid && (
                                            <FieldError className='text-sm mt-1'>
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
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

                        <Controller
                            name='requireEmailActivation'
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field
                                    orientation='responsive'
                                    data-invalid={fieldState.invalid}
                                >
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
                                        {fieldState.invalid && (
                                            <FieldError className='text-sm mt-1'>
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
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

                        <Controller
                            name='requireAdminConfirmation'
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field
                                    orientation='responsive'
                                    data-invalid={fieldState.invalid}
                                >
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
                                        {fieldState.invalid && (
                                            <FieldError className='text-sm mt-1'>
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
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
