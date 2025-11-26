import { useTheme } from '@/contexts/ui/ThemeContext';
import useAuth from '@/hooks/auth/useAuth';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { strip } from '@/utils/links';
import AlertBox from '@components/base/Alert/AlertBox';
import Logo from '@components/base/Logo/Logo';
import FormField from '@components/forms/FormField';
import { useWindowSize } from '@uidotdev/usehooks';
import { HalfMoon, Settings, SunLight, Undo } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

/**
 * Login component - renders the login form.
 * Sets the username and password states for the AuthProvider when successfully logged in with the server
 * On error, displays an error message.
 */
export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorToken, setTwoFactorToken] = useState('');
    const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const windowSize = useWindowSize();
    const location = useLocation();

    const { isDarkMode, toggleTheme } = useTheme();

    const { from } = (location.state == '/#login' ? null : location.state) || {
        from: { pathname: '/' },
    };

    const auth = useAuth();
    const { basePath, setBasePath } = auth;

    const [showSettings, setShowSettings] = useState(!basePath);
    const [backendUrl, _setBackendUrl] = useState(basePath || '');

    const { navigate, navigateLink } = useCradleNavigate();

    const setBackendUrl = (url: string) => {
        _setBackendUrl(strip(url));
    };

    useEffect(() => {
        // If backend URL is not set, force settings to be shown
        if (!basePath) {
            setShowSettings(true);
        }
    }, [basePath]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = await auth.logIn(
            username,
            password,
            requiresTwoFactor && twoFactorToken ? twoFactorToken : null,
        );

        if (result.result === 'success') {
            console.log('Login successful');
            navigate(from, { replace: true });
        } else if (result.result === 'requires_2fa') {
            setRequiresTwoFactor(true);
            setAlert({ show: true, message: result.message || '', color: 'yellow' });
        } else if (result.result === 'unconfirmed_email') {
            setAlert({ show: true, message: result.message || '', color: 'red' });
        } else if (result.result === 'inactive_account') {
            setAlert({ show: true, message: result.message || '', color: 'red' });
        } else if (result.result === 'network_error') {
            setAlert({ show: true, message: result.message || '', color: 'red' });
        } else {
            setAlert({ show: true, message: result.message || '', color: 'red' });
        }
    };

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        if (!backendUrl) {
            setAlert({ show: true, message: 'Backend URL is required', color: 'red' });
            return;
        }
        localStorage.setItem('backendUrl', backendUrl);
        setBasePath(backendUrl);
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
                        {windowSize.height && windowSize.height > 700 && (
                            <div className='mb-12'>
                                <Logo text={true} width='60%' />
                            </div>
                        )}
                        <p className='text-lg cradle-text-tertiary cradle-mono leading-relaxed max-w-md'>
                            A knowledge workspace for threat intelligence analysts.
                        </p>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className='flex-1 flex items-center justify-center px-4 py-12'>
                    <div className='w-full max-w-md'>
                        {/* Mobile Logo */}
                        {windowSize.height && windowSize.height > 600 && (
                            <div className='lg:hidden flex justify-center mb-8'>
                                <Logo text={true} width='60%' />
                            </div>
                        )}

                        {/* Login Form */}
                        <div className='cradle-border cradle-bg-elevated'>
                            {/* Top Control Bar */}
                            <div className='cradle-card-header cradle-border-b'>
                                <span className='cradle-mono text-xs tracking-widest ml-8'>
                                    {showSettings
                                        ? 'CONFIGURATION'
                                        : requiresTwoFactor
                                          ? 'AUTHENTICATION'
                                          : 'SYSTEM ACCESS'}
                                </span>
                                <div className='flex items-center gap-2'>
                                    {showSettings ? (
                                        <>
                                            {auth.basePath && (
                                                <button
                                                    onClick={() => {
                                                        setBackendUrl(auth.basePath);
                                                        setShowSettings(false);
                                                    }}
                                                    className='p-1.5 hover:text-cradle2 cradle-text-tertiary hover:border-[var(--cradle-accent-primary)]'
                                                    data-testid='back-button'
                                                    title='Back'
                                                >
                                                    <Undo width={18} height={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={toggleTheme}
                                                className='p-1.5 hover:text-cradle2 cradle-text-tertiary hover:border-[var(--cradle-accent-primary)]'
                                                data-testid='theme-button'
                                                title='Toggle Theme'
                                            >
                                                {isDarkMode ? (
                                                    <SunLight width={18} height={18} />
                                                ) : (
                                                    <HalfMoon width={18} height={18} />
                                                )}
                                            </button>
                                        </>
                                    ) : (
                                        !requiresTwoFactor && (
                                            <button
                                                onClick={() =>
                                                    setShowSettings(!showSettings)
                                                }
                                                className='p-1.5 hover:text-cradle2 cradle-text-tertiary hover:border-[var(--cradle-accent-primary)]'
                                                data-testid='settings-button'
                                                title='Settings'
                                            >
                                                <Settings width={18} height={18} />
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
                                    onSubmit={
                                        showSettings ? handleSaveSettings : handleSubmit
                                    }
                                >
                                    {showSettings ? (
                                        <>
                                            <FormField
                                                key='backendUrl'
                                                name='backendUrl'
                                                label='Backend URL'
                                                type='text'
                                                value={backendUrl}
                                                onChange={(e) =>
                                                    setBackendUrl(e.target.value)
                                                }
                                                autoFocus={true}
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
                                                        <span>
                                                            Two-Factor Authentication
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <label className='cradle-label cradle-text-tertiary block mb-2'>
                                                            Authentication Code
                                                        </label>
                                                        <div className='flex gap-2 justify-center'>
                                                            {[0, 1, 2, 3, 4, 5].map(
                                                                (index) => (
                                                                    <input
                                                                        key={index}
                                                                        id={`twoFactorToken-${index}`}
                                                                        name={`twoFactorToken-${index}`}
                                                                        type='text'
                                                                        autoComplete='twoFactorToken'
                                                                        className='cradle-search w-12 h-12 text-center text-lg font-mono disabled:opacity-50 disabled:cursor-not-allowed'
                                                                        placeholder=''
                                                                        pattern='[0-9]*'
                                                                        maxLength={1}
                                                                        value={
                                                                            twoFactorToken[
                                                                                index
                                                                            ] || ''
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) => {
                                                                            const value =
                                                                                e.target.value.replace(
                                                                                    /\D/g,
                                                                                    '',
                                                                                );
                                                                            if (
                                                                                value.length <=
                                                                                1
                                                                            ) {
                                                                                const newCode =
                                                                                    twoFactorToken.split(
                                                                                        '',
                                                                                    );
                                                                                newCode[
                                                                                    index
                                                                                ] =
                                                                                    value;
                                                                                setTwoFactorToken(
                                                                                    newCode.join(
                                                                                        '',
                                                                                    ),
                                                                                );

                                                                                // Auto-focus next input
                                                                                if (
                                                                                    value &&
                                                                                    index <
                                                                                        5
                                                                                ) {
                                                                                    document
                                                                                        .getElementById(
                                                                                            `twoFactorToken-${index + 1}`,
                                                                                        )
                                                                                        ?.focus();
                                                                                }
                                                                            }
                                                                        }}
                                                                        onKeyDown={(
                                                                            e,
                                                                        ) => {
                                                                            // Handle backspace to go to previous input
                                                                            if (
                                                                                e.key ===
                                                                                    'Backspace' &&
                                                                                !twoFactorToken[
                                                                                    index
                                                                                ] &&
                                                                                index >
                                                                                    0
                                                                            ) {
                                                                                document
                                                                                    .getElementById(
                                                                                        `twoFactorToken-${index - 1}`,
                                                                                    )
                                                                                    ?.focus();
                                                                            }
                                                                        }}
                                                                        onPaste={(
                                                                            e,
                                                                        ) => {
                                                                            e.preventDefault();
                                                                            const pastedData =
                                                                                e.clipboardData
                                                                                    .getData(
                                                                                        'text',
                                                                                    )
                                                                                    .replace(
                                                                                        /\D/g,
                                                                                        '',
                                                                                    )
                                                                                    .slice(
                                                                                        0,
                                                                                        6,
                                                                                    );
                                                                            setTwoFactorToken(
                                                                                pastedData,
                                                                            );
                                                                            // Focus the last filled input or the first empty one
                                                                            const focusIndex =
                                                                                Math.min(
                                                                                    pastedData.length,
                                                                                    5,
                                                                                );
                                                                            document
                                                                                .getElementById(
                                                                                    `twoFactorToken-${focusIndex}`,
                                                                                )
                                                                                ?.focus();
                                                                        }}
                                                                        autoFocus={
                                                                            index === 0
                                                                        }
                                                                        required
                                                                    />
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className='text-xs cradle-text-muted cradle-mono'>
                                                        Enter the 6-digit code from your
                                                        authenticator app
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
                                                        label='Username'
                                                        key='username'
                                                        type='text'
                                                        value={username}
                                                        onChange={(e) =>
                                                            setUsername(e.target.value)
                                                        }
                                                        autoFocus={true}
                                                    />
                                                    <FormField
                                                        name='password'
                                                        label='Password'
                                                        key='password'
                                                        type='password'
                                                        value={password}
                                                        onChange={(e) =>
                                                            setPassword(e.target.value)
                                                        }
                                                    />
                                                    <AlertBox alert={alert} />
                                                    <button
                                                        type='submit'
                                                        data-testid='login-register-button'
                                                        className='cradle-btn cradle-btn-primary w-full'
                                                    >
                                                        Log in
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </form>

                                {/* Footer Links */}
                                {!requiresTwoFactor &&
                                    !showSettings &&
                                    auth.basePath && (
                                        <>
                                            <div className='cradle-separator mt-8'></div>
                                            <div className='flex justify-between items-center text-xs cradle-mono mt-6'>
                                                <Link
                                                    to='/forgot-password'
                                                    className='cradle-text-tertiary hover:text-cradle2  uppercase tracking-wider'
                                                    replace={true}
                                                    onClick={() =>
                                                        setRequiresTwoFactor(false)
                                                    }
                                                >
                                                    Reset Password
                                                </Link>
                                                <Link
                                                    to='/register'
                                                    className='cradle-text-tertiary hover:text-cradle2  uppercase tracking-wider'
                                                    replace={true}
                                                    state={{ from: from }}
                                                    onClick={() =>
                                                        setRequiresTwoFactor(false)
                                                    }
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
                                v2.10.2-beta.a070af1b
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
