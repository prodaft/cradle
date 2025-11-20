import { ArrowDown, ArrowRight } from 'iconoir-react';
import { ReactNode, useState } from 'react';

/**
 * Collapsible component props
 */
export interface CollapsibleProps {
  /** Label text for the collapsible section */
  label: string;
  /** Content to show/hide */
  children: ReactNode;
  /** Callback when collapse state changes */
  onChangeCollapse?: ((isOpen: boolean) => void) | null;
  /** Initial open state */
  open?: boolean;
  /** Optional button text to show next to label */
  buttonText?: string | null;
  /** Optional button click handler */
  onButtonClick?: (() => void) | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Collapsible component - Toggleable section with arrow indicator
 *
 * @example
 * ```tsx
 * <Collapsible label="Advanced Options" open={true}>
 *   <div>Hidden content here</div>
 * </Collapsible>
 * ```
 */
export default function Collapsible({
  label,
  children,
  onChangeCollapse = null,
  open = false,
  buttonText = null,
  onButtonClick = null,
  className = '',
}: CollapsibleProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(open);

  const toggle = () => {
    if (onChangeCollapse) {
      onChangeCollapse(!isOpen);
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header with toggle and optional extra button */}
      <div className='flex justify-between items-center'>
        <button
          className='flex items-center text-left dark:text-zinc-300'
          onClick={toggle}
        >
          {/* Arrow rotation */}
          {isOpen ? (
            <ArrowDown />
          ) : (
            <ArrowRight />
          )}
          {label}
        </button>
        {/* Extra button rendered only if both text and callback are provided */}
        {buttonText && onButtonClick && (
          <button onClick={onButtonClick} className='ml-4'>
            {buttonText}
          </button>
        )}
      </div>

      {/* Underline */}
      <div className='border-b border-zinc-700 mx-3' />

      {/* Collapsible content */}
      {isOpen && <div className='pl-3 pt-1'>{children}</div>}
    </div>
  );
}
