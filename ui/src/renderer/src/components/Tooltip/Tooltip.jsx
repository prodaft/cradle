import * as RadixTooltip from '@radix-ui/react-tooltip';
import { strip } from '../../utils/linkUtils/linkUtils';

/**
 * Tooltip component using Radix UI with customizable styling
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The trigger element
 * @param {React.ReactNode} props.content - The tooltip content
 * @param {'top' | 'bottom' | 'left' | 'right'} [props.side='bottom'] - Preferred side for tooltip
 * @param {'start' | 'center' | 'end'} [props.align='center'] - Alignment of tooltip
 * @param {'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'} [props.color='primary'] - Color scheme
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Size of tooltip
 * @param {string} [props.className=''] - Additional CSS classes for tooltip content
 * @param {number} [props.sideOffset=8] - Distance from trigger element
 * @param {boolean} [props.showArrow=true] - Whether to show arrow
 * @returns {JSX.Element}
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
}) => {
    content = strip(content || '');
    if (!content) return children;
    // Color variants
    const colorClasses = {
        primary: 'bg-primary text-white fill-primary',
        secondary: 'bg-secondary text-white fill-secondary',
        success: 'bg-success text-white fill-success',
        error: 'bg-error text-white fill-error',
        warning: 'bg-warning text-white fill-warning',
        info: 'bg-info text-white fill-info',
    };

    // Size variants
    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-3 text-base',
    };

    const colorClass = colorClasses[color] || colorClasses.primary;
    const sizeClass = sizeClasses[size] || sizeClasses.md;
    const [bgClass, textClass, fillClass] = colorClass.split(' ');

    return (
        <RadixTooltip.Root>
            <RadixTooltip.Trigger asChild>
                {children}
            </RadixTooltip.Trigger>
            <RadixTooltip.Portal>
                <RadixTooltip.Content
                    side={side}
                    align={align}
                    sideOffset={sideOffset}
                    className={`z-[99999] ${bgClass} ${textClass} ${sizeClass} rounded-lg shadow-lg ${className}`}
                    style={{ whiteSpace: 'pre-line' }}
                >
                    {content}
                    {showArrow && (
                        <RadixTooltip.Arrow className={fillClass} />
                    )}
                </RadixTooltip.Content>
            </RadixTooltip.Portal>
        </RadixTooltip.Root>
    );
};

/**
 * TooltipProvider component - wrap your app or component tree with this
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.delayDuration=100] - Global delay duration for all tooltips
 * @param {number} [props.skipDelayDuration=300] - Skip delay when moving between tooltips
 * @returns {JSX.Element}
 */
export const TooltipProvider = ({
    children,
    delayDuration = 100,
    skipDelayDuration = 300
}) => (
    <RadixTooltip.Provider
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
    >
        {children}
    </RadixTooltip.Provider>
);

export default Tooltip;
