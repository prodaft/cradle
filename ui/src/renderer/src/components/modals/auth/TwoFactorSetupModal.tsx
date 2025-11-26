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
            <div className='p-4'>
                <h2 className='text-2xl font-bold mb-4'>
                    Setting up Two-Factor Authentication
                </h2>
                <div className='flex justify-center'>
                    <div className='loading loading-spinner loading-lg'></div>
                </div>
            </div>
        );
    }

    return (
        <div className='w-full max-w-md'>
            <h2 className='text-2xl font-bold mb-4'>
                {isDisabling ? 'Disable' : 'Set up'} Two-Factor Authentication
            </h2>

            {!isDisabling && (
                <div className='mb-6'>
                    <div className='flex justify-center mb-4'>
                        <div className='p-4 bg-white rounded'>
                            <QRCodeSVG value={otpAuthUrl} size={200} level='H' />
                        </div>
                    </div>

                    <div className='mb-4 p-4 bg-gray-100 dark:bg-zinc-800 rounded'>
                        <p className='text-sm mb-2'>
                            Can't scan the QR code? Enter this secret key manually in
                            your authenticator app:
                        </p>
                        <code className='block bg-white dark:bg-zinc-900 p-2 rounded text-center select-all'>
                            {secret}
                        </code>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className='mb-4'>
                    <input
                        type='text'
                        className='input input-bordered w-full input-block'
                        placeholder={
                            isDisabling
                                ? 'Enter code to confirm 2FA disable'
                                : 'Enter verification code'
                        }
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        pattern='[0-9]*'
                        maxLength={6}
                    />
                </div>

                <AlertBox alert={alert} />

                <div className='flex justify-end gap-2 mt-3'>
                    <button type='button' className='btn' onClick={closeModal}>
                        Cancel
                    </button>
                    <button
                        type='submit'
                        className={`btn ${isDisabling ? 'btn-error' : 'btn-primary'}`}
                        disabled={!verificationCode}
                    >
                        {isDisabling ? 'Disable 2FA' : 'Verify and Enable'}
                    </button>
                </div>
            </form>
        </div>
    );
}
