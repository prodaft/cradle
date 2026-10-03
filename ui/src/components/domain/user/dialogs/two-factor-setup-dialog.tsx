import PasswordConfirmField from '@/components/domain/user/password-confirm-field';
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
import { useMutation } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface TwoFactorSetupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    isDisabling?: boolean;
    passwordRequired?: boolean;
}

type Phase = 'password' | 'loading' | 'form';

function getPhase(
    isDisabling: boolean,
    passwordRequired: boolean,
    configUrl: string,
    isPending: boolean,
): Phase {
    if (!isDisabling && passwordRequired && !configUrl && !isPending) return 'password';
    if (!isDisabling && isPending) return 'loading';
    return 'form';
}

export default function TwoFactorSetupDialog({
    open,
    onOpenChange,
    onSuccess,
    isDisabling = false,
    passwordRequired = false,
}: TwoFactorSetupDialogProps): React.JSX.Element {
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const otpId = useId();
    const secretId = useId();
    const startedRef = useRef(false);

    const {
        mutate: startSetup,
        reset,
        data: setup,
        isPending,
    } = useMutation({
        mutationFn: async (confirmedPassword?: string) => {
            const { data, error, response } = await fetchClient.POST(
                '/users/2fa/enable/',
                {
                    body: confirmedPassword ? { password: confirmedPassword } : {},
                },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: { showErrorToast: true },
    });

    useEffect(() => {
        if (open) return;
        startedRef.current = false;
        setOtp('');
        setPassword('');
        reset();
    }, [open, reset]);

    useEffect(() => {
        if (!open || isDisabling || passwordRequired || startedRef.current) return;
        startedRef.current = true;
        startSetup(undefined);
    }, [open, isDisabling, passwordRequired, startSetup]);

    const configUrl = setup?.config_url || '';
    const phase = getPhase(isDisabling, passwordRequired, configUrl, isPending);
    const secret = useMemo(() => {
        if (!configUrl) return '';
        try {
            return new URL(configUrl).searchParams.get('secret') || '';
        } catch {
            return '';
        }
    }, [configUrl]);

    const copySecret = useCallback(async () => {
        if (!secret) return;
        try {
            await navigator.clipboard.writeText(secret);
            toast.success('Secret key copied to clipboard');
        } catch {
            toast.error('Failed to copy to clipboard');
        }
    }, [secret]);

    const submit = useCallback(
        async (e: React.SubmitEvent<HTMLFormElement>) => {
            e.preventDefault();
            setIsSubmitting(true);
            try {
                if (isDisabling) {
                    const { error, response } = await fetchClient.POST(
                        '/users/2fa/disable/',
                        {
                            body: {
                                token: otp,
                                ...(passwordRequired ? { password } : {}),
                            },
                        },
                    );
                    if (error) throw { response, error };
                } else {
                    const { error, response } = await fetchClient.POST(
                        '/users/2fa/verify/',
                        { body: { token: otp } },
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
        [otp, password, isDisabling, passwordRequired, onSuccess, onOpenChange],
    );

    const isSubmitAllowed =
        otp.length === 6 && (!isDisabling || !passwordRequired || password.length > 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-sm'>
                {phase === 'password' ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            startSetup(password);
                        }}
                        className='grid gap-4'
                    >
                        <DialogHeader>
                            <DialogTitle>Two-Factor Auth</DialogTitle>
                            <DialogDescription>
                                Confirm your password to begin two-factor authentication
                                setup.
                            </DialogDescription>
                        </DialogHeader>
                        <PasswordConfirmField
                            value={password}
                            onChange={setPassword}
                            disabled={isPending}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    disabled={isPending}
                                >
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button
                                type='submit'
                                size='sm'
                                disabled={!password || isPending}
                                aria-busy={isPending}
                            >
                                {isPending ? 'Loading...' : 'Continue'}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : phase === 'loading' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Two-Factor Auth</DialogTitle>
                            <DialogDescription>
                                Initializing two-factor authentication setup
                            </DialogDescription>
                        </DialogHeader>
                        <div className='flex justify-center py-12'>
                            <Spinner className='size-8' />
                        </div>
                    </>
                ) : (
                    <form onSubmit={submit} className='grid gap-4'>
                        <DialogHeader>
                            <DialogTitle>
                                {isDisabling
                                    ? 'Disable Two-Factor Auth'
                                    : 'Two-Factor Auth'}
                            </DialogTitle>
                            <DialogDescription>
                                {isDisabling
                                    ? 'Enter the 6-digit code from your authenticator app to disable 2FA'
                                    : 'Enter the 6-digit code from your authenticator app'}
                            </DialogDescription>
                        </DialogHeader>

                        {!isDisabling && !configUrl && (
                            <p className='text-sm text-muted-foreground'>
                                QR code setup data isn't available right now. Close this
                                dialog and try again.
                            </p>
                        )}

                        {!isDisabling && !!configUrl && (
                            <>
                                <div className='flex justify-center'>
                                    <div className='p-4 bg-card rounded-lg border border-border'>
                                        <QRCodeSVG
                                            value={configUrl}
                                            size={180}
                                            level='H'
                                        />
                                    </div>
                                </div>

                                <Field>
                                    <FieldLabel htmlFor={secretId}>
                                        Manual Entry
                                    </FieldLabel>
                                    <InputGroup>
                                        <InputGroupAddon align='inline-start'>
                                            <QrCodeIcon className='size-4' />
                                        </InputGroupAddon>
                                        <InputGroupInput
                                            id={secretId}
                                            type='text'
                                            value={secret}
                                            readOnly
                                        />
                                        <InputGroupAddon align='inline-end'>
                                            <InputGroupButton
                                                type='button'
                                                onClick={copySecret}
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

                        {isDisabling && passwordRequired ? (
                            <PasswordConfirmField
                                value={password}
                                onChange={setPassword}
                                disabled={isSubmitting}
                            />
                        ) : null}

                        <Field>
                            <FieldLabel htmlFor={otpId}>Verification code</FieldLabel>
                            <InputOTP
                                id={otpId}
                                name='otp'
                                autoComplete='one-time-code'
                                maxLength={6}
                                value={otp}
                                onChange={(value) => setOtp(value)}
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
                                    !isSubmitAllowed ||
                                    isSubmitting ||
                                    (!isDisabling && !configUrl)
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
                )}
            </DialogContent>
        </Dialog>
    );
}
