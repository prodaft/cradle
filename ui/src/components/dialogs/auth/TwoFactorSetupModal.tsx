import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import useApi from '@/hooks/api/useApi';
import { Enable2FA } from '@/services/cradle/models';
import { Alert } from '@/types';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import React, { useEffect, useState } from 'react';

/**
 * TwoFactorSetupModal component props
 */
export interface TwoFactorSetupModalProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
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
 * const [open, setOpen] = useState(false);
 * <TwoFactorSetupModal
 *   open={open}
 *   onOpenChange={setOpen}
 *   onSuccess={() => console.log('2FA setup complete')}
 *   isDisabling={false}
 * />
 * ```
 */
export default function TwoFactorSetupModal({
    open,
    onOpenChange,
    onSuccess,
    isDisabling = false,
}: TwoFactorSetupModalProps): React.JSX.Element {
    const { usersApi } = useApi();
    const [verificationCode, setVerificationCode] = useState('');
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'green',
    });

    // Query for 2FA setup data (only when enabling)
    const {
        data: twoFactorData,
        isPending: loading,
        error: twoFactorError,
    } = useQuery<Enable2FA>({
        queryKey: ['2fa', 'setup'],
        queryFn: () => usersApi.users2faEnableCreate({}),
        enabled: open && !isDisabling,
        meta: {
            showErrorToast: false, // We handle errors ourselves
            errorMessage: 'Failed to initialize 2FA setup',
        },
    });

    useEffect(() => {
        if (twoFactorError) {
            setAlert({
                show: true,
                message: 'Failed to initialize 2FA setup',
                color: 'red',
            });
        }
    }, [twoFactorError]);

    const otpAuthUrl = twoFactorData?.configUrl || '';
    const secret = otpAuthUrl
        ? new URL(otpAuthUrl).searchParams.get('secret') || ''
        : '';

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
            onOpenChange(false);
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
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Setting up Two-Factor Auth</DialogTitle>
                        <DialogDescription className='sr-only'>
                            Initializing two-factor authentication setup
                        </DialogDescription>
                    </DialogHeader>
                    <div className='flex justify-center py-12'>
                        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isDisabling ? 'Disable' : 'Set up'} Two-Factor Auth
                    </DialogTitle>
                    <DialogDescription>
                        {isDisabling
                            ? 'Enter the 6-digit code from your authenticator app to disable 2FA'
                            : 'Enter the 6-digit code from your authenticator app'}
                    </DialogDescription>
                </DialogHeader>

                {!isDisabling && (
                    <>
                        {/* QR Code Section */}
                        <div className='flex justify-center mb-6'>
                            <div className='p-4 bg-card rounded-lg border border-border'>
                                <QRCodeSVG value={otpAuthUrl} size={180} level='H' />
                            </div>
                        </div>

                        <div className='mb-6 p-4 border border-border bg-secondary/30 rounded-lg'>
                            <div className='flex items-start gap-3'>
                                <div className='w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0'></div>
                                <div className='flex-1'>
                                    <h3 className='text-sm font-semibold text-foreground mb-2'>
                                        Manual Entry
                                    </h3>
                                    <p className='text-xs text-muted-foreground mb-3'>
                                        Can't scan the QR code? Enter this secret key
                                        manually in your authenticator app:
                                    </p>
                                    <code className='block bg-background p-2 text-center select-all font-mono text-sm border border-border rounded text-foreground'>
                                        {secret}
                                    </code>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className='space-y-5'>
                    <Field>
                        <InputOTP
                            maxLength={6}
                            value={verificationCode}
                            onChange={(value) => setVerificationCode(value)}
                            containerClassName='w-full'
                        >
                            <InputOTPGroup className='w-full'>
                                <InputOTPSlot index={0} className='flex-1 h-12' />
                                <InputOTPSlot index={1} className='flex-1 h-12' />
                                <InputOTPSlot index={2} className='flex-1 h-12' />
                                <InputOTPSlot index={3} className='flex-1 h-12' />
                                <InputOTPSlot index={4} className='flex-1 h-12' />
                                <InputOTPSlot index={5} className='flex-1 h-12' />
                            </InputOTPGroup>
                        </InputOTP>
                    </Field>

                    {alert.show && (
                        <AlertComponent
                            variant={
                                alert.color === 'red' || alert.color === 'error'
                                    ? 'destructive'
                                    : 'default'
                            }
                        >
                            <WarningCircleIcon />
                            <AlertDescription>{alert.message}</AlertDescription>
                        </AlertComponent>
                    )}

                    <div className='flex justify-end gap-2 mt-4'>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => onOpenChange(false)}
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
            </DialogContent>
        </Dialog>
    );
}
