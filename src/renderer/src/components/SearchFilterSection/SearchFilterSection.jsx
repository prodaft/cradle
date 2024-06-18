import { NavArrowDown, NavArrowUp } from 'iconoir-react';
import React from 'react';
import SearchFilter from '../SearchFilter/SearchFilter';
import {
    entityCategoriesReduced,
    entryTypes,
} from '../../utils/entityDefinitions/entityDefinitions';

/**
 * Section for filters in the search dialog
 * Contains filters for entity type and entry type
 * @param {boolean} showFilters - to show or hide the filters
 * @param {boolean => void} setShowFilters - function to toggle the filters
 * @param {Array<string>} entryTypeFilters - the current entry type filters
 * @param {(Array<string>) => void} setEntryTypeFilters - the function to update the entry type filters
 * @param {Array<string>} entityTypeFilters - the current entity type filters
 * @param {(Array<string>) => void} setEntityTypeFilters - the function to update the entity type filters
 * @returns {SearchFilterSection}
 * @constructor
 */
export default function SearchFilterSection({
    showFilters,
    setShowFilters,
    entryTypeFilters,
    setEntryTypeFilters,
    entityTypeFilters,
    setEntityTypeFilters,
}) {
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };
    return (
        <>
            <div
                className='flex items-center justify-start cursor-pointer'
                onClick={toggleFilters}
            >
                <div className='text-zinc-400 font-medium'>Filters</div>
                {showFilters ? (
                    <NavArrowUp
                        className='text-zinc-400'
                        height='1.5em'
                        width='1.5em'
                    />
                ) : (
                    <NavArrowDown
                        className='text-zinc-400'
                        height='1.5em'
                        width='1.5em'
                    />
                )}
            </div>
            <div
                className={`flex-shrink-0 overflow-x-hidden overflow-y-scroll no-scrollbar backdrop-blur-lg rounded-lg my-2 transition-all duration-300 ease-in-out ${showFilters ? 'h-48' : 'h-0 opacity-0'}`}
            >
                <div className='flex flex-col md:flex-row justify-start items-start space-y-4 md:space-y-0 md:space-x-4 p-4'>
                    <div className='w-auto flex flex-col'>
                        <div className='font-medium text-zinc-400'>Entity type</div>
                        <div className='flex flex-wrap'>
                            {Array.from(entityCategoriesReduced).map(
                                (entityType, index) => (
                                    <SearchFilter
                                        key={index}
                                        option={entityType}
                                        filters={entityTypeFilters}
                                        setFilters={setEntityTypeFilters}
                                    />
                                ),
                            )}
                        </div>
                    </div>
                    <div className='w-auto flex flex-col'>
                        <div className='font-medium text-zinc-400'>Entry type</div>
                        <div className='flex flex-wrap'>
                            {Array.from(entryTypes).map((entryType, index) => (
                                <SearchFilter
                                    key={index}
                                    option={entryType}
                                    filters={entryTypeFilters}
                                    setFilters={setEntryTypeFilters}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
