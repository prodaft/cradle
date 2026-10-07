import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { USER_ROLE_OPTIONS } from '@/utils/auth';
import { generatePassword } from '@/utils/password';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    DiceSixIcon,
    EyeIcon,
    EyeSlashIcon,
    UserPlusIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import bytes from 'bytes';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

type UserRetrieve = components['schemas']['UserRetrieve'];

interface AddUserFormProps {
    onAdd?: (result: UserRetrieve) => void;
}

const addUserSchema = z.object({
    username: z.string().min(1, { error: 'Username is required' }),
    email: z.email({ error: 'Invalid email' }).min(1, { error: 'Email is required' }),
    password: z
        .string()
        .min(8, { error: 'Password must be at least 8 characters' })
        .min(1, { error: 'Password is required' }),
    role: z.string().min(1, { error: 'Role is required' }),
    emailConfirmed: z.boolean().default(false),
    isActive: z.boolean().default(true),
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

type FormData = z.infer<typeof addUserSchema>;

export default function AddUserForm({ onAdd }: AddUserFormProps) {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(addUserSchema) as any,
        defaultValues: {
            username: '',
            email: '',
            password: '',
            role: 'author',
            emailConfirmed: false,
            isActive: true,
            fileUploadLimitOverride: '',
        },
    });

    const createUser = useMutation({
        mutationFn: async (data: FormData) => {
            const payload: any = {
                username: data.username,
                email: data.email,
                password: data.password,
                role: data.role,
                email_confirmed: data.emailConfirmed,
                is_active: data.isActive,
            };

            if (
                data.fileUploadLimitOverride &&
                data.fileUploadLimitOverride.trim() !== ''
            ) {
                payload.file_upload_limit_override = bytes.parse(
                    data.fileUploadLimitOverride,
                );
            }

            const {
                data: newUser,
                error,
                response,
            } = await fetchClient.POST('/users/', { body: payload });
            if (error) throw { response, error };
            return newUser;
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: (newUser) => {
            reset();
            setIsPasswordVisible(false);
            if (newUser && onAdd) onAdd(newUser);
        },
    });

    const onSubmit = async (data: FormData) => {
        createUser.mutate(data);
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className='flex w-full min-h-0 flex-col gap-4'
        >
            <div className='-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4'>
                <FieldGroup className='gap-4'>
                    <Field data-invalid={Boolean(errors.username)}>
                        <FieldLabel htmlFor='username'>
                            Username
                            <span className='text-destructive ml-1'>*</span>
                        </FieldLabel>
                        <InputGroup>
                            <InputGroupInput
                                id='username'
                                placeholder='Username'
                                {...register('username')}
                                aria-invalid={Boolean(errors.username)}
                                required
                            />
                        </InputGroup>
                        <FieldDescription>
                            Unique identifier for this user
                        </FieldDescription>
                        {errors.username && (
                            <FieldError>{errors.username.message}</FieldError>
                        )}
                    </Field>

                    <Field data-invalid={Boolean(errors.email)}>
                        <FieldLabel htmlFor='email'>
                            Email
                            <span className='text-destructive ml-1'>*</span>
                        </FieldLabel>
                        <InputGroup>
                            <InputGroupInput
                                id='email'
                                type='email'
                                placeholder='Email'
                                {...register('email')}
                                aria-invalid={Boolean(errors.email)}
                                required
                            />
                        </InputGroup>
                        <FieldDescription>
                            Used for login and notifications
                        </FieldDescription>
                        {errors.email && (
                            <FieldError>{errors.email.message}</FieldError>
                        )}
                    </Field>

                    <Field data-invalid={Boolean(errors.password)}>
                        <FieldLabel htmlFor='password'>
                            Password
                            <span className='text-destructive ml-1'>*</span>
                        </FieldLabel>
                        <InputGroup>
                            <InputGroupInput
                                id='password'
                                type={isPasswordVisible ? 'text' : 'password'}
                                placeholder='Password'
                                {...register('password')}
                                aria-invalid={Boolean(errors.password)}
                                required
                            />
                            <InputGroupAddon align='inline-end'>
                                <InputGroupButton
                                    type='button'
                                    onClick={() => {
                                        setValue('password', generatePassword(), {
                                            shouldValidate: true,
                                            shouldDirty: true,
                                        });
                                        setIsPasswordVisible(true);
                                    }}
                                    aria-label='Generate password'
                                    title='Generate password'
                                >
                                    <DiceSixIcon className='size-4' weight='bold' />
                                </InputGroupButton>
                                <InputGroupButton
                                    type='button'
                                    onClick={() =>
                                        setIsPasswordVisible(!isPasswordVisible)
                                    }
                                    aria-label={
                                        isPasswordVisible
                                            ? 'Hide password'
                                            : 'Show password'
                                    }
                                    title={
                                        isPasswordVisible
                                            ? 'Hide password'
                                            : 'Show password'
                                    }
                                >
                                    {isPasswordVisible ? (
                                        <EyeSlashIcon
                                            className='size-4'
                                            weight='bold'
                                        />
                                    ) : (
                                        <EyeIcon className='size-4' weight='bold' />
                                    )}
                                </InputGroupButton>
                            </InputGroupAddon>
                        </InputGroup>
                        <FieldDescription>
                            Minimum 8 characters recommended
                        </FieldDescription>
                        {errors.password && (
                            <FieldError>{errors.password.message}</FieldError>
                        )}
                    </Field>

                    <Field data-invalid={Boolean(errors.role)}>
                        <FieldLabel htmlFor='role'>
                            Role
                            <span className='text-destructive ml-1'>*</span>
                        </FieldLabel>
                        <Controller
                            name='role'
                            control={control}
                            render={({ field }) => (
                                <Select
                                    items={USER_ROLE_OPTIONS}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger className='w-full' id='role'>
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
                            )}
                        />
                        <FieldDescription>
                            Determines access permissions
                        </FieldDescription>
                        {errors.role && <FieldError>{errors.role.message}</FieldError>}
                    </Field>

                    <Field
                        orientation='horizontal'
                        data-invalid={Boolean(errors.emailConfirmed)}
                    >
                        <FieldContent>
                            <FieldLabel htmlFor='emailConfirmed'>
                                Email Confirmed
                            </FieldLabel>
                            <FieldDescription>
                                Mark email as confirmed (skip verification)
                            </FieldDescription>
                            {errors.emailConfirmed && (
                                <FieldError>{errors.emailConfirmed.message}</FieldError>
                            )}
                        </FieldContent>
                        <Controller
                            name='emailConfirmed'
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    id='emailConfirmed'
                                    name={field.name}
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className='self-center'
                                />
                            )}
                        />
                    </Field>

                    <Field
                        orientation='horizontal'
                        data-invalid={Boolean(errors.isActive)}
                    >
                        <FieldContent>
                            <FieldLabel htmlFor='isActive'>Active</FieldLabel>
                            <FieldDescription>
                                Allow user to login and access the system
                            </FieldDescription>
                            {errors.isActive && (
                                <FieldError>{errors.isActive.message}</FieldError>
                            )}
                        </FieldContent>
                        <Controller
                            name='isActive'
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    id='isActive'
                                    name={field.name}
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className='self-center'
                                />
                            )}
                        />
                    </Field>

                    <Field data-invalid={Boolean(errors.fileUploadLimitOverride)}>
                        <FieldLabel htmlFor='fileUploadLimitOverride'>
                            Upload Limit
                        </FieldLabel>
                        <InputGroup>
                            <InputGroupInput
                                id='fileUploadLimitOverride'
                                placeholder='e.g., 100MB, 1GB'
                                {...register('fileUploadLimitOverride')}
                                aria-invalid={Boolean(errors.fileUploadLimitOverride)}
                            />
                        </InputGroup>
                        <FieldDescription>
                            Custom upload limit (e.g., 100MB, 1GB). Leave empty to use
                            global default.
                        </FieldDescription>
                        {errors.fileUploadLimitOverride && (
                            <FieldError>
                                {errors.fileUploadLimitOverride.message}
                            </FieldError>
                        )}
                    </Field>
                </FieldGroup>
            </div>

            <DialogFooter className='shrink-0 sm:justify-end'>
                <DialogClose
                    render={
                        <Button
                            type='button'
                            variant='outline'
                            disabled={createUser.isPending}
                        />
                    }
                >
                    Cancel
                </DialogClose>
                <Button type='submit' variant='default' disabled={createUser.isPending}>
                    {createUser.isPending ? (
                        <>
                            <Spinner />
                            Creating...
                        </>
                    ) : (
                        <>
                            <UserPlusIcon weight='bold' data-icon='inline-start' />
                            Create
                        </>
                    )}
                </Button>
            </DialogFooter>
        </form>
    );
}
