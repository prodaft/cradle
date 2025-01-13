import { NavArrowDown, NavArrowUp } from 'iconoir-react';
import React from 'react';
import SearchFilter from '../SearchFilter/SearchFilter';
import Collapsible from '../Collapsible/Collapsible';

class SubtypeHierarchy {
    constructor(paths) {
        this.tree = {};

        for (let path of paths) {
            path.split('/').reduce((acc, cur) => {
                if (!acc[cur]) {
                    acc[cur] = {};
                }
                return acc[cur];
            }, this.tree);
        }
    }

    convert(node_callback, leaf_callback) {
        const traverse = (value, children, path) => {
            if (Object.keys(children).length === 0) {
                // Leaf node
                return leaf_callback(value, path);
            }

            // Internal node
            const childResults = [];

            // Sort children by depth before traversing
            const sortedKeys = Object.keys(children).sort(
                (a, b) => this.getDepth(children[a]) - this.getDepth(children[b]),
            );

            for (const key of sortedKeys) {
                childResults.push(traverse(key, children[key], path + value + '/'));
            }

            return node_callback(value, childResults);
        };

        const sortedKeys = Object.keys(this.tree).sort(
            (a, b) => this.getDepth(this.tree[a]) - this.getDepth(this.tree[b]),
        );

        return sortedKeys.map((key) => traverse(key, this.tree[key], ''));
    }

    // Helper to calculate depth of a subtree
    getDepth(node) {
        if (Object.keys(node).length === 0) {
            return 0; // Leaf node
        }
        return (
            1 + Math.max(...Object.values(node).map((child) => this.getDepth(child)))
        );
    }
}

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
