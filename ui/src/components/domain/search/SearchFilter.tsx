import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import * as React from 'react';

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
export default function SearchFilter({
    text,
    option,
    filters,
    setFilters,
}: SearchFilterProps) {
    const updatePrevState = (
        prevState: string[],
        name: string,
        checked: boolean,
    ): string[] => {
        if (checked) {
            return [...prevState, name];
        } else {
            return prevState.filter((item) => item !== name);
        }
    };

    const handleCheckboxChange = (checked: boolean) => {
        setFilters(updatePrevState(filters, option, checked));
    };

    const id = React.useId();

    return (
        <Field
            key={option}
            orientation='horizontal'
            className='w-36 items-center gap-3'
        >
            <Checkbox
                id={id}
                checked={filters.includes(option)}
                onCheckedChange={handleCheckboxChange}
            />
            <FieldLabel htmlFor={id} className='cursor-pointer text-muted-foreground'>
                {text}
            </FieldLabel>
        </Field>
    );
}
