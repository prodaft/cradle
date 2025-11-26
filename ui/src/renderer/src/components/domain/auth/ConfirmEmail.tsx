import useApi from '@/hooks/api/useApi';
import { displayError } from '@/utils/api';
import AlertBox from '@components/base/Alert/AlertBox';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

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
    const [searchParams, setSearchParams] = useSearchParams();
    const token = searchParams.get('token');
    const { usersApi } = useApi();

    const handleConfirm = async () => {
        if (!token) {
            setAlert({
                show: true,
                message: 'No token provided',
                color: 'red',
            });
            return;
        }

        try {
            await usersApi.usersEmailConfirmCreate({
                emailConfirmRequest: { token },
            });
            setAlert({
                show: true,
                message: 'Email confirmed successfully.',
                color: 'green',
            });
        } catch (error) {
            displayError(setAlert)(error);
        }
    };

    useEffect(() => {
        handleConfirm();
    }, [token]);

    return (
        <div className='flex flex-row items-center justify-center h-screen overflow-y-auto'>
            <div className='bg-cradle3 p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 xl:w-1/3'>
                <div className='flex min-h-full flex-1 flex-col justify-center px-3 py-6 lg:px-4 text-gray-500'>
                    <AlertBox alert={alert} />
                    <p className='mt-10 text-center text-sm text-gray-500'>
                        <Link
                            to='/login'
                            className='font-semibold leading-6 text-cradle2 hover:opacity-90 hover:shadow-gray-400'
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
