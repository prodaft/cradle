import { toast } from 'sonner';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import Logo from '@components/base/Logo/Logo';
import { Undo } from 'iconoir-react';
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
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

interface FormData {
    username: string;
    email: string;
    password: string;
    passwordCheck: string;
}

const registerSchema = Yup.object().shape({
    username: Yup.string().required('Username is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string().required('Password is required'),
    passwordCheck: Yup.string()
        .required('Please confirm your password')
        .oneOf([Yup.ref('password')], 'Passwords do not match'),
});

/**
 * Register component - renders the registration form.
 * Register new user in the system.
 * On successful registration, user is redirected to the login page.
 * On error, displays an error message.
 */
export default function Register() {
    const { navigate } = useCradleNavigate();
    const location = useLocation();
    const { usersApi } = useApi();
    const { execute } = useAPICall();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: yupResolver(registerSchema),
        defaultValues: {
            username: '',
            email: '',
            password: '',
            passwordCheck: '',
        },
    });

    const onSubmit = async (data: FormData) => {
        let user = await execute(() =>
            usersApi.usersCreate({
                userCreateRequest: {
                    username: data.username,
                    email: data.email,
                    password: data.password,
                },
            }),
        );

        if (!user.emailConfirmed) {
            toast.success('Please check your email for a confirmation link.');
        }

        if (!user.isActive) {
            toast.info('Your account must be activated by an administrator before you can login.');
        }

        if (user.emailConfirmed && user.isActive) {
            toast.info('Account created successfully.');
        }

        navigate('/login', {
            state: location.state,
            replace: true,
        });
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
                                        Create an account
                                    </h1>
                                    <p className='text-muted-foreground text-sm text-balance'>
                                        Enter your information to create your account
                                    </p>
                                </div>
                                <Field>
                                    <FieldLabel htmlFor='username'>Username</FieldLabel>
                                    <Input
                                        id='username'
                                        type='text'
                                        {...register('username')}
                                        aria-invalid={errors.username ? 'true' : 'false'}
                                        required
                                    />
                                    {errors.username && (
                                        <FieldDescription className='text-destructive'>
                                            {errors.username.message}
                                        </FieldDescription>
                                    )}
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor='email'>Email</FieldLabel>
                                    <Input
                                        id='email'
                                        type='email'
                                        {...register('email')}
                                        aria-invalid={errors.email ? 'true' : 'false'}
                                        required
                                    />
                                    {errors.email && (
                                        <FieldDescription className='text-destructive'>
                                            {errors.email.message}
                                        </FieldDescription>
                                    )}
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor='password'>Password</FieldLabel>
                                    <Input
                                        id='password'
                                        type='password'
                                        {...register('password')}
                                        aria-invalid={errors.password ? 'true' : 'false'}
                                        required
                                    />
                                    {errors.password && (
                                        <FieldDescription className='text-destructive'>
                                            {errors.password.message}
                                        </FieldDescription>
                                    )}
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor='passwordCheck'>
                                        Confirm Password
                                    </FieldLabel>
                                    <Input
                                        id='passwordCheck'
                                        type='password'
                                        {...register('passwordCheck')}
                                        aria-invalid={errors.passwordCheck ? 'true' : 'false'}
                                        required
                                    />
                                    {errors.passwordCheck && (
                                        <FieldDescription className='text-destructive'>
                                            {errors.passwordCheck.message}
                                        </FieldDescription>
                                    )}
                                </Field>
                                <Field>
                                    <Button
                                        type='submit'
                                        variant='default'
                                        size='default'
                                        className='w-full'
                                        disabled={isSubmitting}
                                        data-testid='login-register-button'
                                    >
                                        {isSubmitting ? 'Creating...' : 'Create Account'}
                                    </Button>
                                </Field>
                                <FieldSeparator />
                                <Field>
                                    <FieldDescription className='text-center'>
                                        Already have an account?{' '}
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
                            <span className='text-xs text-muted-foreground cradle-mono tracking-wider'>
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
