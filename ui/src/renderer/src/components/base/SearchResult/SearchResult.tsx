import React, { ReactNode } from 'react';
import Card from '../Card/Card';

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
    // Convert actions from old format to new Card format
    const cardActions = actions.map((action) => ({
        icon: action.icon,
        onClick: action.callback,
    }));

    return (
        <Card
            onClick={() => onClick({} as React.MouseEvent)}
            actions={cardActions}
            title={name}
            prefix={subtype ? `${subtype}:` : undefined}
            badge={depth != null ? `Depth: ${depth}` : undefined}
        />
    );
}
