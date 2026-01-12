import { Button } from '@/components/ui/button';
import { useAuthActions, useAuthState } from '@/hooks/auth/useAuth';
import Logo from '@components/base/Logo/Logo';
import { useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';

type OAuthAction = 'oauth_login' | 'oauth_connect';

interface OAuthState {
    action: OAuthAction;
    provider: string;
}

const parseOAuthState = (stateValue: string | null): OAuthState | null => {
    if (!stateValue) {
        return null;
    }

    const [action, provider] = stateValue.split(':');
    if ((action === 'oauth_login' || action === 'oauth_connect') && provider) {
        return { action, provider };
    }

    return null;
};

export default function OAuthCallback() {
    const { basePath } = useAuthState();
    const { isLoggedIn, getAccessToken, setTokensDirectly } = useAuthActions();
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState('Completing sign-in...');
    const hasExchangedRef = useRef(false);

    const redirectUri = useMemo(() => `${window.location.origin}/oauth/callback`, []);

    useEffect(() => {
        if (hasExchangedRef.current) {
            return;
        }
        hasExchangedRef.current = true;

        const url = new URL(window.location.href);
        let queryString = url.search;
        if (!queryString && url.hash.includes('?')) {
            queryString = url.hash.slice(url.hash.indexOf('?'));
        }
        const params = new URLSearchParams(queryString);
        const error = params.get('error');
        if (error) {
            setErrorMessage('OAuth request was denied.');
            setStatusMessage('Unable to continue.');
            return;
        }

        const code = params.get('code');
        if (!code) {
            setErrorMessage('Missing OAuth authorization code.');
            setStatusMessage('Unable to continue.');
            return;
        }

        const state = parseOAuthState(params.get('state'));
        const provider =
            state?.provider ||
            params.get('provider') ||
            sessionStorage.getItem('oauth_connect_provider');

        if (!provider) {
            setErrorMessage('Missing OAuth provider.');
            setStatusMessage('Unable to continue.');
            return;
        }

        const action = state?.action || 'oauth_login';

        const run = async () => {
            if (!basePath) {
                setErrorMessage('Backend URL is not configured.');
                setStatusMessage('Unable to continue.');
                return;
            }

            try {
                if (action === 'oauth_connect') {
                    if (!isLoggedIn()) {
                        setErrorMessage('You must be logged in to connect accounts.');
                        setStatusMessage('Unable to continue.');
                        return;
                    }

                    const token = await getAccessToken();
                    const response = await fetch(
                        `${basePath}/users/oauth/connect/`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                provider,
                                code,
                                redirect_uri: redirectUri,
                            }),
                        },
                    );

                    if (!response.ok) {
                        throw new Error('Failed to connect OAuth provider.');
                    }

                    const returnPath =
                        sessionStorage.getItem('oauth_connect_return_path') ||
                        '/settings';
                    sessionStorage.removeItem('oauth_connect_return_path');
                    sessionStorage.removeItem('oauth_connect_provider');
                    router.navigate({
                        to: returnPath.startsWith('/')
                            ? (returnPath as any)
                            : (`/${returnPath}` as any),
                        replace: true,
                    });
                    return;
                }

                const response = await fetch(
                    `${basePath}/users/oauth/login/`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            provider,
                            code,
                            redirect_uri: redirectUri,
                        }),
                    },
                );

                if (!response.ok) {
                    throw new Error('OAuth login failed.');
                }

                const data = await response.json();
                data.accessExpiresAt = new Date(data.access_expires_at);
                data.refreshExpiresAt = new Date(data.refresh_expires_at);
                setTokensDirectly(data);

                const redirectPath =
                    sessionStorage.getItem('oauth_login_redirect') || '/';
                const normalizedRedirect =
                    redirectPath === '/oauth/callback' ||
                        redirectPath === '#/oauth/callback'
                        ? '/'
                        : redirectPath;
                sessionStorage.removeItem('oauth_login_redirect');
                router.navigate({
                    to: normalizedRedirect.startsWith('/')
                        ? (normalizedRedirect as any)
                        : (`/${normalizedRedirect}` as any),
                    replace: true,
                });
            } catch (error) {
                setErrorMessage('OAuth flow failed. Please try again.');
                setStatusMessage('Unable to continue.');
            }
        };

        run();
    }, [location.search, router, redirectUri, location]);

    return (
        <div className='grid min-h-svh lg:grid-cols-2'>
            <div className='flex flex-col gap-4 p-6 md:p-10 relative'>
                <div className='flex justify-between items-center gap-2'>
                    <a href='#' className='flex items-center gap-2 font-medium'>
                        <Logo text={true} width='120px' />
                    </a>
                </div>

                <div className='flex flex-1 items-center justify-center'>
                    <div className='w-full max-w-sm text-center space-y-4'>
                        <h1 className='text-2xl font-bold'>{statusMessage}</h1>
                        {errorMessage ? (
                            <>
                                <p className='text-muted-foreground'>{errorMessage}</p>
                                <Button
                                    variant='default'
                                    onClick={() =>
                                        router.navigate({ to: '/login', replace: true })
                                    }
                                >
                                    Back to Login
                                </Button>
                            </>
                        ) : (
                            <p className='text-muted-foreground'>
                                Please wait while we finalize your sign-in.
                            </p>
                        )}
                    </div>
                </div>
            </div>

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
