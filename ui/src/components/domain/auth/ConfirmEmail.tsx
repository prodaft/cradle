import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import useApi from '@/hooks/api/use-api';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useMutation } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

/**
 * ConfirmEmail component.
 * Allows a user to confirm their email
 * On error, displays an error message.
 */
export default function ConfirmEmail() {
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const search = useSearch({ from: '/confirm-email' });
    const token = 'token' in search ? (search.token as string) : undefined;
    const { authApi } = useApi();

    const confirmMutation = useMutation({
        mutationFn: async (token: string) => {
            await authApi.authEmailConfirmCreate({
                emailConfirmRequest: { token },
            });
        },
        meta: {
            successMessage: 'Email confirmed successfully.',
            errorMessage: 'Failed to confirm email',
            suppressNotification: true, // We handle alerts ourselves
        },
        onSuccess: () => {
            setAlert({
                show: true,
                message: 'Email confirmed successfully.',
                color: 'green',
            });
        },
        onError: (error: any) => {
            setAlert({
                show: true,
                message:
                    error?.detail || 'An error occurred while confirming your email.',
                color: 'red',
            });
        },
    });

    const handleConfirm = () => {
        if (!token) {
            setAlert({
                show: true,
                message: 'No token provided',
                color: 'red',
            });
            return;
        }
        confirmMutation.mutate(token);
    };

    useEffect(() => {
        handleConfirm();
    }, [token]);

    return (
        <div className='flex items-center justify-center h-screen overflow-y-auto'>
            <div className='bg-card/20 p-4 rounded-xl w-full h-fit md:w-1/2 xl:w-1/3'>
                <div className='flex min-h-full flex-1 flex-col justify-center px-3 py-6 lg:px-4 text-muted-foreground'>
                    {alert.show && (
                        <AlertComponent
                            variant={
                                alert.color === 'red' || alert.color === 'error'
                                    ? 'destructive'
                                    : 'default'
                            }
                        >
                            <WarningCircleIcon size={18} weight='bold' />
                            <AlertDescription>{alert.message}</AlertDescription>
                        </AlertComponent>
                    )}
                    <p className='mt-10 text-center text-sm text-muted-foreground'>
                        <Link
                            to='/login'
                            className='font-semibold leading-6 text-primary px-2 py-1 rounded hover:bg-secondary hover:text-foreground transition-colors'
                            replace={true}
                        >
                            Go back to login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
