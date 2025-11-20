import { NavArrowDown, NavArrowUp } from 'iconoir-react';
import { Dispatch, SetStateAction } from 'react';
import { SubtypeHierarchy } from '@utils/dashboard';
import Collapsible from '@components/base/Collapsible/Collapsible';
import SearchFilter from '@components/forms/SearchFilter';

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
        className={`flex-shrink-0 overflow-x-hidden overflow-y-scroll no-scrollbar backdrop-blur-lg rounded-lg my-2 ${showFilters ? 'h-48' : 'h-0 opacity-0'}`}
      >
        <div className='flex flex-col md:flex-row justify-start items-start space-y-4 md:space-y-0 md:space-x-4 px-4'>
          <div className='w-auto flex flex-col'>
            <div className='flex flex-wrap text-zinc-300'>
              {hierarchy.convert(
                (value, children) => (
                  <Collapsible
                    className='text-zinc-300'
                    label={value}
                    key={value}
                  >
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
