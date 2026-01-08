import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import React, { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

/**
 * NavbarButton component props
 */
export interface NavbarButtonProps {
    /** Icon to display in the button */
    icon: ReactNode;
    /** Tooltip text for the button */
    text?: string;
    /** Click handler for the button */
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
    /** Test ID for testing */
    testid?: string;
    /** Tooltip direction */
    tooltipDirection?: 'top' | 'bottom' | 'left' | 'right';
    /** Whether to await the onClick handler */
    awaitOnClick?: boolean;
}

/**
 * NavbarButton - a button in the navbar with icon and optional tooltip
 *
 * @example
 * ```tsx
 * <NavbarButton
 *   icon={<SearchIcon />}
 *   text="Search"
 *   onClick={handleSearch}
 *   awaitOnClick={true}
 * />
 * ```
 */
export default function NavbarButton({
    onClick,
    text,
    icon,
    testid,
    tooltipDirection = 'bottom',
    awaitOnClick = false,
}: NavbarButtonProps): React.JSX.Element {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (awaitOnClick) {
            setIsLoading(true);
            await onClick(e);
            setIsLoading(false);
        } else {
            onClick(e);
        }
    };

    return (
        <>
            {isLoading ? (
                <Spinner className='size-3' />
            ) : (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant='ghost'
                            size='icon'
                            onClick={handleClick}
                            data-testid={testid || ''}
                        >
                            {icon}
                        </Button>
                    </TooltipTrigger>
                    {text && (
                        <TooltipContent side={tooltipDirection}>
                            {text}
                        </TooltipContent>
                    )}
                </Tooltip>
            )}
        </>
    );
}
