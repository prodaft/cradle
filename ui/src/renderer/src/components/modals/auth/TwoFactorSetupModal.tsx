import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { WarningCircle } from 'iconoir-react';
import useApi from '@/hooks/api/useApi';
import { Alert } from '@/types';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldLabel,
} from '@/components/ui/field';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';

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
            <>
                <DialogHeader>
                    <DialogTitle>Setting up Two-Factor Auth</DialogTitle>
                </DialogHeader>
                <div className='flex justify-center py-12'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-border-primary'></div>
                </div>
            </>
        );
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle>{isDisabling ? 'Disable' : 'Set up'} Two-Factor Auth</DialogTitle>
            </DialogHeader>

            {!isDisabling && (
                <>
                    {/* QR Code Section */}
                    <div className='flex justify-center mb-6'>
                        <div className='p-4 bg-card rounded-lg border border-border'>
                            <QRCodeSVG value={otpAuthUrl} size={180} level='H' />
                        </div>
                    </div>

                    <div className='mb-6 p-4 border border-border-border bg-bg-secondary/30 rounded-lg'>
                        <div className='flex items-start gap-3'>
                            <div className='w-2 h-2 rounded-full bg-border-primary mt-1.5 flex-shrink-0'></div>
                            <div className='flex-1'>
                                <h3 className='text-sm font-semibold text-text-foreground mb-2'>
                                    Manual Entry
                                </h3>
                                <p className='text-xs text-text-muted-foreground mb-3'>
                                    Can't scan the QR code? Enter this secret key
                                    manually in your authenticator app:
                                </p>
                                <code className='block bg-bg-background p-2 text-center select-all font-mono text-sm border border-border-border rounded text-text-foreground'>
                                    {secret}
                                </code>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className='space-y-5'>
                <DialogDescription>
                    {isDisabling
                        ? 'Enter the 6-digit code from your authenticator app to disable 2FA'
                        : 'Enter the 6-digit code from your authenticator app'}
                </DialogDescription>
                <Field>
                    <InputOTP
                        maxLength={6}
                        value={verificationCode}
                        onChange={(value) => setVerificationCode(value)}
                        containerClassName="w-full"
                    >
                        <InputOTPGroup className="w-full">
                            <InputOTPSlot index={0} className="flex-1 h-12" />
                            <InputOTPSlot index={1} className="flex-1 h-12" />
                            <InputOTPSlot index={2} className="flex-1 h-12" />
                            <InputOTPSlot index={3} className="flex-1 h-12" />
                            <InputOTPSlot index={4} className="flex-1 h-12" />
                            <InputOTPSlot index={5} className="flex-1 h-12" />
                        </InputOTPGroup>
                    </InputOTP>
                </Field>

                {alert.show && (
                    <AlertComponent variant={alert.color === 'red' || alert.color === 'error' ? 'destructive' : 'default'}>
                        <WarningCircle />
                        <AlertDescription>{alert.message}</AlertDescription>
                    </AlertComponent>
                )}

                <div className='flex justify-end gap-2 mt-4'>
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={closeModal}
                    >
                        Cancel
                    </Button>
                    <Button
                        type='submit'
                        variant={isDisabling ? 'destructive' : 'default'}
                        size='sm'
                        disabled={verificationCode.length !== 6}
                    >
                        {isDisabling ? 'Disable 2FA' : 'Enable'}
                    </Button>
                </div>
            </form>
        </>
    );
}
