import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { displayError } from '@/utils/api';
import AlertBox from '@components/base/Alert/AlertBox';
import FormField from '@components/forms/FormField';
import { useWindowSize } from '@uidotdev/usehooks';
import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

/**
 * ResetPassword component - renders the change password form
 */
export default function ResetPassword() {
    const [confirmPassword, setConfirmPassword] = useState('');
    const [password, setPassword] = useState('');
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const windowSize = useWindowSize();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const token = searchParams.get('token');

    const { navigate, navigateLink } = useCradleNavigate();
    const { usersApi } = useApi();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            setAlert({
                show: true,
                message: 'You must fill all fields!',
                color: 'red',
            });
            return;
        }

        if (password !== confirmPassword) {
            setAlert({
                show: true,
                message: 'Passwords do not match!',
                color: 'red',
            });
            return;
        }

        try {
            await usersApi.usersResetPasswordUpdate({
                passwordResetConfirmRequest: { token: token || '', password },
            });
            navigate('/login', { replace: true });
        } catch (error) {
            displayError(setAlert)(error);
        }
    };

    return (
        <div className='flex flex-row items-center justify-center h-screen overflow-y-auto'>
            <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 xl:w-1/3'>
                <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 text-gray-500'>
                    <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                        <h3 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight '>
                            Change Password
                        </h3>
                    </div>
                    <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm'>
                        <form className='space-y-6' onSubmit={handleSubmit}>
                            <FormField
                                name='password'
                                label='Password'
                                type='password'
                                autoFocus={true}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <FormField
                                name='confirm-password'
                                label='Confirm Password'
                                type='password'
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <AlertBox alert={alert} />
                            <button
                                type='submit'
                                data-testid='login-register-button'
                                className='btn btn-primary btn-block'
                            >
                                Change Password
                            </button>
                        </form>
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
        </div>
    );
}
