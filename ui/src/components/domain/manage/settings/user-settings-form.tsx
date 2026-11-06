import {
    SettingsHeaderActionsPortal,
    SettingsSaveButton,
} from '@/components/base/settings-header-actions/settings-header-actions';
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
import { invalidate, queryKeys } from '@/hooks/query';
import { zodResolver } from '@hookform/resolvers/zod';
import {} from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useId } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';
import * as z from 'zod';

type SystemSettings = components['schemas']['SystemSettings'];

interface UserSettingsFormProps {
    onAdd?: () => void;
}

const accountSettingsSchema = z.object({
    allowRegistration: z.boolean(),
    requireEmailActivation: z.boolean(),
    requireAdminConfirmation: z.boolean(),
});

type UserSettingsFormData = z.infer<typeof accountSettingsSchema>;

const USER_SETTINGS_DEFAULTS: UserSettingsFormData = {
    allowRegistration: false,
    requireEmailActivation: false,
    requireAdminConfirmation: true,
};

function getUserSettingsFromApi(
    settings: SystemSettings | null | undefined,
): UserSettingsFormData | null {
    if (!settings?.users) return null;
    const u = settings.users;
    return {
        allowRegistration: u.allow_registration ?? false,
        requireEmailActivation: u.require_email_confirmation ?? false,
        requireAdminConfirmation: u.require_admin_confirmation ?? false,
    };
}

export default function UserSettingsForm({ onAdd }: UserSettingsFormProps) {
    const formId = useId();

    const {
        handleSubmit,
        reset,
        control,
        formState: { isDirty, isSubmitting },
    } = useForm<UserSettingsFormData>({
        resolver: zodResolver(accountSettingsSchema),
        defaultValues: USER_SETTINGS_DEFAULTS,
    });

    const { data: settings, isPending } = $api.useQuery(
        'get',
        '/management/settings/',
        undefined,
        {
            refetchOnWindowFocus: false,
            meta: {
                showErrorToast: false,
                suppressNotification: true,
            },
        },
    );

    const saveSettings = useMutation({
        mutationFn: async (values: UserSettingsFormData) => {
            const { error, response } = await fetchClient.PATCH(
                '/management/settings/',
                {
                    body: {
                        users: {
                            allow_registration: values.allowRegistration,
                            require_email_confirmation: values.requireEmailActivation,
                            require_admin_confirmation: values.requireAdminConfirmation,
                        },
                    },
                },
            );
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: invalidate(queryKeys.management.settings()),
            successMessage: 'Account settings updated successfully!',
        },
        onSuccess: (_, variables) => {
            reset(variables);
        },
    });

    useEffect(() => {
        const values = getUserSettingsFromApi(settings);
        if (!values) return;
        reset(values);
    }, [settings, reset]);

    const onSubmit: SubmitHandler<UserSettingsFormData> = async (values) => {
        try {
            await saveSettings.mutateAsync(values);
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
        <>
            <SettingsHeaderActionsPortal>
                <SettingsSaveButton
                    isDirty={isDirty}
                    saving={isSubmitting}
                    form={formId}
                />
            </SettingsHeaderActionsPortal>
            <form id={formId} onSubmit={handleSubmit(onSubmit)}>
                <div className='flex flex-col gap-6'>
                    {/* Registration Section */}
                    <div className='flex flex-col gap-4'>
                        <div className='space-y-4'>
                            <h3 className='font-semibold text-base'>Registration</h3>
                            <Separator className='mt-4' />
                        </div>
                        <FieldGroup className='gap-4'>
                            <Controller
                                name='allowRegistration'
                                control={control}
                                render={({ field }) => (
                                    <Field orientation='responsive'>
                                        <FieldContent>
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
                                        <FieldContent>
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
                                        <FieldContent>
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
            </form>
        </>
    );
}
