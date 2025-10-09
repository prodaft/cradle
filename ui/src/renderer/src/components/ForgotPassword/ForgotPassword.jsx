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
        <div className='min-h-screen overflow-y-auto cradle-bg-primary'>
            <div className='flex min-h-screen'>
                {/* Left Side - Branding */}
                <div className='hidden lg:flex lg:w-1/2 cradle-bg-secondary relative overflow-hidden'>
                    <div className='absolute inset-0 cradle-grid-bg opacity-30'></div>
                    <div className='absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-cradle2'></div>
                    
                    <div className='relative z-10 flex flex-col justify-center items-start px-16 py-12'>
                        <h1 className='text-4xl font-bold cradle-text-primary cradle-mono mb-4 tracking-tight'>
                            Password Recovery
                        </h1>
                        <p className='text-lg cradle-text-tertiary cradle-mono leading-relaxed max-w-md'>
                            Reset your password to regain access to your account.
                        </p>
                    </div>
                </div>

                {/* Right Side - Password Reset Form */}
                <div className='flex-1 flex items-center justify-center px-4 py-12'>
                    <div className='w-full max-w-md'>
                        <div className='cradle-border cradle-bg-elevated'>
                            <div className='cradle-card-header cradle-border-b'>
                                <span className='cradle-mono text-xs tracking-widest'>
                                    PASSWORD RECOVERY
                                </span>
                            </div>

                            <div className='p-8'>
                                <p className='text-sm cradle-text-secondary mb-6 cradle-mono'>
                                    Enter your username or email to receive password reset instructions.
                                </p>

                                <form className='space-y-5' onSubmit={handleSubmit}>
                            <FormField
                                name='username'
                                labelText='Username'
                                type='text'
                                value={username}
                                handleInput={setUsername}
                                autofocus={true}
                                required={false}
                            />
                            <div className='cradle-separator-labeled my-4'>
                                <span>Or</span>
                            </div>
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
                                className='cradle-btn cradle-btn-primary w-full'
                            >
                                Send Reset Link
                            </button>
                        </form>

                                {/* Footer Link */}
                                <div className='cradle-separator mt-8'></div>
                                <div className='text-center text-xs cradle-mono mt-6'>
                                    <Link
                                        to='/login'
                                        className='cradle-text-tertiary hover:text-cradle2  uppercase tracking-wider'
                                        replace={true}
                                    >
                                        Back to Login
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className='mt-6 text-center'>
                            <span className='text-xs cradle-text-muted cradle-mono tracking-wider'>
                                v1.0.0
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
