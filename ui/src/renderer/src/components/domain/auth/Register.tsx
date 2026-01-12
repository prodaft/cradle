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
import { toast } from 'sonner';
import { z } from 'zod';

type FormData = z.infer<typeof registerSchema>;

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

const registerSchema = z
    .object({
        username: z.string().min(1, { error: 'Username is required' }),
        email: z
            .string()
            .min(1, { error: 'Email is required' })
            .refine((val) => z.email().safeParse(val).success, {
                error: 'Invalid email',
            }),
        password: z.string().min(1, { error: 'Password is required' }),
        passwordCheck: z.string().min(1, { error: 'Please confirm your password' }),
    })
    .refine((data) => data.password === data.passwordCheck, {
        error: 'Passwords do not match',
        path: ['passwordCheck'],
    });

/**
 * Register component - renders the registration form.
 * Register new user in the system.
 * On successful registration, user is redirected to the login page.
 * On error, displays an error message.
 */
export default function Register() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const { usersApi, basePath } = useApi();
    const { role } = useAuthState();
    const { isLoggedIn } = useAuthActions();

    const registerMutation = useMutation({
        mutationFn: async (data: {
            username: string;
            email: string;
            password: string;
        }) => {
            return await usersApi.usersCreate({
                userCreateRequest: {
                    username: data.username,
                    email: data.email,
                    password: data.password,
                },
            });
        },
        meta: {
            suppressNotification: true, // We handle toasts ourselves
        },
        onSuccess: (user) => {
            if (!user.emailConfirmed) {
                toast.success('Please check your email for a confirmation link.');
            }

            if (!user.isActive) {
                toast.info(
                    'Your account must be activated by an administrator before you can login.',
                );
            }

            if (user.emailConfirmed && user.isActive) {
                toast.info('Account created successfully.');
            }

            router.navigate({
                to: '/login',
                state: location.state,
                replace: true,
            });
        },
    });
    const [oauthMethods, setOauthMethods] = useState<OAuthMethod[]>([]);
    const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(
        null,
    );

    const form = useForm<FormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            username: '',
            email: '',
            password: '',
            passwordCheck: '',
        },
    });

    useEffect(() => {
        // If user is already logged in, redirect to dashboard
        if (isLoggedIn()) {
            router.navigate({ to: '/', replace: true });
            return;
        }
        if (!basePath) {
            setOauthMethods([]);
            setRegistrationEnabled(null);
            return;
        }

        let isMounted = true;

        const loadConfig = async () => {
            try {
                const response = await fetch(
                    `${basePath}/users/config/`,
                );
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
    }, [basePath, role, router, isLoggedIn]);

    const apiBasePath = basePath ? basePath : '';
    const apiRoot = apiBasePath.replace(/\/api\/?$/, '');

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

        try {
            const redirectUri = `${window.location.origin}/oauth/callback`;
            const redirectUrl = new URL(url);
            redirectUrl.searchParams.set('redirect_uri', redirectUri);
            redirectUrl.searchParams.set('state', `oauth_login:${provider}`);
            return redirectUrl.toString();
        } catch (error) {
            // Invalid URL, return empty string
            return '';
        }
    };

    const oauthOptions = oauthMethods.filter((method) => buildOAuthRedirectUrl(method));

    const onSubmit = async (data: FormData) => {
        if (registrationEnabled === false) {
            toast.error('Registration is disabled. Contact an administrator.');
            return;
        }

        registerMutation.mutate({
            username: data.username,
            email: data.email,
            password: data.password,
        });
    };

    // If user is logged in, don't render the register form
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
                                            Registration is disabled. Use single sign-on
                                            or contact an administrator.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <Controller
                                    name='username'
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldContent>
                                                <FieldLabel htmlFor={field.name}>
                                                    Username
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id={field.name}
                                                    type='text'
                                                    aria-invalid={fieldState.invalid}
                                                    autoComplete='username'
                                                    required
                                                    disabled={
                                                        registrationEnabled === false
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
                                                    required
                                                    disabled={
                                                        registrationEnabled === false
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
                                                    aria-invalid={fieldState.invalid}
                                                    autoComplete='new-password'
                                                    required
                                                    disabled={
                                                        registrationEnabled === false
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
                                    name='passwordCheck'
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
                                                    aria-invalid={fieldState.invalid}
                                                    autoComplete='new-password'
                                                    required
                                                    disabled={
                                                        registrationEnabled === false
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
                                <Field>
                                    <Button
                                        type='submit'
                                        variant='default'
                                        size='default'
                                        className='w-full'
                                        disabled={
                                            form.formState.isSubmitting ||
                                            registrationEnabled === false
                                        }
                                        data-testid='login-register-button'
                                    >
                                        {registrationEnabled === false
                                            ? 'Registration Disabled'
                                            : form.formState.isSubmitting
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
                                                        let redirectPath = '/';
                                                        if (
                                                            typeof location.state ===
                                                            'object' &&
                                                            location.state !== null &&
                                                            'from' in location.state
                                                        ) {
                                                            const from =
                                                                location.state.from;
                                                            if (
                                                                typeof from === 'string'
                                                            ) {
                                                                redirectPath =
                                                                    from.includes('#')
                                                                        ? from.slice(
                                                                            from.indexOf(
                                                                                '#',
                                                                            ) + 1,
                                                                        ) || '/'
                                                                        : from;
                                                            } else if (
                                                                from &&
                                                                typeof from ===
                                                                'object' &&
                                                                'pathname' in from
                                                            ) {
                                                                redirectPath =
                                                                    (
                                                                        from as {
                                                                            pathname?: string;
                                                                        }
                                                                    ).pathname || '/';
                                                            }
                                                        }
                                                        sessionStorage.setItem(
                                                            'oauth_login_redirect',
                                                            redirectPath,
                                                        );
                                                        window.location.href =
                                                            buildOAuthRedirectUrl(
                                                                method,
                                                            );
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
                            <span className='text-xs text-muted-foreground font-mono tracking-wide tracking-wider'>
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
