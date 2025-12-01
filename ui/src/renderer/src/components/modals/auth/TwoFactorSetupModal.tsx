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
            <div className='w-full min-w-[28rem]'>
                <div className='mb-6'>
                    <h2 className='text-xl font-semibold cradle-text-primary cradle-mono mb-2'>
                        Setting up Two-Factor Authentication
                    </h2>
                </div>
                <div className='flex justify-center py-8'>
                    <div className='loading loading-spinner loading-lg'></div>
                </div>
            </div>
        );
    }

    return (
        <div className='w-full min-w-[28rem]'>
            {/* Header */}
            <div className='mb-6'>
                <h2 className='text-xl font-semibold cradle-text-primary cradle-mono mb-2'>
                    {isDisabling ? 'Disable' : 'Set up'} Two-Factor Authentication
                </h2>
            </div>

            {!isDisabling && (
                <>
                    {/* QR Code Section */}
                    <div className='flex justify-center mb-4'>
                        <div className='p-4 bg-white'>
                            <QRCodeSVG value={otpAuthUrl} size={200} level='H' />
                        </div>
                    </div>

                    <div className='mb-6 p-4 cradle-border cradle-bg-secondary'>
                        <div className='flex items-start gap-3'>
                            <div className='cradle-status-light cradle-status-info mt-1 flex-shrink-0'></div>
                            <div className='flex-1'>
                                <h3 className='text-sm font-semibold cradle-text-primary cradle-mono mb-2'>
                                    Manual Entry
                                </h3>
                                <p className='text-xs cradle-text-tertiary cradle-mono mb-3'>
                                    Can't scan the QR code? Enter this secret key
                                    manually in your authenticator app:
                                </p>
                                <code className='block cradle-bg-primary p-2 text-center select-all cradle-mono text-sm'>
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
                    <label className='block text-sm font-medium cradle-text-secondary cradle-mono mb-2'>
                        Verification Code
                    </label>
                    <input
                        type='text'
                        className='cradle-input w-full'
                        placeholder={
                            isDisabling
                                ? 'Enter code to confirm 2FA disable'
                                : 'Enter 6-digit code'
                        }
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        pattern='[0-9]*'
                        maxLength={6}
                    />
                </div>

                <AlertBox alert={alert} />

                <div className='cradle-border-t pt-5 mt-5'>
                    <div className='flex gap-3'>
                        <button
                            type='button'
                            className='cradle-btn cradle-btn-ghost flex-1'
                            onClick={closeModal}
                        >
                            Cancel
                        </button>
                        <button
                            type='submit'
                            className={`cradle-btn flex-1 ${isDisabling ? 'cradle-btn-danger' : 'cradle-btn-primary'}`}
                            disabled={!verificationCode}
                        >
                            {isDisabling ? 'Disable 2FA' : 'Verify and Enable'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
