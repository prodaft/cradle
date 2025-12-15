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
        <div className='w-full min-w-[28rem]'>
            {/* Header */}
            <div className='flex items-end justify-between mb-6'>
                <h2 className='text-xl font-semibold cradle-text-primary cradle-mono'>
                    Generate API Key
                </h2>
            </div>

            {!apiKey ? (
                <>
                    {/* Warning Section */}
                    <div className='mb-6 p-4 cradle-border cradle-bg-secondary'>
                        <div className='flex items-start gap-3'>
                            <div className='cradle-status-light cradle-status-warning mt-1 flex-shrink-0'></div>
                            <div>
                                <h3 className='text-sm font-semibold cradle-text-primary cradle-mono mb-1'>
                                    Important Notice
                                </h3>
                                <p className='text-xs cradle-text-tertiary cradle-mono leading-relaxed'>
                                    Generating a new API key will invalidate your
                                    current key. Any applications using the old key will
                                    stop working.
                                </p>
                            </div>
                        </div>
                    </div>

                    <AlertBox alert={alert} />

                    <div className='cradle-border-t pt-4 mt-5'>
                        <div className='flex justify-end gap-2'>
                            <button
                                type='button'
                                className='rounded-full border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary text-sm px-3 py-1.5 flex items-center gap-1.5'
                                onClick={closeModal}
                                disabled={loading}
                            >
                                <span>Cancel</span>
                            </button>
                            <button
                                type='button'
                                className='rounded-full border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-accent-primary hover:bg-cradle-accent-primary/10 text-sm px-3 py-1.5 flex items-center gap-1.5'
                                onClick={handleGenerate}
                                disabled={loading}
                            >
                                <span>{loading ? 'Generating...' : 'Generate'}</span>
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Success Section */}
                    <div className='mb-6 p-4 cradle-border cradle-bg-secondary'>
                        <div className='flex items-start gap-3'>
                            <div className='cradle-status-light cradle-status-success mt-1 flex-shrink-0'></div>
                            <div className='flex-1'>
                                <h3 className='text-sm font-semibold cradle-text-primary cradle-mono mb-1'>
                                    API Key Generated
                                </h3>
                                <p className='text-xs cradle-text-tertiary cradle-mono mb-3'>
                                    Copy this key now. For security reasons, you won't
                                    be able to see it again.
                                </p>

                                {/* API Key Display */}
                                <div className='flex items-center gap-2 cradle-bg-primary p-3 cradle-border'>
                                    <code className='flex-1 cradle-mono text-sm cradle-text-primary select-all break-all'>
                                        {showApiKey ? apiKey : maskApiKey(apiKey)}
                                    </code>
                                    <button
                                        type='button'
                                        className='cradle-btn cradle-btn-ghost p-2 flex-shrink-0'
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
                                        className='cradle-btn cradle-btn-ghost p-2 flex-shrink-0'
                                        onClick={handleCopy}
                                        title={copied ? 'Copied!' : 'Copy API key'}
                                    >
                                        <Copy className='w-4 h-4' />
                                    </button>
                                </div>
                                {copied && (
                                    <p className='text-xs cradle-status-success mt-2'>
                                        API key copied to clipboard!
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className='cradle-border-t pt-4 mt-5'>
                        <div className='flex justify-end gap-2'>
                            <button
                                type='button'
                                className='rounded-full border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary text-sm px-3 py-1.5 flex items-center gap-1.5'
                                onClick={closeModal}
                            >
                                <span>Close</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
