import * as RadixTooltip from '@radix-ui/react-tooltip';
import { ReactNode } from 'react';

type Side = 'top' | 'bottom' | 'left' | 'right';
type Align = 'start' | 'center' | 'end';
type Size = 'sm' | 'md' | 'lg';

interface PreviewTipProps {
    children: ReactNode;
    content: ReactNode;
    side?: Side;
    align?: Align;
    size?: Size;
    className?: string;
    sideOffset?: number;
}

/**
 * PreviewTip component using Radix UI for showing rich content previews
 * Designed specifically for displaying JSX/HTML content on hover
 */
const PreviewTip = ({
    children,
    content,
    side = 'bottom',
    align = 'center',
    size = 'lg',
    className = '',
    sideOffset = 4,
}: PreviewTipProps) => {
    // Don't render tooltip if no content
    if (!content) return children;

    // Size variants
    const sizeClasses: Record<Size, string> = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-3 text-base',
    };

    const sizeClass = sizeClasses[size] || sizeClasses.lg;

    return (
        <RadixTooltip.Root>
            <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
            <RadixTooltip.Portal>
                <RadixTooltip.Content
                    side={side}
                    align={align}
                    sideOffset={sideOffset}
                    className={`z-[99999] ${sizeClass} bg-popover rounded-lg shadow-2xl border border-border ${className}`}
                >
                    {content}
                </RadixTooltip.Content>
            </RadixTooltip.Portal>
        </RadixTooltip.Root>
    );
};

interface PreviewTipProviderProps {
    children: ReactNode;
    delayDuration?: number;
    skipDelayDuration?: number;
}

/**
 * PreviewTipProvider component - wrap your app or component tree with this
 */
export const PreviewTipProvider = ({
    children,
    delayDuration = 100,
    skipDelayDuration = 300,
}: PreviewTipProviderProps) => (
    <RadixTooltip.Provider
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
    >
        {children}
    </RadixTooltip.Provider>
);

export default PreviewTip;
