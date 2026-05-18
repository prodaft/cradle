import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Spinner } from '@/components/ui/spinner';
import { useAuthActions, useAuthState } from '@/hooks/auth/use-auth';
import { cn } from '@/lib/utils';
import { getDisplayMessage, getSuccessMessage, parseAPIError } from '@/utils/api';
import Logo from '@components/base/logo/logo';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowUUpLeftIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

const FORGOT_PASSWORD_IMAGES = ['/1.png', '/2.png', '/3.png', '/4.png'];

const forgotPasswordSchema = z.object({
    email: z.email({ error: 'Invalid email' }).min(1, { error: 'Email is required' }),
});

type FormData = z.infer<typeof forgotPasswordSchema>;

/**
 * ForgotPassword component - renders the form for a user to get a forgot password email.
 */
export default function ForgotPassword() {
    const location = useRouterState({
        select: (state) => state.location,
    });
    const router = useRouter();
    const { role } = useAuthState();
    const { isLoggedIn } = useAuthActions();

    const resetPasswordMutation = useMutation({
        mutationFn: async (email: string) => {
            const { data, error, response } = await fetchClient.POST(
                '/auth/reset-password/',
                { body: { email } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            suppressNotification: true,
        },
        onError: async (error) => {
            const parsed = await parseAPIError(error);
            setAlert({
                show: true,
                message: getDisplayMessage(parsed),
                color: 'red',
                title: parsed.title,
            });
        },
        onSuccess: (data) => {
            setAlert({
                show: true,
                message: getSuccessMessage(data) ?? '',
                color: 'green',
            });
        },
    });
    const [forgotPasswordImage] = useState(
        () =>
            FORGOT_PASSWORD_IMAGES[
                Math.floor(Math.random() * FORGOT_PASSWORD_IMAGES.length)
            ],
    );
    const [alert, setAlert] = useState<{
        show: boolean;
        message: string;
        color: string;
        title?: string;
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
                        <ArrowUUpLeftIcon size={18} weight='bold' />
                    </Button>
                </div>

                {/* Form Container */}
                <div className='flex flex-1 items-center justify-center'>
                    <div className='w-full max-w-xs'>
                        <form
                            className={cn('flex flex-col gap-6')}
                            onSubmit={form.handleSubmit(onSubmit)}
                        >
                            <FieldGroup className='gap-4'>
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
                                        <WarningCircleIcon
                                            className='size-4'
                                            weight='bold'
                                        />
                                        <AlertTitle>
                                            {alert.color === 'red' ||
                                            alert.color === 'error'
                                                ? alert.title || 'Error'
                                                : 'Success'}
                                        </AlertTitle>
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
                                        disabled={resetPasswordMutation.isPending}
                                        data-testid='send-reset-link-button'
                                    >
                                        {resetPasswordMutation.isPending && (
                                            <Spinner className='size-4' />
                                        )}
                                        Send Reset Link
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
            <div
                className='bg-muted relative hidden lg:block select-none'
                onContextMenu={(e) => e.preventDefault()}
            >
                <img
                    src={forgotPasswordImage}
                    alt=''
                    className='absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale pointer-events-none'
                    draggable={false}
                />
            </div>
        </div>
    );
}
