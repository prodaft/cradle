/**
 * Centralized QueryClient configuration
 * All cross-cutting behavior lives here: toasts, session-expired, invalidation
 */

import { SessionExpiredException } from '@/components/domain/auth/auth-exceptions';
import {
    MutationCache,
    QueryCache,
    QueryClient,
    QueryKey,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseAPIError } from 'src/utils/api';

export type InvalidateTarget = { queryKey: QueryKey };

type AppMeta = {
    // queries
    showErrorToast?: boolean;

    // mutations
    successMessage?: string;
    errorMessage?: string;
    suppressNotification?: boolean;
    invalidateQueries?: InvalidateTarget[];

    // shared
    duration?: number;
};

let sessionExpiredHandler: null | (() => void) = null;
let sessionExpiredGateUntil = 0;

export function setSessionExpiredHandler(fn: () => void) {
    sessionExpiredHandler = fn;
}

function triggerSessionExpiredOnce() {
    const now = Date.now();
    if (now < sessionExpiredGateUntil) return;
    sessionExpiredGateUntil = now + 5000; // 5s gate

    toast.error('Authentication failed. Please log in again.', { duration: 3000 });
    sessionExpiredHandler?.();
}

function isAbortError(err: unknown) {
    return err instanceof DOMException && err.name === 'AbortError';
}

async function handleErrorCommon(error: unknown) {
    // your existing special-case
    if (error instanceof SessionExpiredException) {
        triggerSessionExpiredOnce();
        return { kind: 'sessionExpired' as const };
    }

    const parsed = await parseAPIError(error);
    const ignore =
        parsed.code === 'UNAUTHENTICATED' || parsed.code === 'SESSION_EXPIRED';
    return { kind: 'parsed' as const, parsed, ignore };
}

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchOnMount: true,
            throwOnError: false,
        },
        mutations: {
            retry: 1,
            throwOnError: false,
        },
    },

    queryCache: new QueryCache({
        onError: (error, query) => {
            if (isAbortError(error)) return;

            const meta = (query.meta ?? {}) as AppMeta;

            void (async () => {
                try {
                    const res = await handleErrorCommon(error);
                    if (res.kind === 'sessionExpired') return;
                    if (res.ignore) return;

                    // Queries: opt-in toast (prevents refetch spam)
                    if (meta.showErrorToast) {
                        toast.error(meta.errorMessage ?? res.parsed.detail, {
                            duration: meta.duration ?? 5000,
                        });
                    }
                } catch {
                    toast.error('An error occurred');
                }
            })();
        },
    }),

    mutationCache: new MutationCache({
        onSuccess: (_data, _variables, _ctx, mutation) => {
            const meta = (mutation.meta ?? {}) as AppMeta;

            if (meta.successMessage) {
                toast.success(meta.successMessage, { duration: meta.duration ?? 3500 });
            }

            meta.invalidateQueries?.forEach((t) => {
                queryClient.invalidateQueries({ queryKey: t.queryKey });
            });
        },

        onError: (error, _variables, _ctx, mutation) => {
            if (isAbortError(error)) return;

            const meta = (mutation.meta ?? {}) as AppMeta;

            void (async () => {
                try {
                    const res = await handleErrorCommon(error);
                    if (res.kind === 'sessionExpired') return;
                    if (res.ignore) return;

                    if (!meta.suppressNotification) {
                        toast.error(meta.errorMessage ?? res.parsed.detail, {
                            duration: meta.duration ?? 5000,
                        });
                    }
                } catch {
                    if (!meta.suppressNotification) {
                        toast.error('An error occurred');
                    }
                }
            })();
        },
    }),
});
