import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { registerReq } from '../../services/authReqService/authReqService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';

/**
 * Register component - renders the registration form.
 * Register new user in the system.
 * On successful registration, user is redirected to the login page.
 * On error, displays an error message.
 *
 * @function Register
 * @returns {Register}
 * @constructor
 */
export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordCheck, setPasswordCheck] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const { navigate, navigateLink } = useCradleNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== passwordCheck) {
            setAlert({ show: true, message: 'Passwords do not match.', color: 'red' });
            return;
        }

        const data = { username: username, email: email, password: password };

        registerReq(data)
            .then(() => navigate('/login', { state: location.state, replace: true }))
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
                                labelText='Username'
                                type='text'
                                value={username}
                                handleInput={setUsername}
                                autofocus={true}
                            />
                            <FormField
                                name='email'
                                labelText='Email'
                                type='email'
                                value={email}
                                handleInput={setEmail}
                            />
                            <FormField
                                name='password'
                                labelText='Password'
                                type='password'
                                value={password}
                                handleInput={setPassword}
                            />
                            <FormField
                                name='password-check'
                                labelText='Confirm Password'
                                type='password'
                                value={passwordCheck}
                                handleInput={setPasswordCheck}
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
                                v1.0.0
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
