import { PlusCircle } from 'iconoir-react';
import useFrontendSearch from '../../hooks/useFrontendSearch/useFrontendSearch';
import useAuth from '../../hooks/useAuth/useAuth';
import { useState, useMemo } from 'react';
import { naturalSort } from '../../utils/dashboardUtils/dashboardUtils';
/**
 * AdminPanelSection component - This component is used to display a section in the AdminPanel.
 * The section contains the following elements:
 * - Title
 * - Add button
 * - Search bar
 * - Children (cards)
 * The component will filter the children based on the search input.
 *
 * @function AdminPanelSection
 * @param {Object} props - The props object
 * @param {string} props.title - The title of the section
 * @param {boolean} props.addEnabled - Whether the add button is enabled
 * @param {string} props.addTooltipText - The tooltip text for the add button
 * @param {Function} props.handleAdd - The handler for the add button
 * @param {Array<React.ReactElement>} props.children - The children (cards) to display in the section
 * @param {boolean} props.isLoading - Whether the children are still loading (optional)
 * @returns {AdminPanelSection}
 * @constructor
 */
export default function AdminPanelSection({
    title,
    addEnabled,
    addTooltipText,
    handleAdd,
    children,
    isLoading = false,
}) {
    const [addedItems, setAddedItems] = useState([]);
    const combinedItems = useMemo(
        () => [...(children || []), ...addedItems],
        [children, addedItems],
    );
    const { searchVal, setSearchVal, filteredChildren } =
        useFrontendSearch(combinedItems);
    // Sort the filtered children based on their key property
    const sortedFilteredChildren = filteredChildren
        ? filteredChildren.sort((a, b) => {
              // Convert keys to strings to ensure proper lexicographical comparison
              const aKey = a.key?.toString() || '';
              const bKey = b.key?.toString() || '';
              return naturalSort(aKey, bKey);
          })
        : [];
    return (
        <div className='w-full h-full flex flex-col rounded-md px-3'>
            <div className='w-full flex flex-row items-center justify-between mb-2'>
                <input
                    type='text'
                    placeholder='Search'
                    className='input input-md input-block w-full'
                    onChange={(e) => setSearchVal(e.target.value)}
                />
                {addEnabled && (
                    <span
                        className='tooltip tooltip-bottom'
                        data-tooltip={addTooltipText}
                    >
                        <button
                            className='h-fit mx-2 pt-1'
                            onClick={() =>
                                handleAdd((x) => setAddedItems((prev) => [...prev, x]))
                            }
                        >
                            <PlusCircle />
                        </button>
                    </span>
                )}
            </div>
            <div className='w-full flex-grow overflow-y-auto flex flex-col space-y-2 gap-1 h-[80vh]'>
                {isLoading ? (
                    // Loading spinner
                    <div className='flex items-center justify-center min-h-[200px]'>
                        <div className='spinner-dot-pulse spinner-xl'>
                            <div className='spinner-pulse-dot'></div>
                        </div>
                    </div>
                ) : sortedFilteredChildren && sortedFilteredChildren.length > 0 ? (
                    sortedFilteredChildren
                ) : (
                    <div className='container mx-auto flex flex-col items-center'>
                        <p className='mt-6 !text-sm !font-normal text-zinc-500'>
                            No items found!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
