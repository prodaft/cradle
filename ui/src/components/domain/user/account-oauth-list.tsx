import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { $api } from '@services/openapi/client';
import { useRouterState } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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

interface AccountOAuthListProps {
    target?: string;
}

export default function AccountOAuthList({ target = 'me' }: AccountOAuthListProps) {
    const basePath = import.meta.env.VITE_API_BASE_URL ?? '';
    const location = useRouterState({ select: (state) => state.location });

    const [oauthConnections, setOauthConnections] = useState<Record<string, boolean>>(
        {},
    );
    const [oauthMethods, setOauthMethods] = useState<OAuthMethod[]>([]);
    const [busyProvider, setBusyProvider] = useState<string | null>(null);

    const { data: userData } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        {
            params: {
                path: {
                    user_id: target,
                },
            },
        },
        {
            enabled: !!target,
            meta: { suppressNotification: true },
        },
    );

    const { data: authConfig } = $api.useQuery('get', '/auth/config/', undefined, {
        enabled: !!basePath,
        meta: { suppressNotification: true },
        select: (raw) => {
            const config = raw as Record<string, unknown>;
            const oauthMethods =
                (config.oauthMethods as unknown[]) ??
                (config.oauth_methods as unknown[]) ??
                [];
            return {
                oauthMethods: (Array.isArray(oauthMethods)
                    ? oauthMethods
                    : []) as OAuthMethod[],
            };
        },
    });

    useEffect(() => {
        if (userData) {
            const serverConnections =
                (userData as any).oauthConnections ||
                (userData as any).oauth_connections ||
                {};
            setOauthConnections(serverConnections);
        }
    }, [userData]);

    useEffect(() => {
        if (authConfig?.oauthMethods) {
            setOauthMethods(
                Array.isArray(authConfig.oauthMethods) ? authConfig.oauthMethods : [],
            );
        } else {
            setOauthMethods([]);
        }
    }, [authConfig]);

    const getOAuthKey = (method: OAuthMethod) =>
        method.id ||
        method.provider ||
        method.name ||
        method.label ||
        method.display_name ||
        '';

    const getOAuthLabel = (method: OAuthMethod) =>
        method.display_name ||
        method.label ||
        method.name ||
        method.provider ||
        method.id ||
        'Single Sign-On';

    const getOAuthUrl = (method: OAuthMethod) => {
        const url =
            method.authorization_url ||
            method.auth_url ||
            method.login_url ||
            method.url;
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const apiRoot = basePath.replace(/\/api\/?$/, '');
        if (!apiRoot) return url;
        return url.startsWith('/') ? `${apiRoot}${url}` : `${apiRoot}/${url}`;
    };

    const buildConnectUrl = (method: OAuthMethod, provider: string) => {
        const url = getOAuthUrl(method);
        if (!url) return '';
        const connectUrl = new URL(url);
        connectUrl.searchParams.set(
            'redirect_uri',
            `${window.location.origin}/oauth/callback`,
        );
        connectUrl.searchParams.set('state', `oauth_connect:${provider}`);
        return connectUrl.toString();
    };

    const connections = useMemo(() => {
        const next = { ...oauthConnections };
        oauthMethods.forEach((method) => {
            const key = getOAuthKey(method);
            if (key && next[key] === undefined) {
                next[key] = false;
            }
        });
        return next;
    }, [oauthConnections, oauthMethods]);

    const providerRows = useMemo(
        () =>
            Object.entries(connections).map(([provider, connected]) => {
                const method = oauthMethods.find((m) => getOAuthKey(m) === provider);
                return {
                    provider,
                    label: method ? getOAuthLabel(method) : provider,
                    connected,
                };
            }),
        [connections, oauthMethods],
    );

    const connect = (provider: string) => {
        const method = oauthMethods.find((m) => getOAuthKey(m) === provider);
        if (!method) {
            toast.error('OAuth provider configuration not found.');
            return;
        }
        const url = buildConnectUrl(method, provider);
        if (!url) {
            toast.error('OAuth provider URL is missing.');
            return;
        }
        sessionStorage.setItem('oauth_connect_provider', provider);
        sessionStorage.setItem('oauth_connect_return_path', location.pathname);
        window.location.href = url;
    };

    const disconnectProvider = $api.useMutation(
        'delete',
        '/users/oauth/disconnect/{provider}/',
        {
            onSuccess: (_, provider) => {
                const providerId = provider.params.path.provider;
                setOauthConnections((prev) => ({ ...prev, [providerId]: false }));
                toast.success(`${providerId} disconnected.`);
            },
        },
    );

    const disconnect = async (provider: string) => {
        setBusyProvider(provider);
        try {
            await disconnectProvider.mutateAsync({
                params: {
                    path: {
                        provider,
                    },
                },
            });
        } finally {
            setBusyProvider(null);
        }
    };

    if (providerRows.length === 0) {
        return (
            <section id='oauth'>
                <p className='text-sm text-muted-foreground'>
                    No OAuth providers are configured
                </p>
            </section>
        );
    }

    return (
        <section id='oauth'>
            <div className='flex flex-col gap-4'>
                {providerRows.map(({ provider, label, connected }, index) => (
                    <div key={provider}>
                        <Field orientation='horizontal' className='gap-2'>
                            <FieldContent className='flex-1'>
                                <FieldLabel className='text-sm block mb-0.5'>
                                    {label}
                                </FieldLabel>
                                <FieldDescription>
                                    {connected ? 'Connected' : 'Not connected'}
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                type='button'
                                variant={connected ? 'destructive' : 'outline'}
                                size='sm'
                                className='self-center'
                                onClick={() =>
                                    connected ? disconnect(provider) : connect(provider)
                                }
                                disabled={
                                    busyProvider === provider ||
                                    disconnectProvider.isPending
                                }
                            >
                                {connected ? 'Disconnect' : 'Connect'}
                            </Button>
                        </Field>
                        {index < providerRows.length - 1 && <Separator />}
                    </div>
                ))}
            </div>
        </section>
    );
}
