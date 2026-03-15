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
import {
    ArrowCounterClockwiseIcon,
    ClockCounterClockwiseIcon,
    FloppyDiskIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import isEqual from 'lodash/isEqual';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

const USER_SETTINGS_DEFAULTS: UserSettingsFormData = {
    allowRegistration: false,
    requireEmailActivation: false,
    requireAdminConfirmation: true,
};

interface UserSettingsApi {
    users?: {
        allow_registration?: boolean;
        require_email_confirmation?: boolean;
        require_admin_confirmation?: boolean;
    };
}

function getUserSettingsFromApi(
    settings: UserSettingsApi | null | undefined,
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
    const loadedValuesRef = useRef<UserSettingsFormData | null>(null);

    const {
        handleSubmit,
        reset,
        watch,
        control,
        formState: { isDirty, isSubmitting },
    } = useForm<UserSettingsFormData>({
        resolver: zodResolver(accountSettingsSchema),
        defaultValues: USER_SETTINGS_DEFAULTS,
    });

    const { data: settingsData, isPending } = useQuery({
        queryKey: queryKeys.management.settings(),
        refetchOnWindowFocus: false,
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/management/settings/',
            );
            if (error) throw { response, error };
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
                    },
                },
            );
            if (error) throw { response, error };
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
        const values = getUserSettingsFromApi(settingsData);
        if (!values) return;
        loadedValuesRef.current = values;
        reset(values);
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

    const headerContainer =
        typeof document !== 'undefined'
            ? document.getElementById('settings-header-actions')
            : null;

    const handleRevert = () => {
        if (loadedValuesRef.current) reset(loadedValuesRef.current);
    };
    const handleDefault = () =>
        reset(USER_SETTINGS_DEFAULTS, { keepDefaultValues: true });
    const isAtDefault = isEqual(watch(), USER_SETTINGS_DEFAULTS);

    return (
        <>
            {headerContainer &&
                createPortal(
                    <div className='flex items-center gap-2'>
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            disabled={!isDirty}
                            onClick={handleRevert}
                            title='Revert'
                        >
                            <ArrowCounterClockwiseIcon
                                className='size-4'
                                weight='bold'
                            />
                        </Button>
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            disabled={isAtDefault}
                            onClick={handleDefault}
                            title='Default'
                        >
                            <ClockCounterClockwiseIcon
                                className='size-4'
                                weight='bold'
                            />
                        </Button>
                        <Button
                            type='submit'
                            form='settings-form'
                            variant='default'
                            size='icon'
                            disabled={isSubmitting || !isDirty}
                            title='Save Settings'
                        >
                            {isSubmitting ? (
                                <Spinner className='size-4' />
                            ) : (
                                <FloppyDiskIcon className='size-4' weight='bold' />
                            )}
                        </Button>
                    </div>,
                    headerContainer,
                )}
            <form id='settings-form' onSubmit={handleSubmit(onSubmit)}>
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
            </form>
        </>
    );
}
