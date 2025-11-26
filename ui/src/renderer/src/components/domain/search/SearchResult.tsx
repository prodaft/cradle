import Card from '@components/base/Card/Card';
import { ReactNode } from 'react';

interface Action {
    icon: ReactNode;
    callback: () => void;
}

interface SearchResultProps {
    name: string;
    onClick: () => void;
    type: string;
    subtype?: string;
    actions?: Action[];
    depth?: number;
}

/**
 * Component to show search results
 *
 * @function SearchResult
 * @param {SearchResultProps} props - The props of the component.
 * @returns {SearchResult}
 * @constructor
 */
export default function SearchResult({
    name,
    onClick,
    type,
    subtype,
    actions = [],
    depth,
}: SearchResultProps) {
    // Convert actions from old format to new Card format
    const cardActions = actions.map((action) => ({
        icon: action.icon,
        onClick: action.callback,
    }));

    return (
        <Card
            onClick={onClick}
            actions={cardActions}
            title={name}
            prefix={subtype ? `${subtype}:` : undefined}
            badge={depth != null ? `Depth: ${depth}` : undefined}
        />
    );
}
