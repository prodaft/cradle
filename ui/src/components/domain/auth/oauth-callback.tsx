import { Button } from '@/components/ui/button';
import { useAuthActions, useAuthState } from '@/hooks/auth/use-auth';
import Logo from '@components/base/logo/logo';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useEffect, useMemo, useRef } from 'react';

type OAuthAction = 'oauth_login' | 'oauth_connect';

interface OAuthState {
    action: OAuthAction;
    provider: string;
}

interface OAuthParams {
    code: string;
    provider: string;
    action: OAuthAction;
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
    const hasExchangedRef = useRef(false);

    const urlParams = useMemo(() => {
        const url = new URL(window.location.href);
        let queryString = url.search;
        if (!queryString && url.hash.includes('?')) {
            queryString = url.hash.slice(url.hash.indexOf('?'));
        }
        const params = new URLSearchParams(queryString);

        const error = params.get('error');
        if (error) return { error: 'OAuth request was denied.' } as const;

        const code = params.get('code');
        if (!code) return { error: 'Missing OAuth authorization code.' } as const;

        const state = parseOAuthState(params.get('state'));
        const provider =
            state?.provider ||
            params.get('provider') ||
            sessionStorage.getItem('oauth_connect_provider');
        if (!provider) return { error: 'Missing OAuth provider.' } as const;

        const action: OAuthAction = state?.action || 'oauth_login';
        return { code, provider, action } as const;
    }, []);

    const oauthMutation = useMutation({
        mutationFn: async ({ code, provider, action }: OAuthParams) => {
            if (!basePath) throw new Error('Backend URL is not configured.');

            const redirectUri = `${window.location.origin}/oauth/callback`;
            const normalizeTo = (path: string) =>
                (path.startsWith('/') ? path : `/${path}`) as any;

            if (action === 'oauth_connect') {
                if (!isLoggedIn()) {
                    throw new Error('You must be logged in to connect accounts.');
                }
                await getAccessToken();
            }

            const {
                error,
                response,
                data: resp,
            } = await fetchClient.POST(
                '/users/oauth/connect/' as any,
                {
                    body: { provider, code, redirect_uri: redirectUri } as any,
                } as any,
            );
            if (error) throw { response };

            const data = resp as any;

            if (action === 'oauth_connect') {
                const returnPath =
                    sessionStorage.getItem('oauth_connect_return_path') || '/settings';
                sessionStorage.removeItem('oauth_connect_return_path');
                sessionStorage.removeItem('oauth_connect_provider');
                router.navigate({ to: normalizeTo(returnPath), replace: true });
                return;
            }

            setTokensDirectly({
                access: data.access,
                refresh: data.refresh,
                accessExpiresAt: new Date(data.access_expires_at),
                refreshExpiresAt: new Date(data.refresh_expires_at),
                role: data.role,
                user_id: data.user_id,
            });

            const redirectPath = sessionStorage.getItem('oauth_login_redirect') || '/';
            const normalizedRedirect =
                redirectPath === '/oauth/callback' ||
                redirectPath === '#/oauth/callback'
                    ? '/'
                    : redirectPath;
            sessionStorage.removeItem('oauth_login_redirect');
            router.navigate({
                to: normalizeTo(normalizedRedirect),
                replace: true,
            });
        },
        meta: { suppressNotification: true },
    });

    useEffect(() => {
        if (hasExchangedRef.current) return;
        if ('error' in urlParams) return;
        hasExchangedRef.current = true;
        oauthMutation.mutate(urlParams);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const errorMessage =
        'error' in urlParams
            ? urlParams.error
            : oauthMutation.isError
              ? oauthMutation.error?.message || 'OAuth flow failed. Please try again.'
              : null;
    const statusMessage = errorMessage
        ? 'Unable to continue.'
        : 'Completing sign-in...';

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
