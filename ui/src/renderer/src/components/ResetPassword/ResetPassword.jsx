import React, { useState } from 'react';
import { UserCircle } from 'iconoir-react';
import FormField from '../FormField/FormField';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import {
    resetPasswordReq,
    logInReq,
} from '../../services/authReqService/authReqService';
import AlertBox from '../AlertBox/AlertBox';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useWindowSize } from '@uidotdev/usehooks';

/**
 * ResetPassword component - renders the change password form
 *
 * @function ResetPassword
 * @returns {ResetPassword}
 * @constructor
 */
export default function ResetPassword() {
    const [confirmPassword, setConfirmPassword] = useState('');
    const [password, setPassword] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const windowSize = useWindowSize();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const token = searchParams.get('token');

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
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

        const data = { password: password, token: token };

        resetPasswordReq(data)
            .then((res) => {
                navigate('/login', { replace: true });
            })
            .catch(displayError(setAlert));
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
                    <div
                        name='login-form'
                        className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm'
                    >
                        <form className='space-y-6' onSubmit={handleSubmit}>
                            <FormField
                                name='password'
                                labelText='Password'
                                type='password'
                                autofocus={true}
                                value={password}
                                handleInput={setPassword}
                            />
                            <FormField
                                name='confirm-password'
                                labelText='Confirm Password'
                                type='password'
                                value={confirmPassword}
                                handleInput={setConfirmPassword}
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
