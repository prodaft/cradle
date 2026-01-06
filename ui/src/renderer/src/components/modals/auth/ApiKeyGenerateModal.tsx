import AlertBox from '@/components/base/Alert/AlertBox';
import useApi from '@/hooks/api/useApi';
import { Alert } from '@/types';
import { displayError } from '@/utils/api';
import { Copy, Eye, EyeClosed } from 'iconoir-react';
import { useState } from 'react';

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
        <div className='min-w-[500px] max-w-2xl'>
            {/* Header */}
            <div className='flex items-end justify-between mb-4'>
                <div className='flex items-center gap-3'>
                    <h2 className='text-xl font-semibold text-cradle-text-primary tracking-wide'>
                        Generate API Key
                    </h2>
                </div>
            </div>

            {!apiKey ? (
                <>
                    {/* Warning Section */}
                    <div className='mb-6 p-4 border border-cradle-border-accent bg-cradle-bg-secondary/30 rounded-lg'>
                        <div className='flex items-start gap-3'>
                            <div className='w-2 h-2 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0'></div>
                            <div>
                                <h3 className='text-sm font-semibold text-cradle-text-primary mb-1'>
                                    Important Notice
                                </h3>
                                <p className='text-xs text-cradle-text-tertiary leading-relaxed'>
                                    Generating a new API key will invalidate your
                                    current key. Any applications using the old key will
                                    stop working.
                                </p>
                            </div>
                        </div>
                    </div>

                    <AlertBox alert={alert} />

                    <div className='flex justify-end gap-2 mt-4 pt-3 cradle-border-t'>
                        <button
                            type='button'
                            className='rounded-lg border border-cradle-border-accent bg-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors text-cradle-text-secondary text-sm px-3 py-1.5 flex items-center gap-1.5'
                            onClick={closeModal}
                            disabled={loading}
                        >
                            <span>Cancel</span>
                        </button>
                        <button
                            type='button'
                            className='rounded-lg border border-cradle-accent-primary bg-cradle-accent-primary/10 text-cradle-accent-primary hover:bg-cradle-accent-primary/20 transition-colors text-sm px-4 py-1.5 flex items-center gap-1.5'
                            onClick={handleGenerate}
                            disabled={loading}
                        >
                            <span>{loading ? 'Generating...' : 'Generate'}</span>
                        </button>
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
                                    <button
                                        type='button'
                                        className='p-1.5 hover:bg-cradle-bg-secondary rounded-md text-cradle-text-secondary transition-colors'
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
                                    </button>
                                    <button
                                        type='button'
                                        className='p-1.5 hover:bg-cradle-bg-secondary rounded-md text-cradle-text-secondary transition-colors'
                                        onClick={handleCopy}
                                        title={copied ? 'Copied!' : 'Copy API key'}
                                    >
                                        <Copy className='w-4 h-4' />
                                    </button>
                                </div>
                                {copied && (
                                    <p className='text-xs text-green-500 mt-2 font-medium'>
                                        API key copied to clipboard!
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className='flex justify-end gap-2 mt-4 pt-3 cradle-border-t'>
                        <button
                            type='button'
                            className='rounded-lg border border-cradle-border-accent bg-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors text-cradle-text-secondary text-sm px-3 py-1.5 flex items-center gap-1.5'
                            onClick={closeModal}
                        >
                            <span>Close</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
