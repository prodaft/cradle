import { Card, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    return (
        <Card
            className='cursor-pointer hover:shadow-lg transition-shadow relative'
            onClick={onClick}
        >
            {depth != null && (
                <div className='absolute top-2 right-2 cradle-status cradle-status-info z-10'>
                    Depth: {depth}
                </div>
            )}
            <CardHeader>
                <CardTitle>
                    {subtype && <span className='text-text-muted-foreground mr-2'>{subtype}:</span>}
                    {name}
                </CardTitle>
                {actions.length > 0 && (
                    <CardAction>
                        {actions.map((action, index) => (
                            <Button
                                key={index}
                                variant='ghost'
                                size='icon-sm'
                                onClick={(e) => {
                                    e.stopPropagation();
                                    action.callback();
                                }}
                            >
                                {action.icon}
                            </Button>
                        ))}
                    </CardAction>
                )}
            </CardHeader>
        </Card>
    );
}
