import { AuthHeader, AuthLayout } from '@/components/domain/auth/auth-layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
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
import { Spinner } from '@/components/ui/spinner';
import { useAuthActions, useAuthState } from '@/hooks/auth/use-auth';
import { getDisplayMessage, getSuccessMessage, parseAPIError } from '@/utils/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, EyeSlashIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

const resetPasswordSchema = z
    .object({
        password: z.string().min(1, { error: 'Password is required' }),
        confirmPassword: z.string().min(1, { error: 'Please confirm your password' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        error: 'Passwords do not match',
        path: ['confirmPassword'],
    });

type FormData = z.infer<typeof resetPasswordSchema>;

/**
 * ResetPassword component - renders the change password form
 */
export default function ResetPassword() {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [formAlert, setFormAlert] = useState<{
        show: boolean;
        message: string;
        color: 'red' | 'green';
        title?: string;
    }>({ show: false, message: '', color: 'red' });
    const search = useSearch({ from: '/reset-password' }) as { token?: string };
    const token = search.token;
    const router = useRouter();
    const { role } = useAuthState();
    const { isLoggedIn } = useAuthActions();

    const resetPassword = useMutation({
        mutationFn: async (data: { token: string; password: string }) => {
            const {
                data: resData,
                error,
                response,
            } = await fetchClient.POST('/auth/password/reset/confirm/', {
                body: { token: data.token, password: data.password },
            });
            if (error) throw { response, error };
            return resData;
        },
        meta: {
            suppressNotification: true,
        },
        onError: async (error) => {
            const parsed = await parseAPIError(error);
            setFormAlert({
                show: true,
                message: getDisplayMessage(parsed),
                color: 'red',
                title: parsed.title,
            });
        },
        onSuccess: (data) => {
            const msg = getSuccessMessage(data);
            setFormAlert({ show: true, message: msg ?? '', color: 'green' });
            setTimeout(() => router.navigate({ to: '/login', replace: true }), 2000);
        },
    });

    const form = useForm<FormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    useEffect(() => {
        if (isLoggedIn()) {
            router.navigate({ to: '/', replace: true });
        }
    }, [role, router, isLoggedIn]);

    if (!token) {
        return (
            <AuthLayout>
                <div className='flex flex-col gap-4'>
                    <AuthHeader
                        title='Invalid reset link'
                        description='The password reset link is invalid or has expired. Please request a new one.'
                    />
                    <Link
                        to='/forgot-password'
                        className='text-sm text-primary underline-offset-4 hover:underline'
                        replace={true}
                    >
                        Request a new reset link
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    const onSubmit = async (data: FormData) => {
        if (!token) return;
        resetPassword.mutate({ token, password: data.password });
    };

    if (isLoggedIn()) {
        return null;
    }

    return (
        <AuthLayout>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup className='gap-[18px] sm:gap-4'>
                    <AuthHeader
                        title='Change password'
                        description='Enter a new password for your account.'
                    />
                    <Controller
                        name='password'
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldContent>
                                    <FieldLabel htmlFor={field.name}>
                                        Password
                                    </FieldLabel>
                                    <InputGroup>
                                        <InputGroupInput
                                            {...field}
                                            id={field.name}
                                            type={
                                                isPasswordVisible ? 'text' : 'password'
                                            }
                                            autoComplete='new-password'
                                            aria-invalid={fieldState.invalid}
                                            disabled={resetPassword.isPending}
                                        />
                                        <InputGroupAddon align='inline-end'>
                                            <InputGroupButton
                                                type='button'
                                                onClick={() =>
                                                    setIsPasswordVisible(
                                                        !isPasswordVisible,
                                                    )
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
                                                    <EyeIcon
                                                        className='size-4'
                                                        weight='bold'
                                                    />
                                                )}
                                            </InputGroupButton>
                                        </InputGroupAddon>
                                    </InputGroup>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </FieldContent>
                            </Field>
                        )}
                    />
                    <Controller
                        name='confirmPassword'
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldContent>
                                    <FieldLabel htmlFor={field.name}>
                                        Confirm password
                                    </FieldLabel>
                                    <InputGroup>
                                        <InputGroupInput
                                            {...field}
                                            id={field.name}
                                            type={
                                                isConfirmPasswordVisible
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            autoComplete='new-password'
                                            aria-invalid={fieldState.invalid}
                                            disabled={resetPassword.isPending}
                                        />
                                        <InputGroupAddon align='inline-end'>
                                            <InputGroupButton
                                                type='button'
                                                onClick={() =>
                                                    setIsConfirmPasswordVisible(
                                                        !isConfirmPasswordVisible,
                                                    )
                                                }
                                                aria-label={
                                                    isConfirmPasswordVisible
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                                title={
                                                    isConfirmPasswordVisible
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                            >
                                                {isConfirmPasswordVisible ? (
                                                    <EyeSlashIcon
                                                        className='size-4'
                                                        weight='bold'
                                                    />
                                                ) : (
                                                    <EyeIcon
                                                        className='size-4'
                                                        weight='bold'
                                                    />
                                                )}
                                            </InputGroupButton>
                                        </InputGroupAddon>
                                    </InputGroup>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </FieldContent>
                            </Field>
                        )}
                    />
                    {formAlert.show && (
                        <Alert
                            variant={
                                formAlert.color === 'red' ? 'destructive' : 'default'
                            }
                        >
                            <WarningCircleIcon weight='bold' />
                            <AlertTitle>
                                {formAlert.color === 'red'
                                    ? formAlert.title || 'Error'
                                    : 'Success'}
                            </AlertTitle>
                            <AlertDescription>{formAlert.message}</AlertDescription>
                        </Alert>
                    )}
                    <Button
                        type='submit'
                        variant='default'
                        size='default'
                        className='w-full'
                        disabled={resetPassword.isPending}
                        data-testid='login-register-button'
                    >
                        {resetPassword.isPending && <Spinner />}
                        Change password
                    </Button>
                    <p className='border-t pt-3.5 text-center text-sm text-muted-foreground'>
                        <Link
                            to='/login'
                            className='text-primary underline-offset-4 hover:underline'
                            replace={true}
                        >
                            Back to sign in
                        </Link>
                    </p>
                </FieldGroup>
            </form>
        </AuthLayout>
    );
}
