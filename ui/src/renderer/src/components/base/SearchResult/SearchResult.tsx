import { NavArrowRight } from 'iconoir-react';
import React, { ReactNode } from 'react';

/**
 * Action for search result
 */
export interface SearchResultAction {
    /** Icon element */
    icon: ReactNode;
    /** Action callback */
    callback: () => void;
}

/**
 * SearchResult component props
 */
export interface SearchResultProps {
    /** Name of the search result */
    name: string;
    /** Click handler for the result */
    onClick: (e: React.MouseEvent) => void;
    /** Type of the search result */
    type: string;
    /** Subtype of the search result */
    subtype?: string;
    /** Optional list of action buttons */
    actions?: SearchResultAction[];
    /** Depth indicator for nested results */
    depth?: number;
}

/**
 * Component to show search results
 *
 * @example
 * ```tsx
 * <SearchResult
 *   name="Example Note"
 *   type="note"
 *   subtype="document"
 *   onClick={handleClick}
 *   actions={[
 *     { icon: <EditIcon />, callback: handleEdit },
 *     { icon: <DeleteIcon />, callback: handleDelete }
 *   ]}
 * />
 * ```
 */
export default function SearchResult({
    name,
    onClick,
    type: _type,
    subtype,
    actions = [],
    depth,
}: SearchResultProps): JSX.Element {
    return (
        <button
            onClick={onClick}
            className='w-full px-4 py-3 flex items-center gap-3 text-left cursor-pointer group'
        >
            {/* Type indicator */}
            {subtype && (
                <span className='text-[10px] font-mono uppercase tracking-wider text-cradle-text-muted px-1.5 py-0.5 bg-cradle-bg-secondary border border-cradle-border-primary min-w-[60px] text-center'>
                    {subtype}
                </span>
            )}

            {/* Name */}
            <span className='flex-1 text-sm text-cradle-text-primary truncate group-hover:text-cradle-accent-primary transition-colors'>
                {name}
            </span>

            {/* Depth badge */}
            {depth != null && (
                <span className='text-[10px] font-mono text-cradle-text-muted'>
                    depth:{depth}
                </span>
            )}

            {/* Actions */}
            {actions.length > 0 && (
                <div
                    className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'
                    onClick={(e) => e.stopPropagation()}
                >
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            onClick={action.callback}
                            className='p-1 hover:bg-cradle-bg-secondary transition-colors'
                        >
                            {action.icon}
                        </button>
                    ))}
                </div>
            )}

            {/* Arrow indicator */}
            <NavArrowRight className='w-4 h-4 text-cradle-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all' />
        </button>
    );
}
