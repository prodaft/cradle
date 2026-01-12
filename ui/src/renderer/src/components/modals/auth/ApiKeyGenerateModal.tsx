import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import useApi from '@/hooks/api/useApi';
import { Alert } from '@/types';
import { useMutation } from '@tanstack/react-query';
import { Copy, Eye, EyeClosed, WarningCircle } from 'iconoir-react';
import { useState } from 'react';

/**
 * ApiKeyGenerateModal component props
 */
export interface ApiKeyGenerateModalProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
    /** User ID to generate API key for */
    userId: string;
}

/**
 * ApiKeyGenerateModal component - handles API key generation with copy and visibility toggle
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <ApiKeyGenerateModal
 *   open={open}
 *   onOpenChange={setOpen}
 *   userId="user-123"
 * />
 * ```
 */
export default function ApiKeyGenerateModal({
    open,
    onOpenChange,
    userId,
}: ApiKeyGenerateModalProps) {
    const { usersApi } = useApi();
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [copied, setCopied] = useState(false);
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

    const handleCopy = async () => {
        if (apiKey) {
            await navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const maskApiKey = (key: string) => {
        if (key.length <= 8) return '****';
        return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate API Key</DialogTitle>
                    {!apiKey && (
                        <DialogDescription>
                            Generating a new API key will invalidate your current key.
                            Any applications using the old key will stop working.
                        </DialogDescription>
                    )}
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
                                <WarningCircle />
                                <AlertDescription>{alert.message}</AlertDescription>
                            </AlertComponent>
                        )}

                        <div className='flex justify-end gap-2 mt-4'>
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
                        </div>
                    </>
                ) : (
                    <>
                        {/* Success Section */}
                        <div className='mb-6 p-4 border border-border-border bg-bg-secondary/30 rounded-lg'>
                            <div className='flex items-start gap-3'>
                                <div className='w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0'></div>
                                <div className='flex-1'>
                                    <h3 className='text-sm font-semibold text-text-foreground mb-1'>
                                        API Key Generated
                                    </h3>
                                    <p className='text-xs text-text-muted-foreground mb-3'>
                                        Copy this key now. For security reasons, you
                                        won't be able to see it again.
                                    </p>

                                    {/* API Key Display */}
                                    <div className='flex items-center gap-2 bg-bg-background p-3 border border-border-border rounded-lg'>
                                        <code className='flex-1 font-mono text-sm text-text-foreground select-all break-all'>
                                            {showApiKey ? apiKey : maskApiKey(apiKey)}
                                        </code>
                                        <Button
                                            type='button'
                                            variant='ghost'
                                            size='icon-sm'
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            title={
                                                showApiKey
                                                    ? 'Hide API key'
                                                    : 'Show API key'
                                            }
                                        >
                                            {showApiKey ? (
                                                <Eye className='w-4 h-4' />
                                            ) : (
                                                <EyeClosed className='w-4 h-4' />
                                            )}
                                        </Button>
                                        <Button
                                            type='button'
                                            variant='ghost'
                                            size='icon-sm'
                                            onClick={handleCopy}
                                            title={copied ? 'Copied!' : 'Copy API key'}
                                        >
                                            <Copy className='w-4 h-4' />
                                        </Button>
                                    </div>
                                    {copied && (
                                        <p className='text-xs text-primary mt-2 font-medium'>
                                            API key copied to clipboard!
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className='flex justify-end gap-2 mt-4'>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => onOpenChange(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
