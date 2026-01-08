import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import SearchFilter from '@components/forms/SearchFilter';
import { SubtypeHierarchy } from '@utils/dashboard';
import { FilterList, NavArrowDown, NavArrowUp, NavArrowRight } from 'iconoir-react';
import React, { Dispatch, SetStateAction } from 'react';

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
}: SearchFilterSectionProps): React.JSX.Element {
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    const hierarchy = new SubtypeHierarchy(entrySubtypes);
    const hasFilters = entrySubtypeFilters.length > 0;

    return (
        <div className='border-border-b'>
            {/* Filter Toggle Button */}
            <Button
                variant='ghost'
                onClick={toggleFilters}
                className='w-full px-4 py-2.5 flex items-center justify-between hover:bg-bg-secondary group h-auto'
            >
                <div className='flex items-center gap-2'>
                    <FilterList className='w-4 h-4 text-text-muted-foreground group-hover:text-border-primary transition-colors' />
                    <span className='text-sm text-text-foreground font-medium'>
                        Filter by type
                    </span>
                    {hasFilters && (
                        <span className='px-1.5 py-0.5 text-[10px] bg-border-primary text-white font-mono'>
                            {entrySubtypeFilters.length}
                        </span>
                    )}
                </div>
                {showFilters ? (
                    <NavArrowUp className='w-4 h-4 text-text-muted-foreground' />
                ) : (
                    <NavArrowDown className='w-4 h-4 text-text-muted-foreground' />
                )}
            </Button>

            {/* Collapsible Filter Content */}
            <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    showFilters ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className='px-4 py-3 bg-bg-secondary/50 overflow-y-auto max-h-56'>
                    <div className='space-y-2'>
                        {hierarchy.convert(
                            (value, children) => (
                                <Collapsible key={value} className='text-text-foreground'>
                                    <CollapsibleTrigger asChild>
                                        <Button variant='ghost' size='sm' className='group flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-border-primary'>
                                            <NavArrowRight className='w-4 h-4 group-data-[state=open]:hidden' />
                                            <NavArrowDown className='w-4 h-4 hidden group-data-[state=open]:block' />
                                            <span>{value}</span>
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <div className='pl-4 pt-2 flex flex-wrap gap-1.5'>
                                            {children}
                                        </div>
                                    </CollapsibleContent>
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
