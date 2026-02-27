import { getSuccessMessage } from '@/utils/api';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * ConfirmEmail component.
 * Allows a user to confirm their email
 * On error, displays an error message.
 */
export default function ConfirmEmail() {
    const search = useSearch({ from: '/confirm-email' });
    const rawToken = (search as { token?: unknown }).token;
    const token = typeof rawToken === 'string' ? rawToken : undefined;
    const { mutate: confirmEmail } = useMutation({
        mutationFn: async (token: string) => {
            const { data, error, response } = await fetchClient.POST(
                '/auth/email_confirm/',
                { body: { token } },
            );
            if (error) throw { response, error };
            return data;
        },
        onSuccess: (response) => {
            toast.success(
                getSuccessMessage(response) || 'Email confirmed successfully.',
            );
        },
    });

    const calledRef = useRef(false);

    useEffect(() => {
        if (calledRef.current) return;
        if (!token) {
            toast.error('No confirmation token provided.');
            return;
        }
        calledRef.current = true;
        confirmEmail(token);
    }, [token, confirmEmail]);

    return (
        <div className='flex items-center justify-center h-screen overflow-y-auto'>
            <div className='bg-card/20 p-4 rounded-xl w-full h-fit md:w-1/2 xl:w-1/3'>
                <div className='flex min-h-full flex-1 flex-col justify-center px-3 py-6 lg:px-4 text-muted-foreground'>
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
