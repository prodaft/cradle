import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FunnelIcon, CaretDownIcon, CaretUpIcon, XIcon } from '@phosphor-icons/react';
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
    /** Map of subtype to color */
    entryClassColors: Map<string, string>;
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
    entryClassColors,
}: SearchFilterSectionProps): React.JSX.Element {
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    const hasFilters = entrySubtypeFilters.length > 0;

    return (
        <div className='border-b border-border'>
            {/* Filter Toggle Button */}
            <Button
                variant='ghost'
                onClick={toggleFilters}
                className='w-full px-4 py-2.5 flex items-center justify-between hover:bg-secondary group h-auto rounded-none'
            >
                <div className='flex items-center gap-2'>
                    <FunnelIcon className='size-4 text-muted-foreground group-hover:text-primary transition-colors' weight="bold" />
                    <span className='text-sm text-foreground font-medium'>
                        Filter by type
                    </span>
                    {hasFilters && (
                        <Badge variant='default'>{entrySubtypeFilters.length}</Badge>
                    )}
                </div>
                {showFilters ? (
                    <CaretUpIcon className='size-4 text-muted-foreground' weight="bold" />
                ) : (
                    <CaretDownIcon className='size-4 text-muted-foreground' weight="bold" />
                )}
            </Button>

            {/* Collapsible Filter Content */}
            <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    showFilters ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className='px-4 py-3 bg-secondary/50 overflow-y-auto max-h-56 flex flex-wrap gap-1.5 items-center'>
                    {[...entrySubtypes].sort((a, b) => a.localeCompare(b)).map((subtype) => {
                        const color = entryClassColors.get(subtype);
                        const isActive = entrySubtypeFilters.includes(subtype);
                        const toggleFilter = () => {
                            setEntrySubtypeFilters((prevFilters) =>
                                isActive
                                    ? prevFilters.filter((item) => item !== subtype)
                                    : [...prevFilters, subtype],
                            );
                        };
                        return (
                            <Badge
                                key={subtype}
                                variant='outline'
                                onClick={toggleFilter}
                                className={`cursor-pointer ${isActive ? '' : 'opacity-60'}`}
                                style={
                                    color && isActive
                                        ? {
                                            backgroundColor: color,
                                            borderColor: color,
                                            color: '#fff',
                                        }
                                        : undefined
                                }
                            >
                                {subtype}
                                {isActive && <XIcon className='size-3' />}
                            </Badge>
                        );
                    })}
                </div>
            </div>

            {/* Active Filters Display */}
            {hasFilters && (
                <div className='px-4 py-2 flex items-center gap-2 flex-wrap'>
                    <span className='text-xs text-muted-foreground uppercase tracking-wider'>
                        Active:
                    </span>
                    {entrySubtypeFilters.map((filter) => {
                        const color = entryClassColors.get(filter);
                        return (
                            <Badge
                                key={filter}
                                variant='outline'
                                onClick={() =>
                                    setEntrySubtypeFilters((prev) =>
                                        prev.filter((f) => f !== filter),
                                    )
                                }
                                className='cursor-pointer'
                                style={
                                    color
                                        ? {
                                            backgroundColor: color,
                                            borderColor: color,
                                            color: '#fff',
                                        }
                                        : undefined
                                }
                            >
                                {filter}
                                <XIcon className='size-3' weight='bold' />
                            </Badge>
                        );
                    })}
                    <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setEntrySubtypeFilters([])}
                        className='text-xs h-auto cursor-pointer'
                    >
                        Clear all
                    </Button>
                </div>
            )}
        </div>
    );
}
