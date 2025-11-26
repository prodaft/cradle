import useFrontendSearch from '@/hooks/search/useFrontendSearch';
import { naturalSort } from '@/utils/dashboard';
import Tooltip from '@components/base/Tooltip/Tooltip';
import { PlusCircle } from 'iconoir-react';
import { ReactElement, useMemo, useState } from 'react';

interface AdminPanelSectionProps {
    title: string;
    addEnabled: boolean;
    addTooltipText: string;
    handleAdd: (addItemCallback: (item: ReactElement) => void) => void;
    children: ReactElement[] | null;
    isLoading?: boolean;
}

/**
 * AdminPanelSection component - This component is used to display a section in the AdminPanel.
 * The section contains the following elements:
 * - Title
 * - Add button
 * - Search bar
 * - Children (cards)
 * The component will filter the children based on the search input.
 */
export default function AdminPanelSection({
    title,
    addEnabled,
    addTooltipText,
    handleAdd,
    children,
    isLoading = false,
}: AdminPanelSectionProps) {
    const [addedItems, setAddedItems] = useState<ReactElement[]>([]);
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
            <div className='w-full flex flex-row items-center justify-between pt-3 pr-3 pb-3'>
                <input
                    type='text'
                    placeholder='Search'
                    className='input input-md input-block w-full'
                    onChange={(e) => setSearchVal(e.target.value)}
                />
                {addEnabled && (
                    <Tooltip content={addTooltipText}>
                        <span>
                            <button
                                className='h-fit ml-4 pt-1'
                                onClick={() =>
                                    handleAdd((x) =>
                                        setAddedItems((prev) => [...prev, x]),
                                    )
                                }
                            >
                                <PlusCircle />
                            </button>
                        </span>
                    </Tooltip>
                )}
            </div>
            <div className='w-full flex-grow overflow-y-auto space-y-4 gap-1 h-[80vh]'>
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
