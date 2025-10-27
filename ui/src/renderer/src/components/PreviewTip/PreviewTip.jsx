import * as RadixTooltip from '@radix-ui/react-tooltip';

/**
 * PreviewTip component using Radix UI for showing rich content previews
 * Designed specifically for displaying JSX/HTML content on hover
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The trigger element
 * @param {React.ReactNode} props.content - The preview content (supports JSX)
 * @param {'top' | 'bottom' | 'left' | 'right'} [props.side='bottom'] - Preferred side for tooltip
 * @param {'start' | 'center' | 'end'} [props.align='center'] - Alignment of tooltip
 * @param {'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'} [props.color='primary'] - Color scheme
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Size of tooltip
 * @param {string} [props.className=''] - Additional CSS classes for tooltip content
 * @param {number} [props.sideOffset=8] - Distance from trigger element
 * @param {boolean} [props.showArrow=true] - Whether to show arrow
 * @returns {JSX.Element}
 */
const PreviewTip = ({
  children,
  content,
  side = 'bottom',
  align = 'center',
  size = 'lg',
  className = '',
  sideOffset = 4,
}) => {
  // Don't render tooltip if no content
  if (!content) return children;

  // Size variants
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.lg;

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
          className={`z-[99999] ${sizeClass} bg-cradle3 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 ${className}`}
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
};

/**
 * PreviewTipProvider component - wrap your app or component tree with this
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.delayDuration=100] - Global delay duration for all tooltips
 * @param {number} [props.skipDelayDuration=300] - Skip delay when moving between tooltips
 * @returns {JSX.Element}
 */
export const PreviewTipProvider = ({
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

export default PreviewTip;

