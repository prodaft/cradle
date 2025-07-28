import { useWindowSize } from '@uidotdev/usehooks';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { forgotPasswordReq } from '../../services/authReqService/authReqService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';

/**
 * ForgotPassword component - renders the form for a user to get a forgot password email.
 *
 * @function ForgotPassword
 * @returns {ForgotPassword}
 * @constructor
 */
export default function ForgotPassword() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const windowSize = useWindowSize();
    const location = useLocation();
    const { from, state } = location.state || { from: { pathname: '/' } };

    const { navigate, navigateLink } = useCradleNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username && !email) {
            setAlert({
                show: true,
                message: 'You must fill at least one field!',
                color: 'red',
            });
            return;
        }

        const data = { username: username, email: email };

        forgotPasswordReq(data)
            .then((res) => {
                if (res.status === 200) {
                    setAlert({
                        show: true,
                        message: 'Password change email sent to your inbox!',
                        color: 'green',
                    });
                }
            })
            .catch(displayError(setAlert));
    };

    return (
        <div className='flex flex-row items-center justify-center h-screen overflow-y-auto'>
            <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 xl:w-1/3'>
                <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 text-gray-500'>
                    <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                        <h3 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight '>
                            Forgot Password
                        </h3>
                    </div>
                    <div
                        name='login-form'
                        className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm'
                    >
                        <form className='space-y-6' onSubmit={handleSubmit}>
                            <FormField
                                name='username'
                                labelText='Username'
                                type='text'
                                value={username}
                                handleInput={setUsername}
                                autofocus={true}
                                required={false}
                            />
                            <FormField
                                name='email'
                                labelText='Email'
                                type='text'
                                value={email}
                                handleInput={setEmail}
                                required={false}
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
