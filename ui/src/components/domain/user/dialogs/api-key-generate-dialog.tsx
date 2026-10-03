import PasswordConfirmField from '@/components/domain/user/password-confirm-field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Field, FieldLabel } from '@/components/ui/field';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import {
    CopyIcon,
    EyeIcon,
    EyeSlashIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';

interface ApiKeyGenerateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    id: string;
    passwordRequired?: boolean;
}

export default function ApiKeyGenerateDialog({
    open,
    onOpenChange,
    id,
    passwordRequired = false,
}: ApiKeyGenerateDialogProps) {
    const [isRevealed, setIsRevealed] = useState(false);
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const keyId = useId();

    const {
        mutate,
        reset,
        data: apiKey,
        isPending,
        isIdle,
    } = useMutation({
        mutationFn: async (confirmedPassword?: string) => {
            const { data, error, response } = await fetchClient.POST(
                '/users/{user_id}/api-key/',
                {
                    params: { path: { user_id: id } },
                    body: confirmedPassword ? { password: confirmedPassword } : {},
                },
            );
            if (error) throw { response, error };
            return data.api_key;
        },
        meta: {
            suppressNotification: true,
        },
        onError: async (err) => {
            const parsed = await parseAPIError(err);
            setErrorMessage(getDisplayMessage(parsed));
        },
        onSuccess: () => setErrorMessage(null),
    });

    useEffect(() => {
        if (open) return;
        setIsRevealed(false);
        setPassword('');
        setErrorMessage(null);
        reset();
    }, [open, reset]);

    const isGenerateAllowed = !passwordRequired || password.length > 0;
    const generate = () => mutate(passwordRequired ? password : undefined);

    return (
        <>
            <AlertDialog
                open={open && isIdle}
                onOpenChange={(next) => {
                    if (!next) onOpenChange(false);
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                            Generating a new API key will invalidate your current key.
                            Any applications using the old key will stop working.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {passwordRequired ? (
                        <PasswordConfirmField
                            value={password}
                            onChange={setPassword}
                            disabled={isPending}
                        />
                    ) : null}
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <Button
                            type='button'
                            variant='default'
                            size='sm'
                            disabled={!isGenerateAllowed}
                            onClick={generate}
                        >
                            Generate
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog
                open={open && !isIdle}
                onOpenChange={(next) => {
                    if (!next) onOpenChange(false);
                }}
            >
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>API Key</DialogTitle>
                        {(apiKey || isPending) && (
                            <DialogDescription>
                                {apiKey
                                    ? "API key has been generated. Copy it now as you won't be able to see it again."
                                    : 'Generating your new API key...'}
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    {errorMessage ? (
                        <Alert variant='destructive'>
                            <WarningCircleIcon />
                            <AlertTitle>Could not generate API key</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    ) : null}

                    {errorMessage && passwordRequired ? (
                        <PasswordConfirmField
                            value={password}
                            onChange={setPassword}
                            disabled={isPending}
                        />
                    ) : null}

                    {apiKey ? (
                        <Field>
                            <FieldLabel htmlFor={keyId}>Your new API key</FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    id={keyId}
                                    name='api-key-value'
                                    autoComplete='off'
                                    type={isRevealed ? 'text' : 'password'}
                                    value={apiKey}
                                    readOnly
                                    className='font-mono'
                                />
                                <InputGroupAddon
                                    align='inline-end'
                                    className='flex gap-1'
                                >
                                    <InputGroupButton
                                        type='button'
                                        onClick={() => setIsRevealed(!isRevealed)}
                                        aria-label={
                                            isRevealed ? 'Hide API key' : 'Show API key'
                                        }
                                        title={
                                            isRevealed ? 'Hide API key' : 'Show API key'
                                        }
                                    >
                                        {isRevealed ? (
                                            <EyeSlashIcon
                                                className='size-4'
                                                weight='bold'
                                            />
                                        ) : (
                                            <EyeIcon className='size-4' weight='bold' />
                                        )}
                                    </InputGroupButton>
                                    <InputGroupButton
                                        type='button'
                                        onClick={async () => {
                                            await navigator.clipboard.writeText(apiKey);
                                            toast.success(
                                                'API key copied to clipboard!',
                                            );
                                        }}
                                        aria-label='Copy API key'
                                        title='Copy API key'
                                    >
                                        <CopyIcon className='size-4' weight='bold' />
                                    </InputGroupButton>
                                </InputGroupAddon>
                            </InputGroup>
                        </Field>
                    ) : null}

                    {(errorMessage || apiKey) && (
                        <DialogFooter>
                            {errorMessage ? (
                                <>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        onClick={() => onOpenChange(false)}
                                    >
                                        Close
                                    </Button>
                                    <Button
                                        type='button'
                                        variant='default'
                                        size='sm'
                                        onClick={generate}
                                        disabled={isPending || !isGenerateAllowed}
                                    >
                                        {isPending ? 'Generating...' : 'Retry'}
                                    </Button>
                                </>
                            ) : (
                                <DialogClose asChild>
                                    <Button type='button' variant='outline' size='sm'>
                                        Close
                                    </Button>
                                </DialogClose>
                            )}
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
