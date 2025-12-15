import AlertBox from '@/components/base/Alert/AlertBox';
import useApi from '@/hooks/api/useApi';
import { Alert } from '@/types';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';

/**
 * TwoFactorSetupModal component props
 */
export interface TwoFactorSetupModalProps {
    /** Function to close the modal */
    closeModal: () => void;
    /** Optional callback to execute on successful setup/disable */
    onSuccess?: () => void;
    /** If true, disables 2FA instead of enabling it */
    isDisabling?: boolean;
}

/**
 * TwoFactorSetupModal component - handles two-factor authentication setup and disabling
 *
 * When enabling 2FA, displays a QR code and secret key for authenticator app setup.
 * When disabling 2FA, prompts for verification code.
 *
 * @example
 * ```tsx
 * <TwoFactorSetupModal
 *   closeModal={closeModal}
 *   onSuccess={() => console.log('2FA setup complete')}
 *   isDisabling={false}
 * />
 * ```
 */
export default function TwoFactorSetupModal({
    closeModal,
    onSuccess,
    isDisabling = false,
}: TwoFactorSetupModalProps): JSX.Element {
    const { usersApi } = useApi();
    const [otpAuthUrl, setOtpAuthUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'green',
    });
    const [loading, setLoading] = useState(!isDisabling);

    useEffect(() => {
        // Only fetch 2FA setup data if we're enabling
        if (!isDisabling) {
            const setup2FA = async () => {
                try {
                    const response = await usersApi.users2faEnableCreate({});
                    setOtpAuthUrl(response.configUrl);
                    const secret = new URL(response.configUrl).searchParams.get(
                        'secret',
                    );
                    setSecret(secret || '');
                    setLoading(false);
                } catch (err) {
                    setLoading(false);
                    setAlert({
                        show: true,
                        message: 'Failed to initialize 2FA setup',
                        color: 'red',
                    });
                }
            };
            setup2FA();
        }
    }, [isDisabling, usersApi]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            if (isDisabling) {
                await usersApi.users2faDisableCreate({
                    verify2FARequest: { token: verificationCode },
                });
            } else {
                await usersApi.users2faVerifyCreate({
                    verify2FARequest: { token: verificationCode },
                });
            }
            onSuccess?.();
            closeModal();
        } catch (err) {
            setAlert({
                show: true,
                message: 'Invalid verification code. Please try again.',
                color: 'red',
            });
        }
    };

    if (loading) {
        return (
            <div className='min-w-[450px] max-w-lg'>
                <div className='flex items-end justify-between mb-4'>
                    <div className='flex items-center gap-3'>
                        <h2 className='text-xl font-semibold text-cradle-text-primary tracking-wide'>
                            Setting up Two-Factor Auth
                        </h2>
                    </div>
                </div>
                <div className='flex justify-center py-12'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-cradle-accent-primary'></div>
                </div>
            </div>
        );
    }

    return (
        <div className='min-w-[450px] max-w-lg'>
            {/* Header */}
            <div className='flex items-end justify-between mb-4'>
                <div className='flex items-center gap-3'>
                    <h2 className='text-xl font-semibold text-cradle-text-primary tracking-wide'>
                        {isDisabling ? 'Disable' : 'Set up'} Two-Factor Auth
                    </h2>
                </div>
            </div>

            {!isDisabling && (
                <>
                    {/* QR Code Section */}
                    <div className='flex justify-center mb-6'>
                        <div className='p-4 bg-white rounded-lg border border-cradle-border-accent'>
                            <QRCodeSVG value={otpAuthUrl} size={180} level='H' />
                        </div>
                    </div>

                    <div className='mb-6 p-4 border border-cradle-border-accent bg-cradle-bg-secondary/30 rounded-lg'>
                        <div className='flex items-start gap-3'>
                            <div className='w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0'></div>
                            <div className='flex-1'>
                                <h3 className='text-sm font-semibold text-cradle-text-primary mb-2'>
                                    Manual Entry
                                </h3>
                                <p className='text-xs text-cradle-text-tertiary mb-3'>
                                    Can't scan the QR code? Enter this secret key
                                    manually in your authenticator app:
                                </p>
                                <code className='block bg-cradle-bg-primary p-2 text-center select-all font-mono text-sm border border-cradle-border-accent rounded text-cradle-text-primary'>
                                    {secret}
                                </code>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className='space-y-5'>
                <div>
                    <div className='flex gap-2 justify-center w-full'>
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                            <input
                                key={index}
                                id={`twoFactorToken-${index}`}
                                name={`twoFactorToken-${index}`}
                                type='text'
                                autoComplete='twoFactorToken'
                                className='w-12 h-12 text-center text-lg font-mono rounded-lg border border-cradle-border-accent bg-cradle-bg-secondary/50 text-cradle-text-primary focus:border-cradle-accent-primary focus:ring-1 focus:ring-cradle-accent-primary outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                placeholder='0'
                                pattern='[0-9]*'
                                maxLength={1}
                                value={verificationCode[index] || ''}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    if (value.length <= 1) {
                                        const newCode = verificationCode.split('');
                                        newCode[index] = value;
                                        setVerificationCode(newCode.join(''));

                                        // Auto-focus next input
                                        if (value && index < 5) {
                                            document
                                                .getElementById(`twoFactorToken-${index + 1}`)
                                                ?.focus();
                                        }
                                    }
                                }}
                                onKeyDown={(e) => {
                                    // Handle backspace to go to previous input
                                    if (
                                        e.key === 'Backspace' &&
                                        !verificationCode[index] &&
                                        index > 0
                                    ) {
                                        document
                                            .getElementById(`twoFactorToken-${index - 1}`)
                                            ?.focus();
                                    }
                                }}
                                onPaste={(e) => {
                                    e.preventDefault();
                                    const pastedData = e.clipboardData
                                        .getData('text')
                                        .replace(/\D/g, '')
                                        .slice(0, 6);
                                    setVerificationCode(pastedData);
                                    // Focus the last filled input or the first empty one
                                    const focusIndex = Math.min(pastedData.length, 5);
                                    document
                                        .getElementById(`twoFactorToken-${focusIndex}`)
                                        ?.focus();
                                }}
                                autoFocus={index === 0}
                                required
                            />
                        ))}
                    </div>
                    <p className='text-xs text-cradle-text-tertiary text-center mt-3'>
                        {isDisabling
                            ? 'Enter the 6-digit code from your authenticator app to disable 2FA'
                            : 'Enter the 6-digit code from your authenticator app'}
                    </p>
                </div>

                <AlertBox alert={alert} />

                <div className='flex justify-end gap-2 mt-4 pt-3 cradle-border-t'>
                    <button
                        type='button'
                        className='rounded-full border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary text-sm px-3 py-1.5 flex items-center gap-1.5'
                        onClick={closeModal}
                    >
                        <span>Cancel</span>
                    </button>
                    <button
                        type='submit'
                        className={`rounded-full border bg-transparent transition-colors text-sm px-4 py-1.5 flex items-center gap-1.5 ${
                            isDisabling
                                ? 'border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/10'
                                : 'border-cradle-accent-primary hover:bg-cradle-accent-primary/10 text-cradle-accent-primary'
                        }`}
                        disabled={verificationCode.length !== 6}
                    >
                        <span>{isDisabling ? 'Disable 2FA' : 'Enable'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
