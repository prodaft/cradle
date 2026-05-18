import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card';
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
    openDelay?: number;
    closeDelay?: number;
}

/**
 * PreviewTip component using Hover Card for rich content previews.
 * Designed for displaying JSX/HTML content on hover (e.g. note previews).
 */
const PreviewTip = ({
    children,
    content,
    side = 'bottom',
    align = 'start',
    size = 'lg',
    className = '',
    sideOffset = 4,
    openDelay = 400,
    closeDelay = 100,
}: PreviewTipProps) => {
    if (!content) return <>{children}</>;

    const sizeClasses: Record<Size, string> = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'p-0 text-base',
    };

    const sizeClass = sizeClasses[size] ?? sizeClasses.lg;

    return (
        <HoverCard openDelay={openDelay} closeDelay={closeDelay}>
            <HoverCardTrigger asChild>{children}</HoverCardTrigger>
            <HoverCardContent
                side={side}
                align={align}
                sideOffset={sideOffset}
                className={`z-[99999] w-[450px] max-w-[calc(100vw-2rem)] ${sizeClass} bg-popover rounded-lg shadow-2xl border border-border overflow-hidden ${className}`}
            >
                {content}
            </HoverCardContent>
        </HoverCard>
    );
};

export default PreviewTip;
