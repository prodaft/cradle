import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
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
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import useApi from '@/hooks/api/use-api';
import { Alert } from '@/types';
import {
    CopyIcon,
    EyeIcon,
    EyeSlashIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

/**
 * ApiKeyGenerateDialog component props
 */
export interface ApiKeyGenerateDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
    /** User ID to generate API key for */
    userId: string;
}

/**
 * ApiKeyGenerateDialog component - handles API key generation with copy and visibility toggle
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <ApiKeyGenerateDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   userId="user-123"
 * />
 * ```
 */
export default function ApiKeyGenerateDialog({
    open,
    onOpenChange,
    userId,
}: ApiKeyGenerateDialogProps) {
    const { usersApi } = useApi();
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'green',
    });

    const generateMutation = useMutation({
        mutationFn: async () => {
            const response = await usersApi.usersApikeyCreate({ userId });
            return response.apiKey;
        },
        meta: {
            errorMessage: 'Failed to generate API key',
            suppressNotification: true, // We handle alerts ourselves
        },
        onSuccess: (apiKey) => {
            setApiKey(apiKey);
        },
        onError: (error: any) => {
            setAlert({
                show: true,
                message:
                    error?.detail || 'An error occurred while generating the API key.',
                color: 'red',
            });
        },
    });

    const handleGenerate = () => {
        generateMutation.mutate();
    };

    const handleCopy = useCallback(async () => {
        if (apiKey) {
            await navigator.clipboard.writeText(apiKey);
            toast.success('API key copied to clipboard!');
        }
    }, [apiKey]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>Generate API Key</DialogTitle>
                    <DialogDescription>
                        {!apiKey
                            ? 'Generating a new API key will invalidate your current key. Any applications using the old key will stop working.'
                            : "API key has been generated. Copy it now as you won't be able to see it again."}
                    </DialogDescription>
                </DialogHeader>

                {!apiKey ? (
                    <>
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

                        <DialogFooter>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => onOpenChange(false)}
                                disabled={generateMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type='button'
                                variant='default'
                                size='sm'
                                onClick={handleGenerate}
                                disabled={generateMutation.isPending}
                            >
                                {generateMutation.isPending
                                    ? 'Generating...'
                                    : 'Generate'}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        {/* API Key Display */}
                        <InputGroup>
                            <InputGroupInput
                                type={showApiKey ? 'text' : 'password'}
                                value={apiKey}
                                readOnly
                                className='font-mono'
                            />
                            <InputGroupAddon align='inline-end' className='flex gap-1'>
                                <InputGroupButton
                                    type='button'
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    aria-label={
                                        showApiKey ? 'Hide API key' : 'Show API key'
                                    }
                                    title={showApiKey ? 'Hide API key' : 'Show API key'}
                                >
                                    {showApiKey ? (
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
                                    onClick={handleCopy}
                                    aria-label='Copy API key'
                                    title='Copy API key'
                                >
                                    <CopyIcon className='size-4' weight='bold' />
                                </InputGroupButton>
                            </InputGroupAddon>
                        </InputGroup>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type='button' variant='outline' size='sm'>
                                    Close
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
