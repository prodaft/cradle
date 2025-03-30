// components/GraphQuery/GraphLegend.js
import React from 'react';

const GraphLegend = ({
    entryGraphColors,
    disabledTypes,
    toggleDisabledType,
    setDisabledTypes,
}) => {
    if (!entryGraphColors || Object.keys(entryGraphColors).length === 0) return null;
    return (
        <div className='px-12 pt-3'>
            <div className='grid grid-cols-4 gap-1 min-h-16 max-h-56 overflow-y-auto'>
                <span
                    title='Toggle visibility of all node types'
                    className='pl-6 w-fit py-0 underline cursor-pointer'
                    onClick={() => {
                        const allTypes = Object.keys(entryGraphColors);
                        const allDisabled = allTypes.every((type) =>
                            disabledTypes.has(type),
                        );
                        setDisabledTypes(allDisabled ? new Set() : new Set(allTypes));
                    }}
                >
                    {Object.keys(entryGraphColors).every((type) =>
                        disabledTypes.has(type),
                    )
                        ? 'Show All'
                        : 'Hide All'}
                </span>
                {Object.entries(entryGraphColors).map(([type, color]) => (
                    <div
                        key={type}
                        className={`flex flex-row items-center space-x-2 cursor-pointer ${
                            disabledTypes.has(type) ? 'opacity-50' : ''
                        }`}
                        onClick={() => toggleDisabledType(type)}
                    >
                        <div
                            className='w-4 h-4 rounded-full'
                            style={{ backgroundColor: color }}
                        ></div>
                        <span className={disabledTypes.has(type) ? 'line-through' : ''}>
                            {type}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GraphLegend;
