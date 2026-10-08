import { SettingsHeaderActionsPortal } from '@/components/base/settings-header-actions/settings-header-actions';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import { USER_ROLE_OPTIONS } from '@/utils/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowCounterClockwiseIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import bytes from 'bytes';
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
    role: z.string().min(1, { error: 'Role is required' }),
    emailConfirmed: z.boolean().optional(),
    isActive: z.boolean().optional(),
    fileUploadLimitOverride: z
        .string()
        .optional()
        .refine(
            (value) => {
                if (!value || value === '') return true;
                return typeof bytes(value) === 'number';
            },
            {
                error: 'Enter a valid size (e.g. 100MB, 1GB) or leave empty to use global default',
            },
        ),
});

type FormData = z.infer<typeof schema>;

export default function UserAccountForm({
    userId,
    isOtherAdmin,
}: UserAccountFormProps) {
    const queryClient = useQueryClient();
    const { userId: currentUserId } = useAuthState();
    const isSelf = userId === currentUserId;

    const { data: user } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: userId } } },
        { enabled: !!userId, meta: { suppressNotification: true } },
    );

    const updateUser = useMutation({
        mutationFn: async ({ userId, payload }: { userId: string; payload: any }) => {
            const { error, response } = await fetchClient.PATCH('/users/{user_id}/', {
                params: { path: { user_id: userId } },
                body: payload,
            });
            if (error) throw { response, error };
        },
        meta: { successMessage: 'User settings saved successfully' },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.users.detail(userId),
            });
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
            fileUploadLimitOverride: '',
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
            fileUploadLimitOverride: user.file_upload_limit_override
                ? (bytes.format(user.file_upload_limit_override, {
                      unitSeparator: ' ',
                  }) ?? '')
                : '',
        };
        reset(values);
    }, [user, reset]);

    const save = (values: FormData) => {
        if (!values.id) return;

        const payload: any = {};
        if (dirtyFields.username) payload.username = values.username;
        if (dirtyFields.email) payload.email = values.email;
        if (dirtyFields.role) payload.role = values.role;
        if (dirtyFields.emailConfirmed) payload.email_confirmed = values.emailConfirmed;
        if (dirtyFields.isActive) payload.is_active = values.isActive;
        if (dirtyFields.fileUploadLimitOverride) {
            payload.file_upload_limit_override = values.fileUploadLimitOverride?.trim()
                ? bytes.parse(values.fileUploadLimitOverride)
                : null;
        }

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
                    <div className='flex items-center gap-2'>
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            disabled={!isDirty}
                            onClick={() => reset()}
                            title='Revert'
                        >
                            <ArrowCounterClockwiseIcon
                                className='size-4'
                                weight='bold'
                            />
                        </Button>
                        <Button
                            type='button'
                            variant='default'
                            size='icon'
                            disabled={updateUser.isPending || !isDirty}
                            onClick={handleSubmit(save)}
                            title='Save Settings'
                        >
                            {updateUser.isPending ? (
                                <Spinner className='size-4' />
                            ) : (
                                <FloppyDiskIcon className='size-4' weight='bold' />
                            )}
                        </Button>
                    </div>
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
                                    <FieldContent className='flex-1'>
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
                                    <FieldContent className='flex-1'>
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
                            <FieldContent className='flex-1'>
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
                                    <FieldContent className='flex-1'>
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
                                    <FieldContent className='flex-1'>
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
                                    <FieldContent className='flex-1'>
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

                        <Separator />

                        <Controller
                            name='fileUploadLimitOverride'
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field
                                    orientation='responsive'
                                    data-invalid={fieldState.invalid}
                                >
                                    <FieldContent className='flex-1'>
                                        <FieldLabel
                                            htmlFor='fileUploadLimitOverride'
                                            className='text-sm block'
                                        >
                                            Upload Limit
                                        </FieldLabel>
                                        <FieldDescription>
                                            Override global file upload limit for this
                                            user (e.g., 100MB, 1GB). Leave empty to use
                                            global default.
                                        </FieldDescription>
                                        {fieldState.invalid && (
                                            <FieldError
                                                id='fileUploadLimitOverride-error'
                                                className='text-sm mt-1'
                                            >
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
                                    </FieldContent>
                                    <div className='w-64 shrink-0 self-start md:self-center'>
                                        <Input
                                            {...field}
                                            id='fileUploadLimitOverride'
                                            placeholder='e.g., 100MB, 1GB'
                                            disabled={isOtherAdmin || isSelf}
                                            aria-invalid={fieldState.invalid}
                                            aria-describedby={
                                                fieldState.invalid
                                                    ? 'fileUploadLimitOverride-error'
                                                    : undefined
                                            }
                                        />
                                    </div>
                                </Field>
                            )}
                        />
                    </FieldGroup>
                </div>
            </section>
        </>
    );
}
