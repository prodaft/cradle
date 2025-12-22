import { NavArrowDown, NavArrowRight } from 'iconoir-react';
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
                    className='flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-cradle-accent-primary transition-colors'
                    onClick={toggle}
                >
                    {/* Arrow rotation */}
                    {isOpen ? (
                        <NavArrowDown width='16' height='16' />
                    ) : (
                        <NavArrowRight width='16' height='16' />
                    )}
                    <span>{label}</span>
                </button>
                {/* Extra button rendered only if both text and callback are provided */}
                {buttonText && onButtonClick && (
                    <button 
                        onClick={onButtonClick} 
                        className='text-xs px-2 py-1 rounded hover:bg-cradle-bg-elevated transition-colors'
                    >
                        {buttonText}
                    </button>
                )}
            </div>

            {/* Collapsible content */}
            {isOpen && <div className='mt-4'>{children}</div>}
        </div>
    );
}
