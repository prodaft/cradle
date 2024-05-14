import React from "react";

/**
 * SidebarItem component - single button in the sidebar
 * @param icon - icon to display in the button
 * @param text - text to display in the button (not shown unless hovered)
 * @param handleClick - handler for the button
 * @returns {Element}
 * @constructor
 */
export default function SidebarItem({icon,text,handleClick}){
    return (
        <li className="menu-item p-4" onClick={handleClick}>
            {icon}
            <span className='hidden text-gray-9 group-hover/sidebar:block'>{text}</span>
        </li>
    );
}