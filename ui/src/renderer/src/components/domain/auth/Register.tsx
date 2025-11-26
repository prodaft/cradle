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
 * Register component - renders the registration form.
 * Register new user in the system.
 * On successful registration, user is redirected to the login page.
 * On error, displays an error message.
 */
export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordCheck, setPasswordCheck] = useState('');
    const [alert, setAlert] = useState<Alert>({ show: false, message: '', color: 'red' });
    const { navigate, navigateLink } = useCradleNavigate();
    const location = useLocation();
    const { usersApi } = useApi();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== passwordCheck) {
            setAlert({ show: true, message: 'Passwords do not match.', color: 'red' });
            return;
        }

        try {
            await usersApi.usersCreate({
                userCreateRequest: { username, email, password }
            });
            navigate('/login', { state: location.state, replace: true });
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
                            Join Cradle
                        </h1>
                        <p className='text-lg cradle-text-tertiary cradle-mono leading-relaxed max-w-md'>
                            Create an account to start building your knowledge repository.
                        </p>
                    </div>
                </div>

                {/* Right Side - Registration Form */}
                <div className='flex-1 flex items-center justify-center px-4 py-12'>
                    <div className='w-full max-w-md'>
                        <div className='cradle-border cradle-bg-elevated'>
                            <div className='cradle-card-header cradle-border-b'>
                                <span className='cradle-mono text-xs tracking-widest'>
                                    USER REGISTRATION
                                </span>
                            </div>

                            <div className='p-8'>
                                <form className='space-y-5' onSubmit={handleSubmit}>
                                    <FormField
                                        name='username'
                                        label='Username'
                                        type='text'
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        autoFocus={true}
                                    />
                                    <FormField
                                        name='email'
                                        label='Email'
                                        type='email'
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    <FormField
                                        name='password'
                                        label='Password'
                                        type='password'
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <FormField
                                        name='password-check'
                                        label='Confirm Password'
                                        type='password'
                                        value={passwordCheck}
                                        onChange={(e) => setPasswordCheck(e.target.value)}
                                    />
                                    <AlertBox alert={alert} />
                                    <button
                                        type='submit'
                                        data-testid='login-register-button'
                                        className='cradle-btn cradle-btn-primary w-full'
                                    >
                                        Create Account
                                    </button>
                                </form>

                                {/* Footer Link */}
                                <div className='cradle-separator mt-8'></div>
                                <div className='text-center text-xs cradle-mono mt-6'>
                                    <span className='cradle-text-tertiary'>Already have an account? </span>
                                    <Link
                                        to='/login'
                                        className='cradle-text-tertiary hover:text-cradle2  uppercase tracking-wider'
                                        state={location.state}
                                        replace={true}
                                    >
                                        Login
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
