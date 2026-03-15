import { useAuthActions } from '@/hooks/auth/use-auth';
import { getDisplayMessage, getSuccessMessage, parseAPIError } from '@/utils/api';
import Logo from '@components/base/logo/logo';
import { ArrowUUpLeftIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { Link, useRouter, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const CONFIRM_EMAIL_IMAGES = ['/1.png', '/2.png', '/3.png', '/4.png'];
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
    const [confirmEmailImage] = useState(
        () =>
            CONFIRM_EMAIL_IMAGES[
                Math.floor(Math.random() * CONFIRM_EMAIL_IMAGES.length)
            ],
    );
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
            .POST('/auth/email-confirm/', { body: { token } })
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
        <div className='grid min-h-svh lg:grid-cols-2'>
            {/* Left Column - Content */}
            <div className='flex flex-col gap-4 p-6 md:p-10 relative'>
                {/* Branding */}
                <div className='flex justify-between items-center gap-2'>
                    <a href='#' className='flex items-center gap-2 font-medium'>
                        <Logo text={true} width='120px' />
                    </a>
                    <Button
                        onClick={() => router.navigate({ to: '/login', replace: true })}
                        variant='ghost'
                        size='icon-sm'
                        className='p-2 rounded-lg'
                        data-testid='back-button'
                        title='Back to Login'
                    >
                        <ArrowUUpLeftIcon size={18} weight='bold' />
                    </Button>
                </div>

                {/* Content */}
                <div className='flex flex-1 items-center justify-center'>
                    <div className='w-full max-w-xs text-center'>
                        {(status === 'loading' || (status === 'idle' && token)) && (
                            <>
                                <div className='flex justify-center mb-4'>
                                    <Spinner className='size-10' />
                                </div>
                                <h1 className='text-2xl font-bold'>
                                    Confirming your email
                                </h1>
                                <p className='mt-2 text-sm text-muted-foreground'>
                                    Please wait...
                                </p>
                            </>
                        )}
                        {status === 'success' && (
                            <>
                                <h1 className='text-2xl font-bold text-green-600 dark:text-green-500'>
                                    Email confirmed
                                </h1>
                                {successMessage && (
                                    <p className='mt-2 text-sm text-muted-foreground'>
                                        {successMessage}
                                    </p>
                                )}
                            </>
                        )}
                        {status === 'error' && (
                            <>
                                <h1 className='text-2xl font-bold text-destructive'>
                                    {token ? 'Confirmation failed' : 'Invalid link'}
                                </h1>
                                {errorMessage && (
                                    <Alert
                                        variant='destructive'
                                        className='mt-4 text-left'
                                    >
                                        <WarningCircleIcon
                                            className='size-4'
                                            weight='bold'
                                        />
                                        <AlertTitle>{errorTitle || 'Error'}</AlertTitle>
                                        <AlertDescription>
                                            {errorMessage}
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </>
                        )}
                        {(status === 'success' || status === 'error') && (
                            <Link
                                to='/login'
                                className='mt-6 inline-block font-semibold text-primary underline underline-offset-4 hover:text-primary/90'
                                replace={true}
                            >
                                Go to login
                            </Link>
                        )}
                        <div className='mt-6 text-center'>
                            <span className='text-xs text-muted-foreground font-mono tracking-wider'>
                                v2.10.2-beta.a070af1b
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column - Image */}
            <div
                className='bg-muted relative hidden lg:block select-none'
                onContextMenu={(e) => e.preventDefault()}
            >
                <img
                    src={confirmEmailImage}
                    alt=''
                    className='absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale pointer-events-none'
                    draggable={false}
                />
            </div>
        </div>
    );
}
