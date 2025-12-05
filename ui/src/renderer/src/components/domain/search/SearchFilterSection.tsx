import Collapsible from '@components/base/Collapsible/Collapsible';
import SearchFilter from '@components/forms/SearchFilter';
import { SubtypeHierarchy } from '@utils/dashboard';
import { FilterList, NavArrowDown, NavArrowUp } from 'iconoir-react';
import { Dispatch, SetStateAction } from 'react';

/**
 * SearchFilterSection component props
 */
export interface SearchFilterSectionProps {
    /** Whether to show the filters */
    showFilters: boolean;
    /** Function to toggle the filters */
    setShowFilters: Dispatch<SetStateAction<boolean>>;
    /** Available entry subtypes */
    entrySubtypes: string[];
    /** Current entry subtype filters */
    entrySubtypeFilters: string[];
    /** Function to update the entry subtype filters */
    setEntrySubtypeFilters: Dispatch<SetStateAction<string[]>>;
}

/**
 * Section for filters in the search dialog
 * Contains collapsible filters for entry type organized by hierarchy
 *
 * @example
 * ```tsx
 * <SearchFilterSection
 *   showFilters={showFilters}
 *   setShowFilters={setShowFilters}
 *   entrySubtypes={['note', 'document', 'user']}
 *   entrySubtypeFilters={activeFilters}
 *   setEntrySubtypeFilters={setActiveFilters}
 * />
 * ```
 */
export default function SearchFilterSection({
    showFilters,
    setShowFilters,
    entrySubtypes,
    entrySubtypeFilters,
    setEntrySubtypeFilters,
}: SearchFilterSectionProps): JSX.Element {
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    const hierarchy = new SubtypeHierarchy(entrySubtypes);
    const hasFilters = entrySubtypeFilters.length > 0;

    return (
        <div className='cradle-border-b'>
            {/* Filter Toggle Button */}
            <button
                onClick={toggleFilters}
                className='w-full px-4 py-2.5 flex items-center justify-between hover:bg-cradle-bg-secondary transition-colors group'
            >
                <div className='flex items-center gap-2'>
                    <FilterList className='w-4 h-4 text-cradle-text-muted group-hover:text-cradle-accent-primary transition-colors' />
                    <span className='text-sm text-cradle-text-secondary font-medium'>
                        Filter by type
                    </span>
                    {hasFilters && (
                        <span className='px-1.5 py-0.5 text-[10px] bg-cradle-accent-primary text-white font-mono'>
                            {entrySubtypeFilters.length}
                        </span>
                    )}
                </div>
                {showFilters ? (
                    <NavArrowUp className='w-4 h-4 text-cradle-text-muted' />
                ) : (
                    <NavArrowDown className='w-4 h-4 text-cradle-text-muted' />
                )}
            </button>

            {/* Collapsible Filter Content */}
            <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    showFilters ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className='px-4 py-3 bg-cradle-bg-secondary/50 overflow-y-auto max-h-56'>
                    <div className='space-y-2'>
                        {hierarchy.convert(
                            (value, children) => (
                                <Collapsible
                                    className='text-cradle-text-secondary'
                                    label={value}
                                    key={value}
                                >
                                    <div className='pl-4 pt-2 flex flex-wrap gap-1.5'>
                                        {children}
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
    );
}
