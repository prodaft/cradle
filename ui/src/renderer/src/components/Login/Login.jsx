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
        <div className='flex flex-row items-center justify-center h-screen overflow-y-auto'>
            <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 xl:w-1/3 relative'>
                {showSettings ? (
                    <>
                        {getBaseUrl() && (
                            <button
                                onClick={() => {
                                    setBackendUrl(getBaseUrl());
                                    setShowSettings(false);
                                }}
                                className='absolute top-2 left-2 p-2 hover:opacity-80 text-gray-500'
                                data-testid='settings-button'
                            >
                                <Undo />
                            </button>
                        )}
                        <button
                            onClick={toggleTheme}
                            className='absolute top-2 right-2 p-2 hover:opacity-80 text-gray-500'
                            data-testid='theme-button'
                        >
                            {isDarkMode ? <SunLight /> : <HalfMoon />}
                        </button>
                    </>
                ) : (
                    !requiresTwoFactor && (
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className='absolute top-2 right-2 p-2 hover:opacity-80 text-gray-500'
                            data-testid='settings-button'
                        >
                            <Settings />
                        </button>
                    )
                )}

                <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 text-gray-500'>
                    <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                        {windowSize.height > 800 && (
                            <div className='flex flex-row items-center justify-center'>
                                <Logo text={true} width='80%' />
                            </div>
                        )}
                    </div>
                    <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm'>
                        <form
                            className='space-y-6'
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
                                        className='btn btn-primary btn-block'
                                    >
                                        Save
                                    </button>
                                </>
                            ) : (
                                <>
                                    {requiresTwoFactor ? (
                                        <div className='mt-4 space-y-6'>
                                            <FormField
                                                name='twoFactorToken'
                                                labelText='Two-Factor Authentication Code'
                                                key='twoFactorToken'
                                                type='text'
                                                value={twoFactorToken}
                                                handleInput={setTwoFactorToken}
                                                autofocus={true}
                                                pattern='[0-9]*'
                                                maxLength='6'
                                                placeholder='Enter the 6-digit code from your authenticator app'
                                            />
                                            <AlertBox alert={alert} />
                                            <button
                                                type='submit'
                                                data-testid='login-register-button'
                                                className='btn btn-primary btn-block'
                                            >
                                                Verify
                                            </button>
                                            <button
                                                type='button'
                                                className='btn btn-ghost btn-block mt-2'
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
                                                className='btn btn-primary btn-block'
                                            >
                                                Login
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </form>

                        {/* Hide links when in settings mode or when backend URL is not set */}
                        {!requiresTwoFactor && !showSettings && getBaseUrl() && (
                            <p className='mt-10 text-center text-sm text-gray-500'>
                                <p className='mt-10 flex justify-between text-sm text-gray-500'>
                                    <Link
                                        to='/forgot-password'
                                        className='font-semibold leading-6 text-primary hover:opacity-90 hover:shadow-gray-400'
                                        replace={true}
                                        onClick={() => setRequiresTwoFactor(false)}
                                    >
                                        Forgot Password
                                    </Link>
                                    <Link
                                        to='/register'
                                        className='font-semibold leading-6 text-primary hover:opacity-90 hover:shadow-gray-400'
                                        replace={true}
                                        state={{ from: from }}
                                        onClick={() => setRequiresTwoFactor(false)}
                                    >
                                        Register
                                    </Link>
                                </p>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
