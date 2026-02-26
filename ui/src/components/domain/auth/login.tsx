import { Button } from '@/components/ui/button';
import {
    Field,
    FieldDescription,
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTheme } from '@/contexts/ui';
import { useAuthActions, useAuthState } from '@/hooks/auth/use-auth';
import { parseAPIError } from '@/utils/api';
import Logo from '@components/base/logo/logo';
import {
    ArrowUUpLeftIcon,
    EyeIcon,
    EyeSlashIcon,
    MoonIcon,
    SunIcon,
} from '@phosphor-icons/react';
import { $api } from '@services/openapi/client';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';

const GlobeVisualization = lazy(() => import('./globe-visualization'));

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

const getRedirectPath = (from: string | { pathname: string } | undefined) =>
    typeof from === 'string'
        ? from.includes('#')
            ? from.slice(from.indexOf('#') + 1) || '/'
            : from
        : from?.pathname || '/';

const OTP_INDICES = [0, 1, 2, 3, 4, 5] as const;

/**
 * Login component - renders the login form.
 * Sets the username and password states for the AuthProvider when successfully logged in with the server
 * On error, displays an error message.
 */
export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [twoFactorToken, setTwoFactorToken] = useState('');
    const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const location = useRouterState({
        select: (state) => state.location,
    });

    const { isDarkMode, toggleTheme } = useTheme();

    const { from } = (location.state as { from?: string | { pathname: string } }) || {
        from: { pathname: '/' },
    };

    const { basePath } = useAuthState();
    const { logIn, isLoggedIn } = useAuthActions();
    const loggedIn = isLoggedIn();

    const router = useRouter();

    // Query for OAuth configuration
    const { data: userConfig } = $api.useQuery('get', '/users/config/', undefined, {
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
    const signup = userConfig?.signup;

    useEffect(() => {
        // If user is already logged in, redirect to dashboard
        if (loggedIn) {
            router.navigate({ to: '/', replace: true });
        }
    }, [loggedIn, router]);

    const apiBasePath = basePath ?? '';
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
        } catch (_error) {
            // Invalid URL, return empty string
            return '';
        }
    };

    const oauthOptions = oauthMethods
        .map((method) => ({
            redirectUrl: buildOAuthRedirectUrl(method),
            key: `${getOAuthKey(method)}-${getOAuthUrl(method)}`,
            label: getOAuthLabel(method),
        }))
        .filter((x) => !!x.redirectUrl);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await logIn(
                username,
                password,
                requiresTwoFactor && twoFactorToken ? twoFactorToken : null,
            );

            if (result.result === 'success') {
                setRequiresTwoFactor(false);

                router.navigate({
                    to: getRedirectPath(from) as any,
                    replace: true,
                });
                return;
            } else if (result.result === 'requires_2fa') {
                setRequiresTwoFactor(true);
            } else {
                toast.error(result.message || 'Login failed');
            }
        } catch (error) {
            try {
                const parsed = await parseAPIError(error);
                toast.error(parsed.detail);
            } catch {
                toast.error('Login failed');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // If user is logged in, don't render the login form
    // This prevents flash of login page after successful login
    if (loggedIn) {
        return null;
    }

    return (
        <div className='relative min-h-svh w-full overflow-hidden'>
            {/* Left Column - Form */}
            <div className='relative z-10 flex h-full min-h-svh flex-col gap-4 bg-background p-6 md:p-10 lg:w-1/2'>
                {/* Branding */}
                <div className='flex justify-between items-center gap-2'>
                    <a href='#' className='flex items-center gap-2 font-medium'>
                        <Logo text={true} width='120px' />
                    </a>
                    {/* Theme Button */}
                    {requiresTwoFactor ? (
                        <Button
                            onClick={() => {
                                setRequiresTwoFactor(false);
                                setTwoFactorToken('');
                            }}
                            variant='ghost'
                            size='icon-sm'
                            data-testid='back-button'
                            title='Back to Login'
                        >
                            <ArrowUUpLeftIcon size={18} weight='bold' />
                        </Button>
                    ) : (
                        <Button
                            onClick={toggleTheme}
                            variant='ghost'
                            size='icon-sm'
                            className='p-2 rounded-lg'
                            data-testid='theme-button'
                            title='Toggle Theme'
                        >
                            {isDarkMode ? (
                                <SunIcon size={18} weight='bold' />
                            ) : (
                                <MoonIcon size={18} weight='bold' />
                            )}
                        </Button>
                    )}
                </div>

                {/* Form Container */}
                <div className='flex flex-1 items-center justify-center'>
                    <div className='w-full max-w-xs'>
                        <form className='flex flex-col gap-6' onSubmit={handleSubmit}>
                            <FieldGroup className='gap-4'>
                                {!requiresTwoFactor && (
                                    <div className='flex flex-col items-center gap-1 text-center'>
                                        <h1 className='text-2xl font-bold'>
                                            Login to your account
                                        </h1>
                                        <p className='text-muted-foreground text-sm text-balance'>
                                            Enter your credentials below to login to
                                            your account
                                        </p>
                                    </div>
                                )}
                                {requiresTwoFactor && (
                                    <div className='flex flex-col items-center gap-1 text-center'>
                                        <h1 className='text-2xl font-bold'>
                                            2FA Authentication
                                        </h1>
                                        <p className='text-muted-foreground text-sm text-balance'>
                                            Please verify your identity
                                        </p>
                                    </div>
                                )}
                                {requiresTwoFactor ? (
                                    <>
                                        <Field>
                                            <InputOTP
                                                maxLength={6}
                                                value={twoFactorToken}
                                                onChange={(value) =>
                                                    setTwoFactorToken(value)
                                                }
                                                containerClassName='w-full'
                                            >
                                                <InputOTPGroup className='w-full'>
                                                    {OTP_INDICES.map((i) => (
                                                        <InputOTPSlot
                                                            key={i}
                                                            index={i}
                                                            className='flex-1 h-12'
                                                        />
                                                    ))}
                                                </InputOTPGroup>
                                            </InputOTP>
                                            <FieldDescription>
                                                Enter the 6-digit code from your
                                                authenticator app
                                            </FieldDescription>
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
                                                {isSubmitting
                                                    ? 'Verifying...'
                                                    : 'Verify'}
                                            </Button>
                                        </Field>
                                    </>
                                ) : (
                                    <>
                                        <Field>
                                            <FieldLabel htmlFor='username'>
                                                Username
                                            </FieldLabel>
                                            <Input
                                                id='username'
                                                name='username'
                                                type='text'
                                                value={username}
                                                onChange={(e) =>
                                                    setUsername(e.target.value)
                                                }
                                                autoComplete='username'
                                                autoFocus={true}
                                                required
                                            />
                                        </Field>
                                        <Field>
                                            <div className='flex items-center'>
                                                <FieldLabel htmlFor='password'>
                                                    Password
                                                </FieldLabel>
                                                <Link
                                                    to='/forgot-password'
                                                    className='ml-auto text-sm underline-offset-4 hover:underline'
                                                    replace={true}
                                                    onClick={() =>
                                                        setRequiresTwoFactor(false)
                                                    }
                                                >
                                                    Forgot password?
                                                </Link>
                                            </div>
                                            <InputGroup>
                                                <InputGroupInput
                                                    id='password'
                                                    name='password'
                                                    type={
                                                        showPassword
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    value={password}
                                                    onChange={(e) =>
                                                        setPassword(e.target.value)
                                                    }
                                                    autoComplete='current-password'
                                                    required
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
                                                {isSubmitting
                                                    ? 'Logging in...'
                                                    : 'Log in'}
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
                                                {oauthOptions.map(
                                                    ({ key, label, redirectUrl }) => (
                                                        <Field key={key}>
                                                            <Button
                                                                type='button'
                                                                variant='outline'
                                                                size='default'
                                                                className='w-full'
                                                                onClick={() => {
                                                                    sessionStorage.setItem(
                                                                        'oauth_login_redirect',
                                                                        getRedirectPath(
                                                                            from,
                                                                        ),
                                                                    );
                                                                    window.location.href =
                                                                        redirectUrl;
                                                                }}
                                                            >
                                                                {label}
                                                            </Button>
                                                        </Field>
                                                    ),
                                                )}
                                            </>
                                        )}
                                        {basePath && signup !== false && (
                                            <>
                                                <FieldSeparator />
                                                <Field>
                                                    <FieldDescription className='text-center'>
                                                        Don&apos;t have an account?{' '}
                                                        <Link
                                                            to='/register'
                                                            className='underline underline-offset-4'
                                                            replace={true}
                                                            state={
                                                                {
                                                                    from: from,
                                                                } as any
                                                            }
                                                            onClick={() =>
                                                                setRequiresTwoFactor(
                                                                    false,
                                                                )
                                                            }
                                                        >
                                                            Sign up
                                                        </Link>
                                                    </FieldDescription>
                                                </Field>
                                            </>
                                        )}
                                    </>
                                )}
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

            {/* Right Column - Globe */}
            <div className='absolute bottom-0 right-0 top-0 hidden w-[65%] bg-muted dark:bg-black lg:block'>
                <Suspense fallback={null}>
                    <GlobeVisualization
                        showSatellites={false}
                        showArcs={true}
                        showHexPolygons={true}
                        showAtmosphere={true}
                        autoRotate={true}
                        autoRotateSpeed={0.5}
                        initialView={{ lat: 20, lng: 0, altitude: 3.5 }}
                        viewOffsetX={120}
                    />
                </Suspense>
            </div>
        </div>
    );
}
