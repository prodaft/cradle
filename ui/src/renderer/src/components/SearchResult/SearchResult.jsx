import React from 'react';
import Card from '../Card/Card';

/**
 * Component to show search results
 *
 * @function SearchResult
 * @param {Object} props - The props of the component.
 * @param {string} props.name - the name of the search result
 * @param {Function} props.onClick - the function to call when the result is clicked
 * @param {string} props.type - the type of the search result
 * @param {string} [props.subtype] - the subtype of the search result (Not shown if not provided)
 * @param {Array<{icon: React.ReactNode, callback: Function}>} [props.actions] - Optional list of action buttons
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
}) {
    // Convert actions from old format to new Card format
    const cardActions = actions.map(action => ({
        icon: action.icon,
        onClick: action.callback,
    }));

    return (
        <Card
            onClick={onClick}
            actions={cardActions}
            actionsPosition="top-right"
            className="bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg my-3"
            padding="px-3 py-6"
        >
            <div className='flex items-center'>
                {depth != null && (
                    <span className='badge ml-2'>Depth: {depth}</span>
                )}
                <h2 className='card-header text-white mx-2'>{name}</h2>
            </div>
            <p className='text-zinc-300 mx-2'>
                {type}
                {subtype ? `: ${subtype}` : ''}
            </p>
        </Card>
    );
}
