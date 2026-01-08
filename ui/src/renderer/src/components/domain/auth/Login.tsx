import { useTheme } from '@/contexts/ui/ThemeContext';
import useAuth from '@/hooks/auth/useAuth';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { strip } from '@/utils/links';
import { getApiBaseUrl } from '@/utils/url';
import Logo from '@components/base/Logo/Logo';
import { HalfMoon, Settings, SunLight, Undo, WarningCircle } from 'iconoir-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';

interface Alert {
    show: boolean;
    message: string;
    color: string;
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

/**
 * Login component - renders the login form.
 * Sets the username and password states for the AuthProvider when successfully logged in with the server
 * On error, displays an error message.
 */
export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorToken, setTwoFactorToken] = useState('');
    const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const [oauthMethods, setOauthMethods] = useState<OAuthMethod[]>([]);
    const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(
        null,
    );
    const location = useLocation();

    const { isDarkMode, toggleTheme } = useTheme();

    const { from } = (location.state == '/#login' ? null : location.state) || {
        from: { pathname: '/' },
    };

    const auth = useAuth();
    const { basePath, setBasePath } = auth;

    const [showSettings, setShowSettings] = useState(!basePath);
    const [backendUrl, _setBackendUrl] = useState(basePath || '');

    const { navigate, navigateLink } = useCradleNavigate();

    const setBackendUrl = (url: string) => {
        _setBackendUrl(strip(url));
    };

    useEffect(() => {
        // If backend URL is not set, force settings to be shown
        if (!basePath) {
            setShowSettings(true);
        }
    }, [basePath]);

    useEffect(() => {
        if (!auth.basePath) {
            setOauthMethods([]);
            setRegistrationEnabled(null);
            return;
        }

        let isMounted = true;

        const loadConfig = async () => {
            try {
                const response = await fetch(
                    `${getApiBaseUrl(auth.basePath)}/users/config/`,
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
    }, [auth.basePath]);

    const apiBasePath = auth.basePath ? getApiBaseUrl(auth.basePath) : '';
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

        const redirectUri = `${window.location.origin}/oauth/callback`;
        const redirectUrl = new URL(url);
        redirectUrl.searchParams.set('redirect_uri', redirectUri);
        redirectUrl.searchParams.set('state', `oauth_login:${provider}`);
        return redirectUrl.toString();
    };

    const oauthOptions = oauthMethods.filter((method) => buildOAuthRedirectUrl(method));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = await auth.logIn(
            username,
            password,
            requiresTwoFactor && twoFactorToken ? twoFactorToken : null,
        );

        if (result.result === 'success') {
            setRequiresTwoFactor(false);
            setAlert({ show: false, message: '', color: 'red' });
            console.log('Login successful');

            const redirectPath =
                typeof from === 'string'
                    ? from.includes('#')
                        ? from.slice(from.indexOf('#') + 1) || '/'
                        : from
                    : from?.pathname || '/';

            navigate(redirectPath, { replace: true });
        } else if (result.result === 'requires_2fa') {
            setRequiresTwoFactor(true);
            setAlert({ show: false, message: '', color: 'yellow' });
        } else if (result.result === 'unconfirmed_email') {
            setAlert({ show: true, message: result.message || '', color: 'red' });
        } else if (result.result === 'inactive_account') {
            setAlert({ show: true, message: result.message || '', color: 'red' });
        } else if (result.result === 'network_error') {
            setAlert({ show: true, message: result.message || '', color: 'red' });
        } else {
            setAlert({ show: true, message: result.message || '', color: 'red' });
        }
    };

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        if (!backendUrl) {
            setAlert({ show: true, message: 'Backend URL is required', color: 'red' });
            return;
        }
        localStorage.setItem('backendUrl', backendUrl);
        setBasePath(backendUrl);
        setShowSettings(false);
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
                    {/* Settings/Theme Buttons */}
                    {showSettings ? (
                        <div className='flex items-center gap-2'>
                            {auth.basePath && (
                                <Button
                                    onClick={() => {
                                        setBackendUrl(auth.basePath);
                                        setShowSettings(false);
                                    }}
                                    variant='ghost'
                                    size='icon-sm'
                                    className='p-2 rounded-lg'
                                    data-testid='back-button'
                                    title='Back'
                                >
                                    <Undo width={18} height={18} />
                                </Button>
                            )}
                            <Button
                                onClick={toggleTheme}
                                variant='ghost'
                                size='icon-sm'
                                className='p-2 rounded-lg'
                                data-testid='theme-button'
                                title='Toggle Theme'
                            >
                                {isDarkMode ? (
                                    <SunLight width={18} height={18} />
                                ) : (
                                    <HalfMoon width={18} height={18} />
                                )}
                            </Button>
                        </div>
                    ) : requiresTwoFactor ? (
                        <Button
                            onClick={() => {
                                setRequiresTwoFactor(false);
                                setTwoFactorToken('');
                                setAlert({
                                    show: false,
                                    message: '',
                                    color: 'red',
                                });
                            }}
                            variant='ghost'
                            size='icon-sm'
                            data-testid='back-button'
                            title='Back to Login'
                        >
                            <Undo width={18} height={18} />
                        </Button>
                    ) : (
                        <Button
                            onClick={() => setShowSettings(!showSettings)}
                            variant='ghost'
                            size='icon-sm'
                            data-testid='settings-button'
                            title='Settings'
                        >
                            <Settings width={18} height={18} />
                        </Button>
                    )}
                </div>

                {/* Form Container */}
                <div className='flex flex-1 items-center justify-center'>
                    <div className='w-full max-w-xs'>
                        <form
                            className={cn('flex flex-col gap-6')}
                            onSubmit={
                                showSettings ? handleSaveSettings : handleSubmit
                            }
                        >
                            <FieldGroup>
                            {!showSettings && !requiresTwoFactor && (
                                <div className='flex flex-col items-center gap-1 text-center'>
                                    <h1 className='text-2xl font-bold'>
                                        Login to your account
                                    </h1>
                                    <p className='text-muted-foreground text-sm text-balance'>
                                        Enter your credentials below to login to your account
                                    </p>
                                </div>
                            )}
                            {showSettings && (
                                <div className='flex flex-col items-center gap-1 text-center'>
                                    <h1 className='text-2xl font-bold'>
                                        Configuration
                                    </h1>
                                    <p className='text-muted-foreground text-sm text-balance'>
                                        Configure your backend URL
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
                                        {showSettings ? (
                                            <>
                                                <Field>
                                                    <FieldLabel htmlFor='backendUrl'>
                                                        Backend URL
                                                    </FieldLabel>
                                                    <Input
                                                        id='backendUrl'
                                                        type='text'
                                                        value={backendUrl}
                                                        onChange={(e) =>
                                                            setBackendUrl(e.target.value)
                                                        }
                                                        autoFocus={true}
                                                        required={true}
                                                        placeholder='https://api.example.com'
                                                    />
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
                                                    >
                                                        Save Configuration
                                                    </Button>
                                                </Field>
                                            </>
                                        ) : (
                                            <>
                                                {requiresTwoFactor ? (
                                                    <>
                                                        <Field>
                                                            <InputOTP
                                                                maxLength={6}
                                                                value={twoFactorToken}
                                                                onChange={(value) =>
                                                                    setTwoFactorToken(value)
                                                                }
                                                                containerClassName="w-full"
                                                            >
                                                                <InputOTPGroup className="w-full">
                                                                    <InputOTPSlot index={0} className="flex-1 h-12" />
                                                                    <InputOTPSlot index={1} className="flex-1 h-12" />
                                                                    <InputOTPSlot index={2} className="flex-1 h-12" />
                                                                    <InputOTPSlot index={3} className="flex-1 h-12" />
                                                                    <InputOTPSlot index={4} className="flex-1 h-12" />
                                                                    <InputOTPSlot index={5} className="flex-1 h-12" />
                                                                </InputOTPGroup>
                                                            </InputOTP>
                                                            <FieldDescription>
                                                                Enter the 6-digit code from
                                                                your authenticator app
                                                            </FieldDescription>
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
                                                                data-testid='login-register-button'
                                                            >
                                                                Verify
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
                                                                    setUsername(
                                                                        e.target.value,
                                                                    )
                                                                }
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
                                                                        setRequiresTwoFactor(
                                                                            false,
                                                                        )
                                                                    }
                                                                >
                                                                    Forgot password?
                                                                </Link>
                                                            </div>
                                                            <Input
                                                                id='password'
                                                                name='password'
                                                                type='password'
                                                                value={password}
                                                                onChange={(e) =>
                                                                    setPassword(
                                                                        e.target.value,
                                                                    )
                                                                }
                                                                required
                                                            />
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
                                                                data-testid='login-register-button'
                                                            >
                                                                Log in
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
                                                                    (method) => (
                                                                            <Field
                                                                            key={`${getOAuthKey(method)}-${getOAuthUrl(method)}`}
                                                                        >
                                                                            <Button
                                                                                type='button'
                                                                                variant='outline'
                                                                                size='default'
                                                                                className='w-full'
                                                                                onClick={() => {
                                                                                    const redirectPath =
                                                                                        typeof from ===
                                                                                        'string'
                                                                                            ? from.includes(
                                                                                                  '#',
                                                                                              )
                                                                                                ? from.slice(
                                                                                                      from.indexOf(
                                                                                                          '#',
                                                                                                      ) +
                                                                                                          1,
                                                                                                  ) ||
                                                                                                  '/'
                                                                                                : from
                                                                                            : from?.pathname ||
                                                                                              '/';
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
                                                                                {getOAuthLabel(
                                                                                    method,
                                                                                )}
                                                                            </Button>
                                                                        </Field>
                                                                    ),
                                                                )}
                                                            </>
                                                        )}
                                                        {auth.basePath &&
                                                        registrationEnabled === false ? (
                                                            <FieldDescription className='text-center text-muted-foreground'>
                                                                Registration is disabled.
                                                            </FieldDescription>
                                                        ) : (
                                                            auth.basePath && (
                                                            <>
                                                                <FieldSeparator />
                                                                <Field>
                                                                    <FieldDescription className='text-center'>
                                                                        Don&apos;t have an
                                                                        account?{' '}
                                                                        <Link
                                                                            to='/register'
                                                                            className='underline underline-offset-4'
                                                                            replace={true}
                                                                            state={{ from: from }}
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
                                                            )
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        )}
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
