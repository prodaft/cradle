import React, { ReactNode } from 'react';

/**
 * Action button configuration for Card component
 */
export interface CardAction {
  /** Icon element to display */
  icon: ReactNode;
  /** Click handler for the action */
  onClick: () => void;
  /** Tooltip text for the action button */
  tooltip?: string;
  /** Whether to show this action (defaults to true) */
  show?: boolean;
}

/**
 * Card component props
 */
export interface CardProps {
  /** Card title */
  title?: string;
  /** Prefix to the title with darker color */
  prefix?: string;
  /** Action buttons to display next to title */
  actions?: CardAction[];
  /** Badge text displayed on top right */
  badge?: string;
  /** Custom CSS classes for badge */
  badgeClass?: string;
  /** Key-value pairs to display as details list */
  details?: Record<string, string>;
  /** Small text at bottom left (e.g., ID) */
  slug?: string;
  /** Content to render under details */
  children?: ReactNode;
  /** Optional click handler for the entire card */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Custom padding classes */
  padding?: string;
  /** Controls visibility of the card */
  visible?: boolean;
}

/**
 * Card component - A reusable wrapper component that provides consistent styling
 * and built-in support for common card elements.
 *
 * @example
 * ```tsx
 * <Card
 *   title="User Profile"
 *   prefix="Account:"
 *   badge="Active"
 *   details={{ Email: 'user@example.com', Role: 'Admin' }}
 *   actions={[
 *     { icon: <EditIcon />, onClick: handleEdit, tooltip: 'Edit' },
 *     { icon: <DeleteIcon />, onClick: handleDelete, tooltip: 'Delete' }
 *   ]}
 * >
 *   <p>Card content here</p>
 * </Card>
 * ```
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
}: CardProps): JSX.Element | null {
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
      {children && (
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
