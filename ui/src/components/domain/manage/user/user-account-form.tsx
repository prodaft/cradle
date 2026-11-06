import {
    SettingsHeaderActionsPortal,
    SettingsSaveButton,
} from '@/components/base/settings-header-actions/settings-header-actions';
import { SelectContent } from '@/components/custom/select';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import { USER_ROLE_OPTIONS } from '@/utils/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { $api, fetchClient } from '@services/openapi/client';
import { type components, userRoleEnumValues } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

interface UserAccountFormProps {
    userId: string;
    isOtherAdmin: boolean;
}

const schema = z.object({
    id: z.string().optional(),
    username: z.string().min(1, { error: 'Username is required' }),
    email: z.email({ error: 'Invalid email' }).min(1, { error: 'Email is required' }),
    role: z.enum(userRoleEnumValues, { error: 'Role is required' }),
    emailConfirmed: z.boolean().optional(),
    isActive: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;
type PatchedUserUpdateRequest = components['schemas']['PatchedUserUpdateRequest'];

export default function UserAccountForm({
    userId,
    isOtherAdmin,
}: UserAccountFormProps) {
    const { userId: currentUserId } = useAuthState();
    const isSelf = userId === currentUserId;

    const { data: user } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: userId } } },
        { enabled: !!userId, meta: { suppressNotification: true } },
    );

    const updateUser = useMutation({
        mutationFn: async ({
            userId,
            payload,
        }: {
            userId: string;
            payload: PatchedUserUpdateRequest;
        }) => {
            const { error, response } = await fetchClient.PATCH('/users/{user_id}/', {
                params: { path: { user_id: userId } },
                body: payload,
            });
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'User settings saved successfully',
            invalidateQueries: [
                { queryKey: queryKeys.users.apiDetails() },
                { queryKey: queryKeys.users.apiList() },
            ],
        },
    });

    const {
        reset,
        handleSubmit,
        control,
        formState: { isDirty, dirtyFields },
    } = useForm<FormData>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
            id: '',
            username: '',
            email: '',
            role: 'author',
            emailConfirmed: false,
            isActive: false,
        },
    });

    useEffect(() => {
        if (!user) return;
        const values: FormData = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role || 'author',
            emailConfirmed: user.email_confirmed || false,
            isActive: user.is_active || false,
        };
        reset(values);
    }, [user, reset]);

    const save = (values: FormData) => {
        if (!values.id) return;

        const payload: PatchedUserUpdateRequest = {};
        if (dirtyFields.username) payload.username = values.username;
        if (dirtyFields.email) payload.email = values.email;
        if (dirtyFields.role) payload.role = values.role;
        if (dirtyFields.emailConfirmed) payload.email_confirmed = values.emailConfirmed;
        if (dirtyFields.isActive) payload.is_active = values.isActive;

        updateUser.mutate(
            { userId: values.id, payload },
            { onSuccess: () => reset(values) },
        );
    };

    if (!user) return null;

    return (
        <>
            {!isOtherAdmin && (
                <SettingsHeaderActionsPortal>
                    <SettingsSaveButton
                        isDirty={isDirty}
                        saving={updateUser.isPending}
                        onSave={handleSubmit(save)}
                    />
                </SettingsHeaderActionsPortal>
            )}
            <section id='account'>
                <div className='flex flex-col gap-4'>
                    <FieldGroup className='gap-4'>
                        <Controller
                            name='username'
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field
                                    orientation='responsive'
                                    data-invalid={fieldState.invalid}
                                >
                                    <FieldContent>
                                        <FieldLabel
                                            htmlFor='username'
                                            className='text-sm block'
                                        >
                                            Username
                                        </FieldLabel>
                                        <FieldDescription>
                                            User display name across the platform
                                        </FieldDescription>
                                        {fieldState.invalid && (
                                            <FieldError className='text-sm mt-1'>
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
                                    </FieldContent>
                                    <div className='w-64 shrink-0 self-start md:self-center'>
                                        <Input
                                            {...field}
                                            id='username'
                                            placeholder='Username'
                                            disabled={isOtherAdmin}
                                            aria-invalid={fieldState.invalid}
                                        />
                                    </div>
                                </Field>
                            )}
                        />

                        <Separator />

                        <Controller
                            name='email'
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field
                                    orientation='responsive'
                                    data-invalid={fieldState.invalid}
                                >
                                    <FieldContent>
                                        <FieldLabel
                                            htmlFor='email'
                                            className='text-sm block'
                                        >
                                            Email
                                        </FieldLabel>
                                        <FieldDescription>
                                            Used for login and notifications
                                        </FieldDescription>
                                        {fieldState.invalid && (
                                            <FieldError className='text-sm mt-1'>
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
                                    </FieldContent>
                                    <div className='w-64 shrink-0 self-start md:self-center'>
                                        <Input
                                            {...field}
                                            id='email'
                                            type='text'
                                            placeholder='Email'
                                            disabled={isOtherAdmin}
                                            aria-invalid={fieldState.invalid}
                                        />
                                    </div>
                                </Field>
                            )}
                        />

                        <Separator />

                        <Field orientation='responsive'>
                            <FieldContent>
                                <FieldLabel htmlFor='userId' className='text-sm block'>
                                    User ID
                                </FieldLabel>
                                <FieldDescription>
                                    Unique identifier for API integrations
                                </FieldDescription>
                            </FieldContent>
                            <div className='w-64 shrink-0 self-start md:self-center'>
                                <Input
                                    id='userId'
                                    type='text'
                                    value={user?.id || ''}
                                    className='opacity-60'
                                    disabled
                                    readOnly
                                />
                            </div>
                        </Field>

                        <Separator />

                        <Controller
                            name='role'
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field
                                    orientation='responsive'
                                    data-invalid={fieldState.invalid}
                                >
                                    <FieldContent>
                                        <FieldLabel className='text-sm block'>
                                            Role
                                        </FieldLabel>
                                        <FieldDescription>
                                            Determines access permissions
                                        </FieldDescription>
                                        {fieldState.invalid && (
                                            <FieldError className='text-sm mt-1'>
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
                                    </FieldContent>
                                    <div className='w-64 shrink-0 self-start md:self-center'>
                                        <Select
                                            items={USER_ROLE_OPTIONS}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={isOtherAdmin || isSelf}
                                        >
                                            <SelectTrigger
                                                className='w-full sm:w-64'
                                                aria-invalid={fieldState.invalid}
                                            >
                                                <SelectValue placeholder='Select a role' />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {USER_ROLE_OPTIONS.map((role) => (
                                                    <SelectItem
                                                        key={role.value}
                                                        value={role.value}
                                                    >
                                                        {role.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </Field>
                            )}
                        />

                        <Separator />

                        <Controller
                            name='emailConfirmed'
                            control={control}
                            render={({ field }) => (
                                <Field orientation='responsive'>
                                    <FieldContent>
                                        <FieldLabel
                                            htmlFor='emailConfirmed'
                                            className='text-sm block mb-0.5'
                                        >
                                            Email Confirmed
                                        </FieldLabel>
                                        <FieldDescription>
                                            User's email confirmation status
                                        </FieldDescription>
                                    </FieldContent>
                                    <Switch
                                        id='emailConfirmed'
                                        name={field.name}
                                        data-testid='emailConfirmed-toggle'
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={isOtherAdmin || isSelf}
                                        className='self-start md:self-center'
                                    />
                                </Field>
                            )}
                        />

                        <Separator />

                        <Controller
                            name='isActive'
                            control={control}
                            render={({ field }) => (
                                <Field orientation='responsive'>
                                    <FieldContent>
                                        <FieldLabel
                                            htmlFor='isActive'
                                            className='text-sm block mb-0.5'
                                        >
                                            Active
                                        </FieldLabel>
                                        <FieldDescription>
                                            Disabled accounts cannot log in
                                        </FieldDescription>
                                    </FieldContent>
                                    <Switch
                                        id='isActive'
                                        name={field.name}
                                        data-testid='isActive-toggle'
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={isOtherAdmin || isSelf}
                                        className='self-start md:self-center'
                                    />
                                </Field>
                            )}
                        />
                    </FieldGroup>
                </div>
            </section>
        </>
    );
}
