import { AuthHeader, AuthLayout } from '@/components/domain/auth/auth-layout';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, EyeSlashIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

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
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
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
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const { basePath } = useAuthState();
    const { isLoggedIn } = useAuthActions();
    const isAlreadyLoggedIn = isLoggedIn();

    const createAccount = useMutation({
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
                title: parsed.title,
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
    const { isSubmitting } = form.formState;

    const { data: authConfig } = $api.useQuery('get', '/auth/config/', undefined, {
        enabled: !!basePath && !isAlreadyLoggedIn,
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

    const oauthMethods = authConfig?.oauthMethods || [];
    const isRegistrationClosed = authConfig?.signup === false;

    useEffect(() => {
        if (isAlreadyLoggedIn) {
            router.navigate({ to: '/', replace: true });
        }
    }, [isAlreadyLoggedIn, router]);

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
            return '';
        }
    };

    const oauthOptions = oauthMethods
        .map((method) => {
            const redirectUrl = buildOAuthRedirectUrl(method);
            return redirectUrl ? { method, redirectUrl } : null;
        })
        .filter(Boolean) as Array<{ method: OAuthMethod; redirectUrl: string }>;

    const onSubmit = async (values: FormData) => {
        if (isRegistrationClosed) {
            setAlert({
                show: true,
                message: 'Registration is disabled. Contact an administrator.',
                color: 'red',
            });
            return;
        }

        await createAccount.mutateAsync({
            username: values.username,
            email: values.email,
            password: values.password,
        });
    };

    if (isAlreadyLoggedIn) {
        return null;
    }

    return (
        <AuthLayout>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup className='gap-[18px] sm:gap-4'>
                    <AuthHeader
                        title='Create an account'
                        description='Enter your details to create an account.'
                    />
                    {isRegistrationClosed && (
                        <Alert>
                            <WarningCircleIcon weight='bold' />
                            <AlertTitle>Notice</AlertTitle>
                            <AlertDescription>
                                Registration is disabled. Use single sign-on or contact
                                an administrator.
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
                                        disabled={isRegistrationClosed}
                                    />
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
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
                                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                                    <Input
                                        {...field}
                                        id={field.name}
                                        type='email'
                                        aria-invalid={fieldState.invalid}
                                        autoComplete='email'
                                        required
                                        disabled={isRegistrationClosed}
                                    />
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
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
                                                isPasswordVisible ? 'text' : 'password'
                                            }
                                            aria-invalid={fieldState.invalid}
                                            autoComplete='new-password'
                                            required
                                            disabled={isRegistrationClosed}
                                        />
                                        <InputGroupAddon align='inline-end'>
                                            <InputGroupButton
                                                type='button'
                                                onClick={() =>
                                                    setIsPasswordVisible(
                                                        !isPasswordVisible,
                                                    )
                                                }
                                                aria-label={
                                                    isPasswordVisible
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
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
                                                    <EyeIcon
                                                        className='size-4'
                                                        weight='bold'
                                                    />
                                                )}
                                            </InputGroupButton>
                                        </InputGroupAddon>
                                    </InputGroup>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
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
                                                isConfirmPasswordVisible
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            aria-invalid={fieldState.invalid}
                                            autoComplete='new-password'
                                            required
                                            disabled={isRegistrationClosed}
                                        />
                                        <InputGroupAddon align='inline-end'>
                                            <InputGroupButton
                                                type='button'
                                                onClick={() =>
                                                    setIsConfirmPasswordVisible(
                                                        !isConfirmPasswordVisible,
                                                    )
                                                }
                                                aria-label={
                                                    isConfirmPasswordVisible
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                                title={
                                                    isConfirmPasswordVisible
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                            >
                                                {isConfirmPasswordVisible ? (
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
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </FieldContent>
                            </Field>
                        )}
                    />
                    {alert.show && (
                        <Alert
                            variant={
                                alert.color === 'red' || alert.color === 'error'
                                    ? 'destructive'
                                    : 'default'
                            }
                        >
                            <WarningCircleIcon weight='bold' />
                            <AlertTitle>
                                {alert.color === 'red' || alert.color === 'error'
                                    ? alert.title || 'Error'
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
                            disabled={isSubmitting || isRegistrationClosed}
                            data-testid='login-register-button'
                        >
                            {!isRegistrationClosed && isSubmitting && <Spinner />}
                            {isRegistrationClosed
                                ? 'Registration disabled'
                                : 'Create account'}
                        </Button>
                    </Field>
                    {oauthOptions.length > 0 && (
                        <>
                            <FieldSeparator>or</FieldSeparator>
                            {oauthOptions.map(({ method, redirectUrl }) => (
                                <Field key={`${getOAuthKey(method)}-${redirectUrl}`}>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='default'
                                        className='w-full'
                                        onClick={() => {
                                            let redirectPath = '/';
                                            if (
                                                typeof location.state === 'object' &&
                                                location.state !== null &&
                                                'from' in location.state
                                            ) {
                                                const from = location.state.from;
                                                if (typeof from === 'string') {
                                                    redirectPath = from.includes('#')
                                                        ? from.slice(
                                                              from.indexOf('#') + 1,
                                                          ) || '/'
                                                        : from;
                                                } else if (
                                                    from &&
                                                    typeof from === 'object' &&
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
                                            window.location.href = redirectUrl;
                                        }}
                                    >
                                        Continue with {getOAuthLabel(method)}
                                    </Button>
                                </Field>
                            ))}
                        </>
                    )}
                    <Field>
                        <FieldDescription className='border-t pt-3.5 text-center'>
                            Already have an account?{' '}
                            <Link
                                to='/login'
                                className='text-primary underline-offset-4 hover:underline'
                                state={location.state}
                                replace={true}
                            >
                                Sign in
                            </Link>
                        </FieldDescription>
                    </Field>
                </FieldGroup>
            </form>
        </AuthLayout>
    );
}
