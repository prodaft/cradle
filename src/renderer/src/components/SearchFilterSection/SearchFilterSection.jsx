import { NavArrowDown, NavArrowUp } from 'iconoir-react';
import React from 'react';
import SearchFilter from '../SearchFilter/SearchFilter';
import Collapsible from '../Collapsible/Collapsible';
import { SubtypeHierarchy } from '../../utils/dashboardUtils/dashboardUtils';

/**
 * Section for filters in the search dialog
 * Contains filters for entry type and artifact type
 *
 * @function SearchFilterSection
 * @param {Object} props - The props of the component.
 * @param {boolean} props.showFilters - to show or hide the filters
 * @param {StateSetter<boolean>} props.setShowFilters - function to toggle the filters
 * @param {Array<string>} props.entrySubtypes - the current entry subtype filters
 * @param {StateSetter<Array<string>>} props.setEntrySubtypeFilter - the function to update the entry subtype type filters
 * @returns {SearchFilterSection}
 * @constructor
 */
export default function SearchFilterSection({
    showFilters,
    setShowFilters,
    entrySubtypes,
    entrySubtypeFilters,
    setEntrySubtypeFilters,
}) {
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    const hierarchy = new SubtypeHierarchy(entrySubtypes);

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
                        <div className='flex flex-wrap'>
                            {hierarchy.convert(
                                (value, children) => (
                                    <Collapsible label={value} key={value}>
                                        <div className='w-auto flex flex-col'>
                                            <div className='flex flex-wrap'>
                                                {children}
                                            </div>
                                        </div>
                                    </Collapsible>
                                ),
                                (value, path) => (
                                    <SearchFilter
                                        key={value}
                                        text={value}
                                        option={`${path}${value}`}
                                        filters={entrySubtypeFilters}
                                        setFilters={setEntrySubtypeFilters}
                                    />
                                ),
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
