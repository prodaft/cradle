import { AuthHeader, AuthLayout } from '@/components/domain/auth/auth-layout';
import { useAuthActions } from '@/hooks/auth/use-auth';
import { getDisplayMessage, getSuccessMessage, parseAPIError } from '@/utils/api';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { Link, useRouter, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

const STORAGE_KEY = 'confirm-email-result';
const tokensInFlight = new Set<string>();

/**
 * ConfirmEmail component.
 * Allows a user to confirm their email
 * On error, displays an error message.
 */
export default function ConfirmEmail() {
    const router = useRouter();
    const { isLoggedIn } = useAuthActions();
    const search = useSearch({ from: '/confirm-email' });
    const rawToken = (search as { token?: unknown }).token;
    const token = typeof rawToken === 'string' ? rawToken : undefined;

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
        'idle',
    );
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errorTitle, setErrorTitle] = useState<string | undefined>(undefined);
    const prevTokenRef = useRef<string | undefined>(undefined);
    const calledRef = useRef(false);

    useEffect(() => {
        if (isLoggedIn()) {
            router.navigate({ to: '/', replace: true });
        }
    }, [isLoggedIn, router]);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMessage('No confirmation token provided.');
            return;
        }

        const cached = sessionStorage.getItem(`${STORAGE_KEY}-${token}`);
        if (cached === 'success') {
            setStatus('success');
            setSuccessMessage(
                sessionStorage.getItem(`${STORAGE_KEY}-${token}-success-msg`),
            );
            return;
        }
        if (cached === 'error') {
            setStatus('error');
            setErrorMessage(
                sessionStorage.getItem(`${STORAGE_KEY}-${token}-msg`) ||
                    'Something went wrong.',
            );
            setErrorTitle(
                sessionStorage.getItem(`${STORAGE_KEY}-${token}-title`) || undefined,
            );
            return;
        }

        if (prevTokenRef.current !== token) {
            calledRef.current = false;
            prevTokenRef.current = token;
        }
        if (tokensInFlight.has(token) || calledRef.current) return;
        tokensInFlight.add(token);
        calledRef.current = true;

        setStatus('loading');
        fetchClient
            .POST('/auth/email/confirm/', { body: { token } })
            .then(({ data, error: err, response }) => {
                if (err) throw { response, error: err };
                tokensInFlight.delete(token);
                sessionStorage.setItem(`${STORAGE_KEY}-${token}`, 'success');
                const msg = getSuccessMessage(data) ?? '';
                sessionStorage.setItem(`${STORAGE_KEY}-${token}-success-msg`, msg);
                setSuccessMessage(msg || null);
                setStatus('success');
            })
            .catch(async (err) => {
                tokensInFlight.delete(token);
                sessionStorage.setItem(`${STORAGE_KEY}-${token}`, 'error');
                const parsed = await parseAPIError(err);
                const msg = getDisplayMessage(parsed);
                sessionStorage.setItem(`${STORAGE_KEY}-${token}-msg`, msg);
                if (parsed.title) {
                    sessionStorage.setItem(
                        `${STORAGE_KEY}-${token}-title`,
                        parsed.title,
                    );
                }
                setStatus('error');
                setErrorMessage(msg);
                setErrorTitle(parsed.title);
            });
    }, [token]);

    if (isLoggedIn()) {
        return null;
    }

    return (
        <AuthLayout>
            <div className='flex flex-col gap-4'>
                {(status === 'loading' || (status === 'idle' && token)) && (
                    <div className='flex items-start gap-3'>
                        <Spinner className='mt-1.5 size-5 text-primary' />
                        <AuthHeader
                            title='Confirming your email'
                            description='Please wait…'
                        />
                    </div>
                )}
                {status === 'success' && (
                    <AuthHeader
                        title='Email confirmed'
                        description={successMessage || undefined}
                    />
                )}
                {status === 'error' && (
                    <>
                        <AuthHeader
                            title={token ? 'Confirmation failed' : 'Invalid link'}
                        />
                        {errorMessage && (
                            <Alert variant='destructive'>
                                <WarningCircleIcon weight='bold' />
                                <AlertTitle>{errorTitle || 'Error'}</AlertTitle>
                                <AlertDescription>{errorMessage}</AlertDescription>
                            </Alert>
                        )}
                    </>
                )}
                {(status === 'success' || status === 'error') && (
                    <p className='border-t pt-3.5 text-sm'>
                        <Link
                            to='/login'
                            className='text-primary underline-offset-4 hover:underline'
                            replace={true}
                        >
                            Go to sign in
                        </Link>
                    </p>
                )}
            </div>
        </AuthLayout>
    );
}
