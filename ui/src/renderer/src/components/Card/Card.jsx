import React from 'react';

/**
 * Card component - A reusable wrapper component that provides consistent styling
 * and built-in support for common card elements.
 *
 * @function Card
 * @param {Object} props - The props object
 * @param {string} [props.title] - Card title
 * @param {string} [props.prefix] - Prefix to the title with darker color
 * @param {Array<{icon: React.ReactNode, onClick: Function, tooltip?: string, show?: boolean}>} [props.actions] - Action buttons to display next to title
 * @param {string} [props.badge] - Badge text displayed on top right
 * @param {string} [props.badgeClass] - Custom CSS classes for badge
 * @param {Object<string, string>} [props.details] - Key-value pairs to display as details list
 * @param {string} [props.slug] - Small text at bottom left (e.g., ID)
 * @param {React.ReactNode} [props.children] - Content to render under details
 * @param {Function} [props.onClick] - Optional click handler for the entire card
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.padding] - Custom padding classes
 * @param {boolean} [props.visible=true] - Controls visibility of the card
 * @returns {Card}
 * @constructor
 */
export default function Card({
    title,
    prefix,
    actions = [],
    badge,
    badgeClass = '',
    details,
    slug,
    children,
    onClick,
    className = '',
    visible = true,
}) {
    if (!visible) return null;

    // Filter actions based on 'show' property (defaults to true if not specified)
    const visibleActions = actions.filter(action => action.show !== false);
    const baseClasses = 'px-1 pb-1 rounded-lg transition-colors duration-200 flex items-center justify-center w-7 h-7';

    return (
        <div
            className={`card-container p-2 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''} ${className}`}
            onClick={onClick}
        >
            {/* Badge on top right */}
            {badge && (
                <div className={`absolute top-2 right-2 badge ${badgeClass}`}>
                    {badge}
                </div>
            )}

            {/* Title section with prefix and actions */}
            {title && (
                <div className={`card-header flex items-center justify-between ${(details || children) ? 'mb-2 border-b-1' : ''}`}>
                    <h2 className='card-title mx-2 px-1 break-all'>
                        {prefix && (
                            <span className='text-zinc-500'>{prefix}</span>
                        )}
                        <span>{title}</span>
                    </h2>

                    {/* Action buttons next to title */}
                    {visibleActions.length > 0 && (
                        <div
                            className='flex gap-1 flex-shrink-0'
                            onClick={(e) => e.stopPropagation()} // Prevent card onClick from firing
                        >
                            {visibleActions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={action.onClick}
                                    className={baseClasses}
                                    title={action.tooltip}
                                    aria-label={action.tooltip}
                                >
                                    {action.icon}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!title && visibleActions.length > 0 && (
                <div className='flex items-center justify-between mb-2'>
                    <div
                        className='flex gap-1 flex-shrink-0'
                        onClick={(e) => e.stopPropagation()} // Prevent card onClick from firing
                    >
                        {visibleActions.map((action, index) => (
                            <button
                                key={index}
                                onClick={action.onClick}
                                className={baseClasses}
                                title={action.tooltip}
                                aria-label={action.tooltip}
                            >
                                {action.icon}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Details list */}
            {details && Object.keys(details).length > 0 && (
                <div className='text-gray-700 dark:text-gray-300 text-sm space-y-1 mx-2'>
                    {Object.entries(details).map(([key, value]) => (
                        <div key={key} className='items-start gap-2'>
                            <strong className='text-cradle2'>{key}:</strong>{value}
                        </div>
                    ))}
                </div>
            )}

            {/* Children content */}
            {children && children.length > 0 && children.some(child => child) && (
                <div className={details ? 'mt-3' : ''}>
                    {children}
                </div>
            )}

            {/* Slug at bottom left */}
            {slug && (
                <div className='text-[10px] text-gray-400 dark:text-gray-600 select-text mt-2'>
                    {slug}
                </div>
            )}
        </div>
    );
}
