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
import { $api, fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

const SIGNUP_IMAGES = ['/1.png', '/2.png', '/3.png', '/4.png'];

type FormData = z.infer<typeof signupSchema>;

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

const signupSchema = z
    .object({
        username: z.string().min(1, { error: 'Username is required' }),
        email: z
            .email({ error: 'Invalid email' })
            .min(1, { error: 'Email is required' }),
        password: z
            .string()
            .min(12, { error: 'Password must be at least 12 characters' })
            .regex(/[0-9]/, { error: 'Password must contain at least 1 digit' })
            .regex(/[A-Z]/, {
                error: 'Password must contain at least 1 uppercase letter',
            })
            .regex(/[^a-zA-Z0-9]/, {
                error: 'Password must contain at least 1 special character',
            }),
        passwordCheck: z.string().min(1, { error: 'Please confirm your password' }),
    })
    .refine((data) => data.password === data.passwordCheck, {
        error: 'Passwords do not match',
        path: ['passwordCheck'],
    });

/**
 * Signup component - renders the signup form.
 * Creates new user in the system.
 * On success, redirects to login. On error, displays an error message.
 */
export default function Signup() {
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordCheck, setShowPasswordCheck] = useState(false);
    const [signupImage] = useState(
        () => SIGNUP_IMAGES[Math.floor(Math.random() * SIGNUP_IMAGES.length)],
    );
    const [alert, setAlert] = useState<{
        show: boolean;
        message: string;
        color: string;
    }>({
        show: false,
        message: '',
        color: 'red',
    });
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const { basePath } = useAuthState();
    const { isLoggedIn } = useAuthActions();
    const loggedIn = isLoggedIn();

    const signupMutation = useMutation({
        mutationFn: async (data: {
            username: string;
            email: string;
            password: string;
        }) => {
            const {
                error,
                response,
                data: user,
            } = await fetchClient.POST('/auth/signup/', {
                body: {
                    username: data.username,
                    email: data.email,
                    password: data.password,
                },
            });
            if (error) throw { response, error };
            return user;
        },
        meta: {
            suppressNotification: true, // We use Alert for form feedback
        },
        onError: async (error) => {
            const parsed = await parseAPIError(error);
            setAlert({
                show: true,
                message: getDisplayMessage(parsed),
                color: 'red',
            });
        },
        onSuccess: (user) => {
            const msg = getSuccessMessage(user);
            setAlert({
                show: true,
                message: msg ?? '',
                color: 'green',
            });
            setTimeout(
                () =>
                    router.navigate({
                        to: '/login',
                        state: location.state,
                        replace: true,
                    }),
                2000,
            );
        },
    });
    const form = useForm<FormData>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            username: '',
            email: '',
            password: '',
            passwordCheck: '',
        },
    });

    // Query for OAuth configuration
    const { data: userConfig } = $api.useQuery('get', '/auth/config/', undefined, {
        enabled: !!basePath && !loggedIn,
        meta: {
            suppressNotification: true,
        },
        select: (raw) => {
            const config = raw as Record<string, unknown>;
            const oauthMethods =
                (config.oauthMethods as unknown[]) ??
                (config.oauth_methods as unknown[]) ??
                [];
            const signup =
                (config.signup as boolean | undefined) ??
                (config.registration_enabled as boolean | undefined);

            return {
                oauthMethods: (Array.isArray(oauthMethods)
                    ? oauthMethods
                    : []) as OAuthMethod[],
                signup: signup ?? true,
            };
        },
    });

    const oauthMethods = userConfig?.oauthMethods || [];
    const signup = userConfig?.signup ?? null;
    const isSignupDisabled = signup === false;

    useEffect(() => {
        // If user is already logged in, redirect to dashboard
        if (loggedIn) {
            router.navigate({ to: '/', replace: true });
        }
    }, [loggedIn, router]);

    const apiRoot = (basePath ?? '').replace(/\/api\/?$/, '');

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
        } catch {
            // Invalid URL, return empty string
            return '';
        }
    };

    const oauthOptions = oauthMethods
        .map((method) => {
            const redirectUrl = buildOAuthRedirectUrl(method);
            return redirectUrl ? { method, redirectUrl } : null;
        })
        .filter(Boolean) as Array<{ method: OAuthMethod; redirectUrl: string }>;

    const onSubmit = async (data: FormData) => {
        if (isSignupDisabled) {
            setAlert({
                show: true,
                message: 'Registration is disabled. Contact an administrator.',
                color: 'red',
            });
            return;
        }

        await signupMutation.mutateAsync({
            username: data.username,
            email: data.email,
            password: data.password,
        });
    };

    // If user is logged in, don't render the signup form
    if (loggedIn) {
        return null;
    }

    return (
        <div className='relative min-h-svh w-full overflow-hidden'>
            {/* Left Column - Form */}
            <div className='relative z-10 flex h-full min-h-svh flex-col gap-4 bg-background p-6 md:p-10 lg:w-1/2'>
                {/* Branding */}
                <div className='flex justify-between items-center gap-2'>
                    <Link to='/' className='flex items-center gap-2 font-medium'>
                        <Logo text={true} width='120px' />
                    </Link>
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
                            className='flex flex-col gap-6'
                            onSubmit={form.handleSubmit(onSubmit)}
                        >
                            <FieldGroup className='gap-4'>
                                <div className='flex flex-col items-center gap-1 text-center'>
                                    <h1 className='text-2xl font-bold'>
                                        Create an account
                                    </h1>
                                    <p className='text-muted-foreground text-sm text-balance'>
                                        Enter your information to create your account
                                    </p>
                                </div>
                                {isSignupDisabled && (
                                    <Alert>
                                        <WarningCircleIcon
                                            className='size-4'
                                            weight='bold'
                                        />
                                        <AlertTitle>Notice</AlertTitle>
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
                                                    disabled={isSignupDisabled}
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
                                                    disabled={isSignupDisabled}
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
                                                <InputGroup>
                                                    <InputGroupInput
                                                        {...field}
                                                        id={field.name}
                                                        type={
                                                            showPassword
                                                                ? 'text'
                                                                : 'password'
                                                        }
                                                        aria-invalid={
                                                            fieldState.invalid
                                                        }
                                                        autoComplete='new-password'
                                                        required
                                                        disabled={isSignupDisabled}
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
                                    name='passwordCheck'
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
                                                            showPasswordCheck
                                                                ? 'text'
                                                                : 'password'
                                                        }
                                                        aria-invalid={
                                                            fieldState.invalid
                                                        }
                                                        autoComplete='new-password'
                                                        required
                                                        disabled={isSignupDisabled}
                                                    />
                                                    <InputGroupAddon align='inline-end'>
                                                        <InputGroupButton
                                                            type='button'
                                                            onClick={() =>
                                                                setShowPasswordCheck(
                                                                    !showPasswordCheck,
                                                                )
                                                            }
                                                            aria-label={
                                                                showPasswordCheck
                                                                    ? 'Hide password'
                                                                    : 'Show password'
                                                            }
                                                            title={
                                                                showPasswordCheck
                                                                    ? 'Hide password'
                                                                    : 'Show password'
                                                            }
                                                        >
                                                            {showPasswordCheck ? (
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
                                                ? 'Error'
                                                : 'Success'}
                                        </AlertTitle>
                                        <AlertDescription className='whitespace-pre-line'>
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
                                        disabled={
                                            form.formState.isSubmitting ||
                                            isSignupDisabled
                                        }
                                        data-testid='login-register-button'
                                    >
                                        {!isSignupDisabled &&
                                            form.formState.isSubmitting && (
                                                <Spinner className='size-4' />
                                            )}
                                        {isSignupDisabled
                                            ? 'Registration Disabled'
                                            : 'Sign Up'}
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
                                        {oauthOptions.map(({ method, redirectUrl }) => (
                                            <Field
                                                key={`${getOAuthKey(method)}-${redirectUrl}`}
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
                                                            redirectUrl;
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
            <div
                className='absolute bottom-0 right-0 top-0 hidden w-[65%] overflow-hidden bg-muted dark:bg-black lg:block select-none'
                onContextMenu={(e) => e.preventDefault()}
            >
                <img
                    src={signupImage}
                    alt=''
                    className='block h-full w-full object-cover pointer-events-none'
                    draggable={false}
                />
            </div>
        </div>
    );
}
