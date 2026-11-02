import { AuthHeader, AuthLayout } from '@/components/domain/auth/auth-layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { useAuthActions, useAuthState } from '@/hooks/auth/use-auth';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import { EyeIcon, EyeSlashIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { $api } from '@services/openapi/client';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useId, useState } from 'react';

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
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [otp, setOtp] = useState('');
    const [isTwoFactorRequired, setIsTwoFactorRequired] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formErrorTitle, setFormErrorTitle] = useState<string | undefined>(undefined);
    const loginTwoFactorOtpId = useId();
    const location = useRouterState({
        select: (state) => state.location,
    });

    const { from } = (location.state as { from?: string | { pathname: string } }) || {
        from: { pathname: '/' },
    };

    const { basePath } = useAuthState();
    const { logIn, isLoggedIn } = useAuthActions();
    const loggedIn = isLoggedIn();

    const router = useRouter();

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

    useEffect(() => {
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

    const submit = async (e: React.SubmitEvent) => {
        e.preventDefault();

        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        setFormError(null);
        setFormErrorTitle(undefined);

        try {
            const result = await logIn(
                username,
                password,
                isTwoFactorRequired && otp ? otp : null,
            );

            if (result.result === 'success') {
                setIsTwoFactorRequired(false);

                router.navigate({
                    to: getRedirectPath(from) as any,
                    replace: true,
                });
                return;
            } else if (result.result === 'requires_2fa') {
                setIsTwoFactorRequired(true);
            } else {
                setFormError(result.message || 'Login failed');
                setFormErrorTitle(result.title);
            }
        } catch (error) {
            try {
                const parsed = await parseAPIError(error);
                setFormError(getDisplayMessage(parsed));
                setFormErrorTitle(parsed.title);
            } catch {
                setFormError('Login failed');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loggedIn) {
        return null;
    }

    const errorAlert = formError && (
        <Alert variant='destructive'>
            <WarningCircleIcon weight='bold' />
            <AlertTitle>{formErrorTitle || 'Error'}</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
        </Alert>
    );

    return (
        <AuthLayout>
            <form onSubmit={submit}>
                {isTwoFactorRequired ? (
                    <FieldGroup className='sm:gap-[18px]'>
                        <AuthHeader
                            title='Enter your code'
                            description='Open your authenticator app and type the 6-digit code.'
                        />
                        <Field>
                            <FieldLabel
                                htmlFor={loginTwoFactorOtpId}
                                className='sr-only'
                            >
                                Verification code
                            </FieldLabel>
                            <InputOTP
                                id={loginTwoFactorOtpId}
                                name='login-2fa-otp'
                                autoComplete='one-time-code'
                                maxLength={6}
                                value={otp}
                                onChange={(value) => setOtp(value)}
                                containerClassName='w-full'
                                autoFocus={true}
                            >
                                <InputOTPGroup className='w-full gap-2'>
                                    {OTP_INDICES.map((i) => (
                                        <InputOTPSlot
                                            key={i}
                                            index={i}
                                            className='h-14 flex-1 border font-mono text-2xl sm:h-[52px] sm:text-[22px]'
                                        />
                                    ))}
                                </InputOTPGroup>
                            </InputOTP>
                        </Field>
                        {errorAlert}
                        <Button
                            type='submit'
                            className='w-full'
                            disabled={isSubmitting || otp.length < 6}
                            data-testid='login-register-button'
                        >
                            {isSubmitting && <Spinner />}
                            Verify
                        </Button>
                        <div className='flex items-center gap-3 border-t pt-3.5 text-sm text-muted-foreground sm:text-[13px]'>
                            <span className='min-w-0 truncate'>
                                Signing in as {username}
                            </span>
                            <button
                                type='button'
                                className='ml-auto py-2.5 text-primary hover:underline underline-offset-4'
                                data-testid='back-button'
                                onClick={() => {
                                    setIsTwoFactorRequired(false);
                                    setOtp('');
                                    setFormError(null);
                                }}
                            >
                                Back
                            </button>
                        </div>
                    </FieldGroup>
                ) : (
                    <FieldGroup className='gap-[18px] sm:gap-4'>
                        <AuthHeader
                            title='Sign in'
                            description={
                                basePath &&
                                userConfig?.signup !== false && (
                                    <>
                                        Don&apos;t have an account?{' '}
                                        <Link
                                            to='/signup'
                                            className='text-primary underline-offset-4 hover:underline'
                                            replace={true}
                                            state={{ from: from } as any}
                                        >
                                            Sign up
                                        </Link>
                                    </>
                                )
                            }
                        />
                        {errorAlert}
                        <Field>
                            <FieldLabel htmlFor='username'>Username</FieldLabel>
                            <Input
                                id='username'
                                name='username'
                                type='text'
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete='username'
                                autoFocus={true}
                                required
                            />
                        </Field>
                        <Field>
                            <div className='flex items-center'>
                                <FieldLabel htmlFor='password'>Password</FieldLabel>
                                <Link
                                    to='/forgot-password'
                                    className='ml-auto text-xs text-primary underline-offset-4 hover:underline'
                                    replace={true}
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <InputGroup>
                                <InputGroupInput
                                    id='password'
                                    name='password'
                                    type={isPasswordVisible ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete='current-password'
                                    required
                                />
                                <InputGroupAddon align='inline-end'>
                                    <InputGroupButton
                                        type='button'
                                        onClick={() =>
                                            setIsPasswordVisible(!isPasswordVisible)
                                        }
                                        aria-label={
                                            isPasswordVisible
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                        aria-pressed={isPasswordVisible}
                                        title={
                                            isPasswordVisible
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                    >
                                        {isPasswordVisible ? (
                                            <EyeSlashIcon
                                                className='size-4'
                                                weight='bold'
                                            />
                                        ) : (
                                            <EyeIcon className='size-4' weight='bold' />
                                        )}
                                    </InputGroupButton>
                                </InputGroupAddon>
                            </InputGroup>
                        </Field>
                        <Button
                            type='submit'
                            className='w-full'
                            disabled={isSubmitting}
                            data-testid='login-register-button'
                        >
                            {isSubmitting && <Spinner />}
                            Sign in
                        </Button>
                        {oauthOptions.length > 0 && (
                            <>
                                <FieldSeparator>or</FieldSeparator>
                                {oauthOptions.map(({ key, label, redirectUrl }) => (
                                    <Button
                                        key={key}
                                        type='button'
                                        variant='outline'
                                        className='w-full'
                                        onClick={() => {
                                            sessionStorage.setItem(
                                                'oauth_login_redirect',
                                                getRedirectPath(from),
                                            );
                                            window.location.href = redirectUrl;
                                        }}
                                    >
                                        Continue with {label}
                                    </Button>
                                ))}
                            </>
                        )}
                    </FieldGroup>
                )}
            </form>
        </AuthLayout>
    );
}
