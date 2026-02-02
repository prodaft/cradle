import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import useApi from '@/hooks/api/useApi';
import { useAuthActions, useAuthState } from '@/hooks/auth/useAuth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter, useSearch } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

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
    const search = useSearch({ from: '/reset-password' });
    const searchAny = search as any;
    const token = searchAny?.token as string | undefined;
    const router = useRouter();
    const { authApi } = useApi();
    const { role } = useAuthState();
    const { isLoggedIn } = useAuthActions();

    const resetPasswordMutation = useMutation({
        mutationFn: async (data: { token: string; password: string }) => {
            await authApi.authResetPasswordUpdate({
                passwordResetConfirmRequest: {
                    token: data.token,
                    password: data.password,
                },
            });
        },
        meta: {
            successMessage: 'Password reset successfully',
            errorMessage: 'Failed to reset password',
        },
        onSuccess: () => {
            setTimeout(() => {
                router.navigate({ to: '/login', replace: true });
            }, 1500);
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
        // If user is already logged in, redirect to dashboard
        if (isLoggedIn()) {
            router.navigate({ to: '/', replace: true });
        }
    }, [role, router, isLoggedIn]);

    // Validate token exists
    if (!token) {
        return (
            <div className='flex items-center justify-center h-screen overflow-y-auto'>
                <div className='bg-card/20 p-8 rounded-xl w-full h-fit md:w-1/2 xl:w-1/3'>
                    <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 text-muted-foreground'>
                        <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                            <h3 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-destructive'>
                                Invalid Reset Link
                            </h3>
                            <p className='mt-4 text-center text-sm'>
                                The password reset link is invalid or has expired.
                                Please request a new one.
                            </p>
                            <p className='mt-10 text-center text-sm text-muted-foreground'>
                                <Link
                                    to='/forgot-password'
                                    className='font-semibold leading-6 text-primary px-2 py-1 rounded hover:bg-secondary hover:text-foreground transition-colors'
                                    replace={true}
                                >
                                    Request new reset link
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const onSubmit = async (data: FormData) => {
        if (!token) return;
        resetPasswordMutation.mutate({ token, password: data.password });
    };

    // If user is logged in, don't render the reset password form
    if (isLoggedIn()) {
        return null;
    }

    return (
        <div className='flex items-center justify-center h-screen overflow-y-auto'>
            <div className='bg-card/20 p-8 rounded-xl w-full h-fit md:w-1/2 xl:w-1/3'>
                <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 text-muted-foreground'>
                    <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                        <h3 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight'>
                            Change Password
                        </h3>
                    </div>
                    <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm'>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className='flex flex-col gap-4'
                        >
                            <FieldGroup className='gap-4'>
                                <Controller
                                    name='password'
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldContent>
                                                <FieldLabel htmlFor={field.name}>
                                                    Password
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id={field.name}
                                                    type='password'
                                                    autoComplete='new-password'
                                                    aria-invalid={fieldState.invalid}
                                                    disabled={
                                                        form.formState.isSubmitting
                                                    }
                                                />
                                                {fieldState.invalid && (
                                                    <FieldError
                                                        errors={[fieldState.error]}
                                                    />
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
                                                    Confirm Password
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id={field.name}
                                                    type='password'
                                                    autoComplete='new-password'
                                                    aria-invalid={fieldState.invalid}
                                                    disabled={
                                                        form.formState.isSubmitting
                                                    }
                                                />
                                                {fieldState.invalid && (
                                                    <FieldError
                                                        errors={[fieldState.error]}
                                                    />
                                                )}
                                            </FieldContent>
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                            <Button
                                type='submit'
                                variant='default'
                                size='default'
                                className='w-full'
                                disabled={form.formState.isSubmitting}
                                data-testid='login-register-button'
                            >
                                {form.formState.isSubmitting
                                    ? 'Resetting Password...'
                                    : 'Change Password'}
                            </Button>
                        </form>
                        <p className='mt-10 text-center text-sm text-muted-foreground'>
                            <Link
                                to='/login'
                                className='font-semibold leading-6 text-primary px-2 py-1 rounded hover:bg-secondary hover:text-foreground transition-colors'
                                replace={true}
                            >
                                Go back to login
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
