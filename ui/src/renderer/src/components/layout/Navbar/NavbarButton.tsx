import Tooltip from '@components/base/Tooltip/Tooltip';
import { ReactNode, useState } from 'react';

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
}: NavbarButtonProps): JSX.Element {
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
                <div className='spinner-dot-pulse spinner-sm'>
                    <div className='spinner-pulse-dot'></div>
                </div>
            ) : (
                <Tooltip content={text}>
                    <button
                        className={
                            'p-2 group flex items-center justify-center cradle-border hover:border-[#FF8C00]'
                        }
                        style={{
                            color: 'var(--cradle-sidebar-icon)',
                            backgroundColor: 'transparent',
                        }}
                        onClick={handleClick}
                        data-testid={testid || ''}
                    >
                        {icon}
                    </button>
                </Tooltip>
            )}
        </>
    );
}
