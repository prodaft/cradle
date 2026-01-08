import { toast } from 'sonner';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import Logo from '@components/base/Logo/Logo';
import { Undo, WarningCircle } from 'iconoir-react';
import { Link, useLocation } from 'react-router-dom';
import * as Yup from 'yup';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';

interface FormData {
    email: string;
}

const forgotPasswordSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email').required('Email is required'),
});

/**
 * ForgotPassword component - renders the form for a user to get a forgot password email.
 */
export default function ForgotPassword() {
    const location = useLocation();
    const { usersApi } = useApi();
    const { navigate } = useCradleNavigate();
    const [alert, setAlert] = useState<{
        show: boolean;
        message: string;
        color: string;
    }>({
        show: false,
        message: '',
        color: 'red',
    });

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: yupResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    const onSubmit = async (data: FormData) => {
        try {
            await usersApi.usersResetPasswordCreate({
                passwordResetRequestRequest: {
                    email: data.email,
                },
            });
            toast.success('Password change email sent to your inbox!');
            setAlert({
                show: false,
                message: '',
                color: 'red',
            });
        } catch (error: any) {
            setAlert({
                show: true,
                message: error?.message || 'Failed to send reset email',
                color: 'red',
            });
        }
    };

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
                        onClick={() => navigate('/login', { replace: true })}
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
                            onSubmit={handleSubmit(onSubmit)}
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
                                <Field>
                                    <FieldLabel htmlFor='email'>Email</FieldLabel>
                                    <Input
                                        id='email'
                                        type='email'
                                        {...register('email')}
                                        aria-invalid={errors.email ? 'true' : 'false'}
                                        autoFocus={true}
                                        required
                                    />
                                    {errors.email && (
                                        <FieldDescription className='text-destructive'>
                                            {errors.email.message}
                                        </FieldDescription>
                                    )}
                                </Field>
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
                                        disabled={isSubmitting}
                                        data-testid='login-register-button'
                                    >
                                        {isSubmitting
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
