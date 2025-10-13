import React from 'react';

/**
 * Reusable TableCard component for consistent card styling
 */
function TableCard({
    children,
    className = '',
    compact = true,
    withDropdown = true,
    ...props
}) {
    const baseClasses = 'cradle-card';
    const compactClass = compact ? 'cradle-card-compact' : '';
    const dropdownClass = withDropdown ? 'cradle-card-with-dropdown' : '';
    
    const combinedClasses = [baseClasses, compactClass, dropdownClass, className]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={combinedClasses} {...props}>
            <div className='cradle-card-body p-3'>
                {children}
            </div>
        </div>
    );
}

export default TableCard;
