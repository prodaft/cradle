import { ChangeEvent } from 'react';

interface SearchFilterProps {
    text: string;
    option: string;
    filters: string[];
    setFilters: (filters: string[]) => void;
}

/**
 * Single filter for search dialog
 * Manages the state of the filters passed as parameters
 *
 * @function SearchFilter
 * @param {SearchFilterProps} props - The props of the component.
 * @returns {SearchFilter}
 * @constructor
 */
export default function SearchFilter({ text, option, filters, setFilters }: SearchFilterProps) {
    const updatePrevState = (prevState: string[], name: string, checked: boolean): string[] => {
        if (checked) {
            return [...prevState, name];
        } else {
            return prevState.filter((item) => item !== name);
        }
    };

    const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = event.target;
        setFilters(updatePrevState(filters, name, checked));
    };

    return (
        <label key={option} className='flex items-center space-x-3 w-36'>
            <input
                type='checkbox'
                className='cradle-checkbox'
                name={option}
                checked={filters.includes(option)}
                onChange={handleCheckboxChange}
            />
            <span className='text-zinc-300'>{text}</span>
        </label>
    );
}
