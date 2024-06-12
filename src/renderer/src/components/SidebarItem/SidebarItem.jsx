import React from 'react';

/**
 * SidebarItem component - single button in the sidebar
 * @param icon - icon to display in the button
 * @param text - text to display in the button (not shown unless hovered)
 * @param handleClick - handler for the button
 * @returns {SidebarItem}
 * @constructor
 */
export default function SidebarItem({ icon, text, handleClick }) {
    return (
        <li
            className='menu-item p-4 cursor-pointer group-hover/sidebar:flex items-center'
            onClick={handleClick}
        >
            <div className='icon flex-shrink-0'>{icon}</div>
            <div className='hidden whitespace-nowrap ml-2 group-hover/sidebar:block'>
                {text}
            </div>
        </li>
    );
}
