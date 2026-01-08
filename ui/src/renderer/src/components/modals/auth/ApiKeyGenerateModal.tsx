import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { WarningCircle } from 'iconoir-react';
import useApi from '@/hooks/api/useApi';
import { Alert } from '@/types';
import { displayError } from '@/utils/api';
import { Copy, Eye, EyeClosed } from 'iconoir-react';
import { useState } from 'react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * ApiKeyGenerateModal component props
 */
export interface ApiKeyGenerateModalProps {
    /** Function to close the modal */
    closeModal: () => void;
    /** User ID to generate API key for */
    userId: string;
}

/**
 * ApiKeyGenerateModal component - handles API key generation with copy and visibility toggle
 *
 * @example
 * ```tsx
 * <ApiKeyGenerateModal
 *   closeModal={closeModal}
 *   userId="user-123"
 * />
 * ```
 */
export default function ApiKeyGenerateModal({
    closeModal,
    userId,
}: ApiKeyGenerateModalProps): JSX.Element {
    const { usersApi } = useApi();
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'green',
    });

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const response = await usersApi.usersApikeyCreate({ userId });
            setApiKey(response.apiKey);
        } catch (err) {
            displayError(setAlert)(err);
        } finally {
            setLoading(false);
        }
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
        <>
            <DialogHeader>
                <DialogTitle>Generate API Key</DialogTitle>
                {!apiKey && (
                    <DialogDescription>
                        Generating a new API key will invalidate your current key. Any applications using the old key will stop working.
                    </DialogDescription>
                )}
            </DialogHeader>

            {!apiKey ? (
                <>
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
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type='button'
                            variant='default'
                            size='sm'
                            onClick={handleGenerate}
                            disabled={loading}
                        >
                            {loading ? 'Generating...' : 'Generate'}
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    {/* Success Section */}
                    <div className='mb-6 p-4 border border-cradle-border-accent bg-cradle-bg-secondary/30 rounded-lg'>
                        <div className='flex items-start gap-3'>
                            <div className='w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0'></div>
                            <div className='flex-1'>
                                <h3 className='text-sm font-semibold text-cradle-text-primary mb-1'>
                                    API Key Generated
                                </h3>
                                <p className='text-xs text-cradle-text-tertiary mb-3'>
                                    Copy this key now. For security reasons, you won't
                                    be able to see it again.
                                </p>

                                {/* API Key Display */}
                                <div className='flex items-center gap-2 bg-cradle-bg-primary p-3 border border-cradle-border-accent rounded-lg'>
                                    <code className='flex-1 font-mono text-sm text-cradle-text-primary select-all break-all'>
                                        {showApiKey ? apiKey : maskApiKey(apiKey)}
                                    </code>
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='icon-sm'
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        title={
                                            showApiKey ? 'Hide API key' : 'Show API key'
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
                                    <p className='text-xs text-green-500 mt-2 font-medium'>
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
                            onClick={closeModal}
                        >
                            Close
                        </Button>
                    </div>
                </>
            )}
        </>
    );
}
