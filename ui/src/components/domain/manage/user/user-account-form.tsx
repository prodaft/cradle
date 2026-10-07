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
import { queryKeys } from '@/hooks/query';
import { USER_ROLE_OPTIONS } from '@/utils/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowCounterClockwiseIcon,
    ClockCounterClockwiseIcon,
    FloppyDiskIcon,
} from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import isEqual from 'lodash/isEqual';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
});

type FormData = z.infer<typeof schema>;

export default function UserAccountForm({
    userId,
    isOtherAdmin,
}: UserAccountFormProps) {
    const queryClient = useQueryClient();
    const previousValuesRef = useRef<Partial<FormData> | null>(null);

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
        getValues,
        watch,
        control,
        formState: { isDirty },
    } = useForm<FormData>({
        resolver: zodResolver(schema) as any,
        defaultValues: { id: '', username: '', email: '', role: 'author' },
    });

    useEffect(() => {
        if (!user) return;
        const values = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role || 'author',
        };
        reset(values);
        previousValuesRef.current = values;
    }, [user, reset]);

    const save = () => {
        const values = getValues();
        const prev = previousValuesRef.current;
        if (!values.id) return;

        const payload: any = {};
        if (values.username !== prev?.username) payload.username = values.username;
        if (values.email !== prev?.email) payload.email = values.email;
        if (values.role !== prev?.role) payload.role = values.role;

        if (Object.keys(payload).length === 0) {
            toast.info('No changes to save');
            return;
        }

        updateUser.mutate(
            { userId: values.id, payload },
            {
                onSuccess: () => {
                    previousValuesRef.current = { ...prev, ...values };
                },
            },
        );
    };

    const revert = () => {
        if (previousValuesRef.current) reset(previousValuesRef.current);
    };
    const accountDefaultState = {
        username: user?.username ?? '',
        email: user?.email ?? '',
        role: user?.role || 'author',
    };
    const resetToDefaults = () => {
        const baseline = { ...accountDefaultState, id: user?.id };
        reset(baseline, { keepDefaultValues: true });
        previousValuesRef.current = baseline;
    };
    const isAtDefault =
        !!user &&
        isEqual(
            { username: watch('username'), email: watch('email'), role: watch('role') },
            accountDefaultState,
        );

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
                            onClick={revert}
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
                            onClick={resetToDefaults}
                            title='Default'
                        >
                            <ClockCounterClockwiseIcon
                                className='size-4'
                                weight='bold'
                            />
                        </Button>
                        <Button
                            type='button'
                            variant='default'
                            size='icon'
                            disabled={updateUser.isPending || !isDirty}
                            onClick={save}
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
                                            disabled={isOtherAdmin}
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
                    </FieldGroup>
                </div>
            </section>
        </>
    );
}
