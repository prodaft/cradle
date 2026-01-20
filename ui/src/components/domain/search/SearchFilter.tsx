import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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

    return (
        <Label key={option} className='flex items-center space-x-3 w-36'>
            <Checkbox
                checked={filters.includes(option)}
                onCheckedChange={handleCheckboxChange}
            />
            <span className='text-muted-foreground'>{text}</span>
        </Label>
    );
}
