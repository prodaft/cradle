import React from 'react';

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
    return (
        <div
            className='relative h-fit w-full bg-cradle3 px-3 py-6 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl cursor-pointer my-3 flex items-center'
            onClick={onClick}
        >
            <div className='flex-grow'>
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
            </div>
            {actions.length > 0 && (
                <div className='flex space-x-2 ml-4'>
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent triggering parent onClick
                                action.callback();
                            }}
                            className='text-white hover:bg-white/20 p-2 rounded-full '
                        >
                            {action.icon}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
