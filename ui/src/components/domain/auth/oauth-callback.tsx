import { AuthHeader, AuthLayout } from '@/components/domain/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuthActions, useAuthState } from '@/hooks/auth/use-auth';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';

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
    const { isLoggedIn, setTokensDirectly } = useAuthActions();
    const router = useRouter();
    const exchangedRef = useRef(false);
    const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

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

    const oauth = useMutation({
        mutationFn: async ({ code, provider, action }: OAuthParams) => {
            if (!basePath) throw new Error('Backend URL is not configured.');

            const redirectUri = `${window.location.origin}/oauth/callback`;
            const normalizeTo = (path: string) =>
                (path.startsWith('/') ? path : `/${path}`) as any;

            if (action === 'oauth_connect') {
                if (!isLoggedIn()) {
                    throw new Error('You must be logged in to connect accounts.');
                }
            }

            const body = { provider, code, redirect_uri: redirectUri };

            if (action === 'oauth_connect') {
                const { error: connectError, response: connectResponse } =
                    await fetchClient.POST('/users/me/oauth/', { body });
                if (connectError)
                    throw { response: connectResponse, error: connectError };
                const returnPath =
                    sessionStorage.getItem('oauth_connect_return_path') || '/settings';
                sessionStorage.removeItem('oauth_connect_return_path');
                sessionStorage.removeItem('oauth_connect_provider');
                router.navigate({ to: normalizeTo(returnPath), replace: true });
                return;
            }

            const {
                error: loginError,
                response: loginResponse,
                data,
            } = await fetchClient.POST('/auth/oauth/login/', { body });
            if (loginError) throw { response: loginResponse, error: loginError };

            setTokensDirectly({
                accessExpiresAt: new Date(data.access_expires_at),
                refreshExpiresAt: new Date(data.refresh_expires_at),
                role: data.role,
                user_id: data.user_id,
            });

            const redirectPath = sessionStorage.getItem('oauth_login_redirect') || '/';
            const normalizedRedirect =
                redirectPath === '/oauth/callback' ? '/' : redirectPath;
            sessionStorage.removeItem('oauth_login_redirect');
            router.navigate({
                to: normalizeTo(normalizedRedirect),
                replace: true,
            });
        },
        meta: { suppressNotification: true },
        onError: async (error) => {
            try {
                const parsed = await parseAPIError(error);
                setApiErrorMessage(
                    parsed.title && parsed.title !== parsed.detail
                        ? `${parsed.title}: ${parsed.detail}`
                        : getDisplayMessage(parsed),
                );
            } catch {
                setApiErrorMessage('OAuth flow failed. Please try again.');
            }
        },
    });

    useEffect(() => {
        if (exchangedRef.current) return;
        if ('error' in urlParams) return;
        exchangedRef.current = true;
        oauth.mutate(urlParams);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const errorMessage =
        'error' in urlParams
            ? urlParams.error
            : oauth.isError
              ? (apiErrorMessage ?? 'OAuth flow failed. Please try again.')
              : null;
    const statusMessage = errorMessage
        ? 'Unable to continue.'
        : 'Completing sign-in...';

    return (
        <AuthLayout>
            <div className='flex flex-col gap-4'>
                {errorMessage ? (
                    <>
                        <AuthHeader title={statusMessage} description={errorMessage} />
                        <Button
                            className='w-full'
                            onClick={() =>
                                router.navigate({ to: '/login', replace: true })
                            }
                        >
                            Back to sign in
                        </Button>
                    </>
                ) : (
                    <div className='flex items-start gap-3'>
                        <Spinner className='mt-1.5 size-5 text-primary' />
                        <AuthHeader
                            title={statusMessage}
                            description='Please wait while we finalize your sign-in.'
                        />
                    </div>
                )}
            </div>
        </AuthLayout>
    );
}
