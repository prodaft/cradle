import { ChangeEvent, Dispatch, SetStateAction } from 'react';

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
}: SearchFilterProps): JSX.Element {
  const updatePrevState = (prevState: string[], name: string, checked: boolean): string[] => {
    if (checked) {
      return [...prevState, name];
    } else {
      return prevState.filter((item) => item !== name);
    }
  };

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setFilters((prevFilters) => updatePrevState(prevFilters, name, checked));
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
