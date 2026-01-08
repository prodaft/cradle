import React, { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';

/**
 * SearchFilter component props
 */
export interface SearchFilterProps {
    /** Display text for the filter */
    text: string;
    /** Value of the filter option */
    option: string;
    /** Current active filters */
    filters: string[];
    /** Function to update the filters */
    setFilters: Dispatch<SetStateAction<string[]>>;
}

/**
 * Single filter for search dialog
 * Manages the state of the filters passed as parameters
 *
 * @example
 * ```tsx
 * <SearchFilter
 *   text="Notes"
 *   option="note"
 *   filters={activeFilters}
 *   setFilters={setActiveFilters}
 * />
 * ```
 */
export default function SearchFilter({
    text,
    option,
    filters,
    setFilters,
}: SearchFilterProps): React.JSX.Element {
    const isActive = filters.includes(option);

    const toggleFilter = () => {
        setFilters((prevFilters) =>
            isActive
                ? prevFilters.filter((item) => item !== option)
                : [...prevFilters, option],
        );
    };

    return (
        <Button
            variant={isActive ? 'outline' : 'outline'}
            size='sm'
            onClick={toggleFilter}
            className={`
                px-2.5 py-1 text-xs font-mono transition-all duration-150
                ${
                    isActive
                        ? 'bg-cradle-accent-primary/15 text-cradle-accent-primary border-cradle-accent-primary/40'
                        : 'bg-transparent text-cradle-text-secondary border-cradle-border-primary hover:border-cradle-border-interactive hover:text-cradle-text-primary'
                }
            `}
        >
            {text}
        </Button>
    );
}
