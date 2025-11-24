import React, { ReactNode } from 'react';

interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
    compact?: boolean;
    withDropdown?: boolean;
}

/**
 * Reusable TableCard component for consistent card styling
 */
function Box({
    children,
    className = '',
    compact = true,
    withDropdown = true,
    ...props
}: BoxProps) {
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

export default Box;
