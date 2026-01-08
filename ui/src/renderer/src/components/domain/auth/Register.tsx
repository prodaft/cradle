import { toast } from 'sonner';
import { useAPICall } from '@/hooks';
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
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEffect, useState } from 'react';

interface FormData {
    username: string;
    email: string;
    password: string;
    passwordCheck: string;
}

interface OAuthMethod {
    id?: string;
    provider?: string;
    name?: string;
    label?: string;
    display_name?: string;
    auth_url?: string;
    authorization_url?: string;
    login_url?: string;
    url?: string;
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
    const { usersApi, basePath } = useApi();
    const { execute } = useAPICall();
    const [oauthMethods, setOauthMethods] = useState<OAuthMethod[]>([]);
    const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(
        null,
    );

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

    useEffect(() => {
        if (!basePath) {
            setOauthMethods([]);
            setRegistrationEnabled(null);
            return;
        }

        let isMounted = true;

        const loadConfig = async () => {
            try {
                const response = await fetch(`${basePath}/users/config/`);
                if (!response.ok) {
                    throw new Error('Failed to load auth configuration');
                }

                const data = await response.json();
                if (!isMounted) {
                    return;
                }

                setOauthMethods(
                    Array.isArray(data?.oauth_methods) ? data.oauth_methods : [],
                );
                setRegistrationEnabled(
                    typeof data?.registration_enabled === 'boolean'
                        ? data.registration_enabled
                        : null,
                );
            } catch (error) {
                if (!isMounted) {
                    return;
                }
                setOauthMethods([]);
                setRegistrationEnabled(null);
            }
        };

        loadConfig();

        return () => {
            isMounted = false;
        };
    }, [basePath]);

    const apiRoot = basePath.replace(/\/api\/?$/, '');

    const getOAuthKey = (method: OAuthMethod) => {
        return (
            method.id ||
            method.provider ||
            method.name ||
            method.label ||
            method.display_name ||
            ''
        );
    };

    const getOAuthLabel = (method: OAuthMethod) => {
        return (
            method.display_name ||
            method.label ||
            method.name ||
            method.provider ||
            method.id ||
            'Single Sign-On'
        );
    };

    const getOAuthUrl = (method: OAuthMethod) => {
        const url =
            method.authorization_url ||
            method.auth_url ||
            method.login_url ||
            method.url;

        if (!url) {
            return '';
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        if (!apiRoot) {
            return url;
        }

        if (url.startsWith('/')) {
            return `${apiRoot}${url}`;
        }

        return `${apiRoot}/${url}`;
    };

    const buildOAuthRedirectUrl = (method: OAuthMethod) => {
        const url = getOAuthUrl(method);
        if (!url) {
            return '';
        }

        const provider = getOAuthKey(method);
        if (!provider) {
            return '';
        }

        const redirectUri = `${window.location.origin}/oauth/callback`;
        const redirectUrl = new URL(url);
        redirectUrl.searchParams.set('redirect_uri', redirectUri);
        redirectUrl.searchParams.set('state', `oauth_login:${provider}`);
        return redirectUrl.toString();
    };

    const oauthOptions = oauthMethods.filter((method) => buildOAuthRedirectUrl(method));

    const onSubmit = async (data: FormData) => {
        if (registrationEnabled === false) {
            toast.error('Registration is disabled. Contact an administrator.');
            return;
        }

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
                                {registrationEnabled === false && (
                                    <Alert>
                                        <WarningCircle />
                                        <AlertDescription>
                                            Registration is disabled. Use single sign-on or
                                            contact an administrator.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <Field>
                                    <FieldLabel htmlFor='username'>Username</FieldLabel>
                                    <Input
                                        id='username'
                                        type='text'
                                        {...register('username')}
                                        aria-invalid={errors.username ? 'true' : 'false'}
                                        required
                                        disabled={registrationEnabled === false}
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
                                        disabled={registrationEnabled === false}
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
                                        disabled={registrationEnabled === false}
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
                                        disabled={registrationEnabled === false}
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
                                        disabled={
                                            isSubmitting || registrationEnabled === false
                                        }
                                        data-testid='login-register-button'
                                    >
                                        {registrationEnabled === false
                                            ? 'Registration Disabled'
                                            : isSubmitting
                                              ? 'Creating...'
                                              : 'Create Account'}
                                    </Button>
                                </Field>
                                {oauthOptions.length > 0 && (
                                    <>
                                        <FieldSeparator />
                                        <Field>
                                            <FieldDescription className='text-center'>
                                                Or continue with
                                            </FieldDescription>
                                        </Field>
                                        {oauthOptions.map((method) => (
                                            <Field
                                                key={`${getOAuthKey(method)}-${getOAuthUrl(method)}`}
                                            >
                                                <Button
                                                    type='button'
                                                    variant='outline'
                                                    size='default'
                                                    className='w-full'
                                                    onClick={() => {
                                                        sessionStorage.setItem(
                                                            'oauth_login_redirect',
                                                            '/',
                                                        );
                                                        window.location.href =
                                                            buildOAuthRedirectUrl(method);
                                                    }}
                                                >
                                                    {getOAuthLabel(method)}
                                                </Button>
                                            </Field>
                                        ))}
                                    </>
                                )}
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
