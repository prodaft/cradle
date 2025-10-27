import { Tooltip } from '@radix-ui/react-tooltip';
import { useState } from 'react';

/**
 * NavbarButton - a button in the navbar.
 *
 * @function NavbarButton
 * @param {Object} props - the props object
 * @param {any} props.icon - the icon to display in the button
 * @param {string} props.text - the tooltip text for the button
 * @param {Function} props.onClick - the handler for the button
 * @returns {NavbarButton}
 * @constructor
 */
export default function NavbarButton({
    onClick,
    text,
    icon,
    testid,
    tooltipDirection = 'bottom',
    awaitOnClick = false,
}) {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async (e) => {
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
                        className={'p-2 group flex items-center justify-center cradle-border hover:border-[#FF8C00]'}
                        style={{
                            color: 'var(--cradle-sidebar-icon)',
                            backgroundColor: 'transparent'
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
