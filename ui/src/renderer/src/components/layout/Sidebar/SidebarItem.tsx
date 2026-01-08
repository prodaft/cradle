import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SidebarItem component props
 */
export interface SidebarItemProps {
    /** Icon to display in the button */
    icon: ReactNode;
    /** Text to display (shown in tooltip on hover) */
    text?: string;
    /** Click handler for the button */
    handleClick: (e: React.MouseEvent<HTMLLIElement>) => void;
    /** Location to highlight - if matches current location, button is highlighted */
    highlightedLocation?: string;
}

/**
 * SidebarItem component - single button in the sidebar
 *
 * Automatically highlights when the current route matches the highlightedLocation.
 *
 * @example
 * ```tsx
 * <SidebarItem
 *   icon={<NotesIcon />}
 *   text="Notes"
 *   handleClick={navigateToNotes}
 *   highlightedLocation="/notes"
 * />
 * ```
 */
export default function SidebarItem({
    icon,
    text = '',
    handleClick,
    highlightedLocation = '',
}: SidebarItemProps): JSX.Element {
    const location = useLocation();
    const isHighlighted =
        location.pathname === highlightedLocation ||
        (highlightedLocation &&
            location.pathname.startsWith(highlightedLocation + '/'));

    const itemStyle = isHighlighted
        ? { color: 'var(--color-primary)' }
        : { color: 'var(--color-muted-foreground)' };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <li
                    className='px-4 py-0 cursor-pointer flex items-center justify-center z-50 relative cradle-mono rounded-none'
                    style={itemStyle}
                    onClick={handleClick}
                    data-active={isHighlighted}
                >
                    <div className='icon flex items-center justify-center flex-shrink-0 py-4'>
                        {icon}
                    </div>
                </li>
            </TooltipTrigger>
            {text && (
                <TooltipContent side='right'>
                    {text}
                </TooltipContent>
            )}
        </Tooltip>
    );
}
