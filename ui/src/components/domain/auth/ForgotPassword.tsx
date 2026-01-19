import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import useApi from '@/hooks/api/useApi';
import { useAuthActions, useAuthState } from '@/hooks/auth/useAuth';
import { cn } from '@/lib/utils';
import Logo from '@components/base/Logo/Logo';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { Undo, WarningCircle } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
    email: z
        .string()
        .min(1, { error: 'Email is required' })
        .refine((val) => z.email().safeParse(val).success, {
            error: 'Invalid email',
        }),
});

type FormData = z.infer<typeof forgotPasswordSchema>;

/**
 * ForgotPassword component - renders the form for a user to get a forgot password email.
 */
export default function ForgotPassword() {
    const location = useRouterState({
        select: (state) => state.location,
    });
    const { authApi } = useApi();
    const router = useRouter();
    const { role } = useAuthState();
    const { isLoggedIn } = useAuthActions();

    const resetPasswordMutation = useMutation({
        mutationFn: async (email: string) => {
            await authApi.authResetPasswordCreate({
                passwordResetRequestRequest: {
                    email,
                },
            });
        },
        meta: {
            successMessage: 'Password change email sent to your inbox!',
            errorMessage: 'Failed to send reset email. Please try again.',
        },
        onError: (error: any) => {
            setAlert({
                show: true,
                message:
                    error?.detail || 'Failed to send reset email. Please try again.',
                color: 'red',
            });
        },
        onSuccess: () => {
            setAlert({
                show: false,
                message: '',
                color: 'red',
            });
        },
    });
    const [alert, setAlert] = useState<{
        show: boolean;
        message: string;
        color: string;
    }>({
        show: false,
        message: '',
        color: 'red',
    });

    const form = useForm<FormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    useEffect(() => {
        // If user is already logged in, redirect to dashboard
        if (isLoggedIn()) {
            router.navigate({ to: '/', replace: true });
        }
    }, [role, router, isLoggedIn]);

    const onSubmit = async (data: FormData) => {
        resetPasswordMutation.mutate(data.email);
    };

    // If user is logged in, don't render the forgot password form
    if (isLoggedIn()) {
        return null;
    }

    return (
        <div className='grid min-h-svh lg:grid-cols-2'>
            {/* Left Column - Form */}
            <div className='flex flex-col gap-4 p-6 md:p-10 relative'>
                {/* Branding */}
                <div className='flex justify-between items-center gap-2'>
                    <a href='#' className='flex items-center gap-2 font-medium'>
                        <Logo text={true} width='120px' />
                    </a>
                    <Button
                        onClick={() => router.navigate({ to: '/login', replace: true })}
                        variant='ghost'
                        size='icon-sm'
                        className='p-2 rounded-lg'
                        data-testid='back-button'
                        title='Back to Login'
                    >
                        <Undo width={18} height={18} />
                    </Button>
                </div>

                {/* Form Container */}
                <div className='flex flex-1 items-center justify-center'>
                    <div className='w-full max-w-xs'>
                        <form
                            className={cn('flex flex-col gap-6')}
                            onSubmit={form.handleSubmit(onSubmit)}
                        >
                            <FieldGroup>
                                <div className='flex flex-col items-center gap-1 text-center'>
                                    <h1 className='text-2xl font-bold'>
                                        Reset your password
                                    </h1>
                                    <p className='text-muted-foreground text-sm text-balance'>
                                        Enter your email to receive password reset
                                        instructions
                                    </p>
                                </div>
                                <Controller
                                    name='email'
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldContent>
                                                <FieldLabel htmlFor={field.name}>
                                                    Email
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id={field.name}
                                                    type='email'
                                                    aria-invalid={fieldState.invalid}
                                                    autoComplete='email'
                                                    autoFocus={true}
                                                    required
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
                                {alert.show && (
                                    <Alert
                                        variant={
                                            alert.color === 'red' ||
                                                alert.color === 'error'
                                                ? 'destructive'
                                                : 'default'
                                        }
                                    >
                                        <WarningCircle />
                                        <AlertDescription>
                                            {alert.message}
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <Field>
                                    <Button
                                        type='submit'
                                        variant='default'
                                        size='default'
                                        className='w-full'
                                        disabled={form.formState.isSubmitting}
                                        data-testid='login-register-button'
                                    >
                                        {form.formState.isSubmitting
                                            ? 'Sending...'
                                            : 'Send Reset Link'}
                                    </Button>
                                </Field>
                                <FieldSeparator />
                                <Field>
                                    <FieldDescription className='text-center'>
                                        Remember your password?{' '}
                                        <Link
                                            to='/login'
                                            className='underline underline-offset-4'
                                            state={location.state}
                                            replace={true}
                                        >
                                            Sign in
                                        </Link>
                                    </FieldDescription>
                                </Field>
                            </FieldGroup>
                        </form>

                        {/* Version/Status Indicator */}
                        <div className='mt-6 text-center'>
                            <span className='text-xs text-muted-foreground font-mono tracking-wider'>
                                v2.10.2-beta.a070af1b
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column - Image */}
            <div className='bg-muted relative hidden lg:block'>
                <img
                    src='/auth-image.jpeg'
                    alt='Image'
                    className='absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale'
                />
            </div>
        </div>
    );
}
