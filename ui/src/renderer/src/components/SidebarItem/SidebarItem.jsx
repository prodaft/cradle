import React from 'react';
import { useLocation } from 'react-router-dom';
import Tooltip from '../Tooltip/Tooltip';

/**
 * SidebarItem component - single button in the sidebar
 *
 * @function SidebarItem
 * @param {Object} props - the props object
 * @param {React.Component} props.icon - icon to display in the button
 * @param {string} [props.text=''] - text to display in the button (not shown unless hovered)
 * @param {Function} props.handleClick - handler for the button
 * @param {string} [props.highlightedLocation=''] - the location to highlight. If the location is the same as the current location, the button is highlighted
 * @returns {SidebarItem}
 * @constructor
 */
export default function SidebarItem({
    icon,
    text = '',
    handleClick,
    highlightedLocation = '',
}) {
    const location = useLocation();
    const isHighlighted = location.pathname === highlightedLocation || 
        (highlightedLocation && location.pathname.startsWith(highlightedLocation + '/'));

    const itemStyle = isHighlighted
        ? { color: 'var(--cradle-accent-primary)' }
        : { color: 'var(--cradle-sidebar-icon)' };

    return (
        <Tooltip content={text} side='right'>
            <li
                className='px-4 py-0 cursor-pointer flex items-center justify-center z-50 relative  cradle-mono rounded-none'
                style={itemStyle}
                onClick={handleClick}
                data-active={isHighlighted}
            >
                <div className='icon flex items-center justify-center flex-shrink-0 py-4'>
                    {icon}
                </div>
            </li>
        </Tooltip>
    );
}
