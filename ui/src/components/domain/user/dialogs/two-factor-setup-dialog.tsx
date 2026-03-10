import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import { CopyIcon, QrCodeIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

/**
 * TwoFactorSetupDialog component props
 */
export interface TwoFactorSetupDialogProps {
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
 * TwoFactorSetupDialog component - handles two-factor authentication setup and disabling
 *
 * When enabling 2FA, displays a QR code and secret key for authenticator app setup.
 * When disabling 2FA, prompts for verification code.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <TwoFactorSetupDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onSuccess={() => console.log('2FA setup complete')}
 *   isDisabling={false}
 * />
 * ```
 */
export default function TwoFactorSetupDialog({
    open,
    onOpenChange,
    onSuccess,
    isDisabling = false,
}: TwoFactorSetupDialogProps): React.JSX.Element {
    const [verificationCode, setVerificationCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Query for 2FA setup data (only when enabling) - POST to enable returns config
    const { data: twoFactorData, isLoading } = useQuery({
        queryKey: ['2fa', 'setup'],
        queryFn: async () => {
            const { data, error, response } =
                await fetchClient.POST('/users/2fa/enable/');
            if (error) throw { response, error };
            return data;
        },
        enabled: open && !isDisabling,
        meta: { showErrorToast: true },
    });

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setVerificationCode('');
        }
    }, [open]);

    const otpAuthUrl = twoFactorData?.config_url || '';
    const secret = useMemo(() => {
        if (!otpAuthUrl) return '';
        try {
            return new URL(otpAuthUrl).searchParams.get('secret') || '';
        } catch {
            return '';
        }
    }, [otpAuthUrl]);

    const handleCopySecret = useCallback(async () => {
        if (secret) {
            try {
                await navigator.clipboard.writeText(secret);
                toast.success('Secret key copied to clipboard');
            } catch (_err) {
                toast.error('Failed to copy to clipboard');
            }
        }
    }, [secret]);

    const handleSubmit = useCallback(
        async (e: React.SubmitEvent) => {
            e.preventDefault();
            setIsSubmitting(true);
            try {
                if (isDisabling) {
                    const { error, response } = await fetchClient.POST(
                        '/users/2fa/disable/',
                        {
                            body: { token: verificationCode } as any,
                        },
                    );
                    if (error) throw { response, error };
                } else {
                    const { error, response } = await fetchClient.POST(
                        '/users/2fa/verify/',
                        {
                            body: { token: verificationCode } as any,
                        },
                    );
                    if (error) throw { response, error };
                }
                onSuccess?.();
                onOpenChange(false);
            } catch (err) {
                const parsed = await parseAPIError(err);
                toast.error(getDisplayMessage(parsed));
            } finally {
                setIsSubmitting(false);
            }
        },
        [verificationCode, isDisabling, fetchClient, onSuccess, onOpenChange],
    );

    if (!isDisabling && isLoading) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>Setting up Two-Factor Auth</DialogTitle>
                        <DialogDescription>
                            Initializing two-factor authentication setup
                        </DialogDescription>
                    </DialogHeader>
                    <div className='flex justify-center py-12'>
                        <Spinner className='size-8' />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <form onSubmit={handleSubmit} className='grid gap-4'>
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

                    {!isDisabling && !otpAuthUrl && !isLoading && (
                        <p className='text-sm text-muted-foreground'>
                            QR code setup data isn't available right now. Close this
                            dialog and try again.
                        </p>
                    )}

                    {!isDisabling && !!otpAuthUrl && (
                        <>
                            {/* QR Code Section */}
                            <div className='flex justify-center'>
                                <div className='p-4 bg-card rounded-lg border border-border'>
                                    <QRCodeSVG
                                        value={otpAuthUrl}
                                        size={180}
                                        level='H'
                                    />
                                </div>
                            </div>

                            <Field>
                                <FieldLabel htmlFor='input-field-secret-key'>
                                    Manual Entry
                                </FieldLabel>
                                <InputGroup>
                                    <InputGroupAddon align='inline-start'>
                                        <QrCodeIcon className='size-4' />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        id='input-field-secret-key'
                                        type='text'
                                        value={secret}
                                        readOnly
                                    />
                                    <InputGroupAddon align='inline-end'>
                                        <InputGroupButton
                                            type='button'
                                            onClick={handleCopySecret}
                                            aria-label='Copy secret key'
                                        >
                                            <CopyIcon className='size-4' />
                                        </InputGroupButton>
                                    </InputGroupAddon>
                                </InputGroup>
                                <FieldDescription>
                                    Can't scan the QR code? Enter this secret key
                                    manually in your authenticator app.
                                </FieldDescription>
                            </Field>
                        </>
                    )}

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

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type='submit'
                            variant={isDisabling ? 'destructive' : 'default'}
                            size='sm'
                            disabled={
                                verificationCode.length !== 6 ||
                                isSubmitting ||
                                (!isDisabling && !otpAuthUrl)
                            }
                            aria-busy={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Loading...'
                                : isDisabling
                                  ? 'Disable'
                                  : 'Enable'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
