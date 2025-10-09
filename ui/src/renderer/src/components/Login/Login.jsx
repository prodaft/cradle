import { useWindowSize } from '@uidotdev/usehooks';
import { HalfMoon, Settings, SunLight, Undo } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext/ThemeContext';
import useAuth from '../../hooks/useAuth/useAuth';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { logInReq } from '../../services/authReqService/authReqService';
import { getBaseUrl } from '../../services/configService/configService';
import { strip } from '../../utils/linkUtils/linkUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';
import Logo from '../Logo/Logo';

/**
 * Login component - renders the login form.
 * Sets the username and password states for the AuthProvider when successfully logged in with the server
 * On error, displays an error message.
 *
 * @function Login
 * @returns {Login}
 * @constructor
 */
export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorToken, setTwoFactorToken] = useState('');
    const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const windowSize = useWindowSize();
    const location = useLocation();

    const [showSettings, setShowSettings] = useState(!getBaseUrl());
    const [backendUrl, _setBackendUrl] = useState(getBaseUrl() || '');

    const { isDarkMode, toggleTheme } = useTheme();

    const { from } = location.state || { from: { pathname: '/' } };

    const auth = useAuth();

    const { navigate, navigateLink } = useCradleNavigate();

    const setBackendUrl = (url) => {
        _setBackendUrl(strip(url));
    };

    useEffect(() => {
        // If backend URL is not set, force settings to be shown
        if (!getBaseUrl()) {
            setShowSettings(true);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        let data = { username: username, password: password };

        // Include 2FA token if it's provided
        if (requiresTwoFactor && twoFactorToken) {
            data.two_factor_token = twoFactorToken;
        }

        logInReq(data)
            .then((res) => {
                if (res.status === 200) {
                    auth.logIn(res.data['access'], res.data['refresh']);
                    navigate(from, { replace: true });
                }
            })
            .catch((error) => {
                // Check if the error indicates 2FA is required
                if (
                    error.response &&
                    error.response.status === 401 &&
                    error.response.data &&
                    error.response.data.requires_2fa
                ) {
                    setRequiresTwoFactor(true);
                } else {
                    displayError(setAlert)(error);
                }
            });
    };

    const handleSaveSettings = (e) => {
        e.preventDefault();
        if (!backendUrl) {
            setAlert({ show: true, message: 'Backend URL is required', color: 'red' });
            return;
        }
        localStorage.setItem('backendUrl', backendUrl);
        setShowSettings(false);
    };

    return (
        <div className='min-h-screen overflow-y-auto cradle-bg-primary'>
            {/* Two Column Layout */}
            <div className='flex min-h-screen'>
                {/* Left Side - Branding/Info */}
                <div className='hidden lg:flex lg:w-1/2 cradle-bg-secondary relative overflow-hidden'>
                    {/* Grid Pattern Background */}
                    <div className='absolute inset-0 cradle-grid-bg opacity-30'></div>
                    
                    
                    <div className='relative z-10 flex flex-col justify-center items-start px-16 py-12'>
                        {windowSize.height > 700 && (
                            <div className='mb-12'>
                                <Logo text={true} width='60%' />
                            </div>
                        )}
                        <h1 className='text-4xl font-bold cradle-text-primary cradle-mono mb-4 tracking-tight'>
                            Knowledge System
                        </h1>
                        <p className='text-lg cradle-text-tertiary cradle-mono leading-relaxed max-w-md'>
                            A minimal, technical interface for organizing and connecting your knowledge.
                        </p>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className='flex-1 flex items-center justify-center px-4 py-12'>
                    <div className='w-full max-w-md'>
                        {/* Mobile Logo */}
                        {windowSize.height > 600 && (
                            <div className='lg:hidden flex justify-center mb-8'>
                                <Logo text={true} width='60%' />
                            </div>
                        )}

                        {/* Login Form */}
                        <div className='cradle-border cradle-bg-elevated'>
                            {/* Top Control Bar */}
                            <div className='cradle-card-header cradle-border-b'>
                        <span className='cradle-mono text-xs tracking-widest'>
                            {showSettings ? 'CONFIGURATION' : requiresTwoFactor ? 'AUTHENTICATION' : 'SYSTEM ACCESS'}
                        </span>
                        <div className='flex items-center gap-2'>
                            {showSettings ? (
                                <>
                                    {getBaseUrl() && (
                                        <button
                                            onClick={() => {
                                                setBackendUrl(getBaseUrl());
                                                setShowSettings(false);
                                            }}
                                            className='p-1.5 hover:text-cradle2  cradle-text-tertiary'
                                            data-testid='back-button'
                                            title='Back'
                                        >
                                            <Undo size={18} />
                                        </button>
                                    )}
                                    <button
                                        onClick={toggleTheme}
                                        className='p-1.5 hover:text-cradle2  cradle-text-tertiary'
                                        data-testid='theme-button'
                                        title='Toggle Theme'
                                    >
                                        {isDarkMode ? <SunLight size={18} /> : <HalfMoon size={18} />}
                                    </button>
                                </>
                            ) : (
                                !requiresTwoFactor && (
                                    <button
                                        onClick={() => setShowSettings(!showSettings)}
                                        className='p-1.5 hover:text-cradle2  cradle-text-tertiary'
                                        data-testid='settings-button'
                                        title='Settings'
                                    >
                                        <Settings size={18} />
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                            {/* Form Body */}
                            <div className='p-8'>
                                {/* Form Section */}
                                <form
                            className='space-y-5'
                            onSubmit={showSettings ? handleSaveSettings : handleSubmit}
                        >
                            {showSettings ? (
                                <>
                                    <FormField
                                        key='backendUrl'
                                        name='backendUrl'
                                        labelText='Backend URL'
                                        type='text'
                                        value={backendUrl}
                                        handleInput={setBackendUrl}
                                        autofocus={true}
                                        required={true}
                                    />
                                    <AlertBox alert={alert} />
                                    <button
                                        type='submit'
                                        className='cradle-btn cradle-btn-primary w-full'
                                    >
                                        Save Configuration
                                    </button>
                                </>
                            ) : (
                                <>
                                    {requiresTwoFactor ? (
                                        <div className='space-y-5'>
                                            <div className='cradle-separator-labeled my-6'>
                                                <span>Two-Factor Authentication</span>
                                            </div>
                                            <FormField
                                                name='twoFactorToken'
                                                labelText='Authentication Code'
                                                key='twoFactorToken'
                                                type='text'
                                                value={twoFactorToken}
                                                handleInput={setTwoFactorToken}
                                                autofocus={true}
                                                pattern='[0-9]*'
                                                maxLength='6'
                                                placeholder='000000'
                                            />
                                            <p className='text-xs cradle-text-muted cradle-mono'>
                                                Enter the 6-digit code from your authenticator app
                                            </p>
                                            <AlertBox alert={alert} />
                                            <button
                                                type='submit'
                                                data-testid='login-register-button'
                                                className='cradle-btn cradle-btn-primary w-full'
                                            >
                                                Verify Code
                                            </button>
                                            <button
                                                type='button'
                                                className='cradle-btn cradle-btn-ghost w-full'
                                                onClick={() => {
                                                    setRequiresTwoFactor(false);
                                                    setTwoFactorToken('');
                                                    setAlert({
                                                        show: false,
                                                        message: '',
                                                        color: 'red',
                                                    });
                                                }}
                                            >
                                                Back to Login
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <FormField
                                                name='username'
                                                labelText='Username'
                                                key='username'
                                                type='text'
                                                value={username}
                                                handleInput={setUsername}
                                                autofocus={true}
                                            />
                                            <FormField
                                                name='password'
                                                labelText='Password'
                                                key='password'
                                                type='password'
                                                value={password}
                                                handleInput={setPassword}
                                            />
                                            <AlertBox alert={alert} />
                                            <button
                                                type='submit'
                                                data-testid='login-register-button'
                                                className='cradle-btn cradle-btn-primary w-full'
                                            >
                                                Authenticate
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </form>

                                {/* Footer Links */}
                                {!requiresTwoFactor && !showSettings && getBaseUrl() && (
                                    <>
                                        <div className='cradle-separator mt-8'></div>
                                        <div className='flex justify-between items-center text-xs cradle-mono mt-6'>
                                            <Link
                                                to='/forgot-password'
                                                className='cradle-text-tertiary hover:text-cradle2  uppercase tracking-wider'
                                                replace={true}
                                                onClick={() => setRequiresTwoFactor(false)}
                                            >
                                                Reset Password
                                            </Link>
                                            <span className='cradle-text-muted'>·</span>
                                            <Link
                                                to='/register'
                                                className='cradle-text-tertiary hover:text-cradle2  uppercase tracking-wider'
                                                replace={true}
                                                state={{ from: from }}
                                                onClick={() => setRequiresTwoFactor(false)}
                                            >
                                                Register
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Version/Status Indicator */}
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
