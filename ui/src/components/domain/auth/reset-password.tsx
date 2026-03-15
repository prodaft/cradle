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
import Logo from '@components/base/logo/logo';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowUUpLeftIcon,
    EyeIcon,
    EyeSlashIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

const RESET_PASSWORD_IMAGES = ['/1.png', '/2.png', '/3.png', '/4.png'];

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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formAlert, setFormAlert] = useState<{
        show: boolean;
        message: string;
        color: 'red' | 'green';
    }>({ show: false, message: '', color: 'red' });
    const [resetPasswordImage] = useState(
        () =>
            RESET_PASSWORD_IMAGES[
                Math.floor(Math.random() * RESET_PASSWORD_IMAGES.length)
            ],
    );
    const search = useSearch({ from: '/reset-password' });
    const searchAny = search as any;
    const token = searchAny?.token as string | undefined;
    const router = useRouter();
    const { role } = useAuthState();
    const { isLoggedIn } = useAuthActions();

    const resetPasswordMutation = useMutation({
        mutationFn: async (data: { token: string; password: string }) => {
            const {
                data: resData,
                error,
                response,
            } = await fetchClient.PUT('/auth/reset-password/', {
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
        // If user is already logged in, redirect to dashboard
        if (isLoggedIn()) {
            router.navigate({ to: '/', replace: true });
        }
    }, [role, router, isLoggedIn]);

    // Validate token exists
    if (!token) {
        return (
            <div className='grid min-h-svh lg:grid-cols-2'>
                <div className='flex flex-col gap-4 p-6 md:p-10 relative'>
                    <div className='flex justify-between items-center gap-2'>
                        <a href='#' className='flex items-center gap-2 font-medium'>
                            <Logo text={true} width='120px' />
                        </a>
                        <Button
                            onClick={() =>
                                router.navigate({ to: '/login', replace: true })
                            }
                            variant='ghost'
                            size='icon-sm'
                            className='p-2 rounded-lg'
                            title='Back to Login'
                        >
                            <ArrowUUpLeftIcon size={18} weight='bold' />
                        </Button>
                    </div>
                    <div className='flex flex-1 items-center justify-center'>
                        <div className='w-full max-w-xs text-center'>
                            <h1 className='text-2xl font-bold text-destructive'>
                                Invalid Reset Link
                            </h1>
                            <p className='mt-4 text-sm text-muted-foreground'>
                                The password reset link is invalid or has expired.
                                Please request a new one.
                            </p>
                            <Link
                                to='/forgot-password'
                                className='mt-6 inline-block font-semibold text-primary underline underline-offset-4 hover:text-primary/90'
                                replace={true}
                            >
                                Request new reset link
                            </Link>
                            <div className='mt-6 text-center'>
                                <span className='text-xs text-muted-foreground font-mono tracking-wider'>
                                    v2.10.2-beta.a070af1b
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    className='bg-muted relative hidden lg:block select-none'
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <img
                        src={resetPasswordImage}
                        alt=''
                        className='absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale pointer-events-none'
                        draggable={false}
                    />
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
                            onSubmit={form.handleSubmit(onSubmit)}
                            className='flex flex-col gap-6'
                        >
                            <FieldGroup className='gap-4'>
                                <div className='flex flex-col items-center gap-1 text-center'>
                                    <h1 className='text-2xl font-bold'>
                                        Change Password
                                    </h1>
                                    <p className='text-muted-foreground text-sm text-balance'>
                                        Enter your new password below
                                    </p>
                                </div>
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
                                                            showPassword
                                                                ? 'text'
                                                                : 'password'
                                                        }
                                                        autoComplete='new-password'
                                                        aria-invalid={
                                                            fieldState.invalid
                                                        }
                                                        disabled={
                                                            resetPasswordMutation.isPending
                                                        }
                                                    />
                                                    <InputGroupAddon align='inline-end'>
                                                        <InputGroupButton
                                                            type='button'
                                                            onClick={() =>
                                                                setShowPassword(
                                                                    !showPassword,
                                                                )
                                                            }
                                                            aria-label={
                                                                showPassword
                                                                    ? 'Hide password'
                                                                    : 'Show password'
                                                            }
                                                            title={
                                                                showPassword
                                                                    ? 'Hide password'
                                                                    : 'Show password'
                                                            }
                                                        >
                                                            {showPassword ? (
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
                                                <InputGroup>
                                                    <InputGroupInput
                                                        {...field}
                                                        id={field.name}
                                                        type={
                                                            showConfirmPassword
                                                                ? 'text'
                                                                : 'password'
                                                        }
                                                        autoComplete='new-password'
                                                        aria-invalid={
                                                            fieldState.invalid
                                                        }
                                                        disabled={
                                                            resetPasswordMutation.isPending
                                                        }
                                                    />
                                                    <InputGroupAddon align='inline-end'>
                                                        <InputGroupButton
                                                            type='button'
                                                            onClick={() =>
                                                                setShowConfirmPassword(
                                                                    !showConfirmPassword,
                                                                )
                                                            }
                                                            aria-label={
                                                                showConfirmPassword
                                                                    ? 'Hide password'
                                                                    : 'Show password'
                                                            }
                                                            title={
                                                                showConfirmPassword
                                                                    ? 'Hide password'
                                                                    : 'Show password'
                                                            }
                                                        >
                                                            {showConfirmPassword ? (
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
                                                    <FieldError
                                                        errors={[fieldState.error]}
                                                    />
                                                )}
                                            </FieldContent>
                                        </Field>
                                    )}
                                />
                                {formAlert.show && (
                                    <Alert
                                        variant={
                                            formAlert.color === 'red'
                                                ? 'destructive'
                                                : 'default'
                                        }
                                    >
                                        <WarningCircleIcon
                                            className='size-4'
                                            weight='bold'
                                        />
                                        <AlertTitle>
                                            {formAlert.color === 'red'
                                                ? 'Error'
                                                : 'Success'}
                                        </AlertTitle>
                                        <AlertDescription>
                                            {formAlert.message}
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </FieldGroup>
                            <Button
                                type='submit'
                                variant='default'
                                size='default'
                                className='w-full'
                                disabled={resetPasswordMutation.isPending}
                                data-testid='login-register-button'
                            >
                                {resetPasswordMutation.isPending && (
                                    <Spinner className='size-4' />
                                )}
                                Change Password
                            </Button>
                            <p className='text-center text-sm text-muted-foreground'>
                                <Link
                                    to='/login'
                                    className='underline underline-offset-4'
                                    replace={true}
                                >
                                    Back to login
                                </Link>
                            </p>
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
                    src={resetPasswordImage}
                    alt=''
                    className='absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale pointer-events-none'
                    draggable={false}
                />
            </div>
        </div>
    );
}
