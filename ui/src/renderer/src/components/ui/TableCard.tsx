import React, { ReactNode, HTMLAttributes } from 'react';

/**
 * TableCard component props
 */
export interface TableCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to use compact styling */
  compact?: boolean;
  /** Whether the card will contain a dropdown */
  withDropdown?: boolean;
}

/**
 * Reusable TableCard component for consistent card styling
 *
 * @example
 * ```tsx
 * <TableCard compact withDropdown>
 *   <table>...</table>
 * </TableCard>
 * ```
 */
export default function TableCard({
  children,
  className = '',
  compact = true,
  withDropdown = true,
  ...props
}: TableCardProps): JSX.Element {
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
