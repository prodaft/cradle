import { useWindowSize } from '@uidotdev/usehooks';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { displayError } from '@/utils/api';
import AlertBox from '@components/base/Alert/AlertBox';
import FormField from '@components/forms/FormField';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

/**
 * ForgotPassword component - renders the form for a user to get a forgot password email.
 */
export default function ForgotPassword() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [alert, setAlert] = useState<Alert>({ show: false, message: '', color: 'red' });
    const windowSize = useWindowSize();
    const location = useLocation();
    const { from, state } = location.state || { from: { pathname: '/' } };

    const { navigate, navigateLink } = useCradleNavigate();
    const { usersApi } = useApi();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username && !email) {
            setAlert({
                show: true,
                message: 'You must fill at least one field!',
                color: 'red',
            });
            return;
        }

        try {
            await usersApi.usersResetPasswordCreate({
                passwordResetRequestRequest: {
                    username: username || undefined,
                    email: email || undefined,
                }
            });
            setAlert({
                show: true,
                message: 'Password change email sent to your inbox!',
                color: 'green',
            });
        } catch (error) {
            displayError(setAlert)(error);
        }
    };

    return (
        <div className='min-h-screen overflow-y-auto cradle-bg-primary'>
            <div className='flex min-h-screen'>
                {/* Left Side - Branding */}
                <div className='hidden lg:flex lg:w-1/2 cradle-bg-secondary relative overflow-hidden'>
                    <div className='absolute inset-0 cradle-grid-bg opacity-30'></div>

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
                                        label='Username'
                                        type='text'
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        autoFocus={true}
                                        required={false}
                                    />
                                    <div className='cradle-separator-labeled my-4'>
                                        <span>Or</span>
                                    </div>
                                    <FormField
                                        name='email'
                                        label='Email'
                                        type='text'
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
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
                                v2.10.2-beta.a070af1b
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
