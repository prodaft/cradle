import * as RadixTooltip from '@radix-ui/react-tooltip';
import { strip } from '@utils/links';
import { ReactNode } from 'react';

/**
 * Color scheme options for tooltip
 */
export type TooltipColor =
    | 'primary'
    | 'secondary'
    | 'success'
    | 'error'
    | 'warning'
    | 'info';

/**
 * Size options for tooltip
 */
export type TooltipSize = 'sm' | 'md' | 'lg';

/**
 * Side position for tooltip
 */
export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

/**
 * Alignment for tooltip
 */
export type TooltipAlign = 'start' | 'center' | 'end';

/**
 * Tooltip component props
 */
export interface TooltipProps {
    /** The trigger element */
    children: ReactNode;
    /** The tooltip content */
    content?: ReactNode;
    /** Preferred side for tooltip */
    side?: TooltipSide;
    /** Alignment of tooltip */
    align?: TooltipAlign;
    /** Color scheme */
    color?: TooltipColor;
    /** Size of tooltip */
    size?: TooltipSize;
    /** Additional CSS classes for tooltip content */
    className?: string;
    /** Distance from trigger element */
    sideOffset?: number;
    /** Whether to show arrow */
    showArrow?: boolean;
    /** Whether to use portal */
    usePortal?: boolean;
}

/**
 * TooltipProvider component props
 */
export interface TooltipProviderProps {
    /** Children components */
    children: ReactNode;
    /** Global delay duration for all tooltips */
    delayDuration?: number;
    /** Skip delay when moving between tooltips */
    skipDelayDuration?: number;
}

/**
 * Tooltip component using Radix UI with customizable styling
 *
 * @example
 * ```tsx
 * <Tooltip content="Click to edit" side="top" color="primary">
 *   <button>Edit</button>
 * </Tooltip>
 * ```
 */
const Tooltip = ({
    children,
    content,
    side = 'bottom',
    align = 'center',
    color = 'primary',
    size = 'md',
    className = '',
    sideOffset = 4,
    showArrow = true,
    usePortal = true,
}: TooltipProps): JSX.Element => {
    const strippedContent =
        typeof content === 'string' ? strip(content || '') : content;
    if (!strippedContent) return <>{children}</>;

    // Color variants
    const colorClasses: Record<TooltipColor, string> = {
        primary: 'bg-cradle-accent-primary text-white fill-primary',
        secondary: 'bg-cradle-accent-secondary text-white fill-secondary',
        success: 'bg-green-500 text-white fill-success',
        error: 'bg-red-500 text-white fill-error',
        warning: 'bg-yellow-500 text-white fill-warning',
        info: 'bg-blue-500 text-white fill-info',
    };

    // Size variants
    const sizeClasses: Record<TooltipSize, string> = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-3 text-base',
    };

    const colorClass = colorClasses[color] || colorClasses.primary;
    const sizeClass = sizeClasses[size] || sizeClasses.md;
    const [bgClass, textClass, fillClass] = colorClass.split(' ');

    return (
        <RadixTooltip.Root>
            <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
            {usePortal && <RadixTooltip.Portal>
                <RadixTooltip.Content
                    side={side}
                    align={align}
                    sideOffset={sideOffset}
                    className={`z-[99999] ${bgClass} ${textClass} ${sizeClass} rounded-lg shadow-lg ${className}`}
                    style={{ whiteSpace: 'pre-line' }}
                >
                    {strippedContent}
                    {showArrow && <RadixTooltip.Arrow className={fillClass} />}
                </RadixTooltip.Content>
            </RadixTooltip.Portal>}
        </RadixTooltip.Root>
    );
};

/**
 * TooltipProvider component - wrap your app or component tree with this
 *
 * @example
 * ```tsx
 * <TooltipProvider>
 *   <App />
 * </TooltipProvider>
 * ```
 */
export const TooltipProvider = ({
    children,
    delayDuration = 100,
    skipDelayDuration = 300,
}: TooltipProviderProps): JSX.Element => (
    <RadixTooltip.Provider
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
    >
        {children}
    </RadixTooltip.Provider>
);

export default Tooltip;
