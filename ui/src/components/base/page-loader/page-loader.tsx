import { Spinner } from '@/components/ui/spinner';
import React from 'react';
import Logo from '../logo/logo';

export interface PageLoaderProps {
    /** Fill mode: 'screen' for full viewport, 'container' for flex child */
    fill?: 'screen' | 'container';
    /** Show logo above spinner */
    logo?: boolean;
    /** Optional loading message */
    text?: string | null;
}

/**
 * Shared page loading indicator for route loading and Suspense fallbacks.
 *
 * @example
 * ```tsx
 * <PageLoader />                          // Auth init, content area
 * <PageLoader fill="screen" logo />       // Initial app load
 * <PageLoader fill="container" />         // Suspense inside layout
 * ```
 */
export default function PageLoader({
    fill = 'screen',
    logo = false,
    text = null,
}: PageLoaderProps): React.JSX.Element {
    const heightClass = fill === 'screen' ? 'h-screen' : 'h-full min-h-0';

    return (
        <div
            className={`flex flex-col items-center justify-center text-center ${heightClass}`}
        >
            {(logo || text) && (
                <div className='mb-8 w-[370px]'>
                    {logo && <Logo text={true} />}
                    {text && <span className='text-2xl font-bold'>{text}</span>}
                </div>
            )}
            <Spinner className='size-10' />
        </div>
    );
}
