import { Badge } from '@/components/ui/badge';
import React, { Dispatch, SetStateAction } from 'react';

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
    /** Color for the badge */
    color?: string;
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
    color,
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
        <Badge
            variant={isActive ? 'default' : 'outline'}
            onClick={toggleFilter}
            className='cursor-pointer mr-1.5 mb-1.5'
            style={
                color
                    ? { backgroundColor: color, borderColor: color, color: '#fff' }
                    : undefined
            }
        >
            {text}
        </Badge>
    );
}
