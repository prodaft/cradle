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
import { InputGroup, InputGroupInput } from '@/components/ui/input-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import useApi from '@/hooks/api/useApi';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserRetrieve } from '@services/cradle/models';
import { useMutation } from '@tanstack/react-query';
import bytes from 'bytes';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

interface AddUserFormProps {
    onAdd?: (result: UserRetrieve) => void;
}

const addUserSchema = z.object({
    username: z.string().min(1, { error: 'Username is required' }),
    email: z
        .string()
        .min(1, { error: 'Email is required' })
        .refine((val) => z.email().safeParse(val).success, {
            error: 'Invalid email',
        }),
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
    const { usersApi } = useApi();

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting },
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

    const createUserMutation = useMutation({
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

            return await usersApi.usersCreate({
                userCreateSerializerAdminRequest: payload,
            });
        },
        meta: {
            successMessage: 'User created successfully',
        },
        onSuccess: (newUser) => {
            reset();
            if (onAdd) onAdd(newUser);
        },
    });

    const onSubmit = async (data: FormData) => {
        createUserMutation.mutate(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className='w-full'>
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
                    <FieldDescription>Unique identifier for this user</FieldDescription>
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
                    {errors.email && <FieldError>{errors.email.message}</FieldError>}
                </Field>

                <Field data-invalid={Boolean(errors.password)}>
                    <FieldLabel htmlFor='password'>
                        Password
                        <span className='text-destructive ml-1'>*</span>
                    </FieldLabel>
                    <Input
                        id='password'
                        type='password'
                        placeholder='Password'
                        {...register('password')}
                        aria-invalid={Boolean(errors.password)}
                        required
                    />
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
                            <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className='w-full' id='role'>
                                    <SelectValue placeholder='Select a role' />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='author'>User</SelectItem>
                                    <SelectItem value='entrymanager'>
                                        Entry Manager
                                    </SelectItem>
                                    <SelectItem value='admin'>Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    <FieldDescription>Determines access permissions</FieldDescription>
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

                <Field orientation='horizontal' data-invalid={Boolean(errors.isActive)}>
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
                        File Upload Limit Override
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

            <div className='flex justify-end mt-5'>
                <Button type='submit' variant='default' disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create User'}
                </Button>
            </div>
        </form>
    );
}
