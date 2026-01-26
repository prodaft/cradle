import { Button } from '@/components/ui/button';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useFrontendSearch, { SearchableChild } from '@/hooks/search/useFrontendSearch';
import { naturalSort } from '@/utils/dashboard';
import { PlusCircleIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';
import { ReactNode, useMemo, useState } from 'react';

interface AdminPanelSectionProps {
    title: string;
    addEnabled: boolean;
    addTooltipText: string;
    handleAdd: (addItemCallback: (item: SearchableChild) => void) => void;
    children: SearchableChild[] | null;
    isLoading?: boolean;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    onSearchClear?: () => void;
    enableFrontendSearch?: boolean;
    footer?: ReactNode;
    searchPlaceholder?: string;
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
    searchValue,
    onSearchChange,
    onSearchClear,
    enableFrontendSearch = true,
    footer,
    searchPlaceholder = 'Search',
}: AdminPanelSectionProps) {
    const [addedItems, setAddedItems] = useState<SearchableChild[]>([]);
    const combinedItems = useMemo(
        () => [...(children || []), ...addedItems],
        [children, addedItems],
    );
    const { searchVal, setSearchVal, filteredChildren } =
        useFrontendSearch(combinedItems);
    const effectiveSearchValue = onSearchChange ? searchValue || '' : searchVal;
    const handleSearchValueChange = (value: string) => {
        if (onSearchChange) {
            onSearchChange(value);
            return;
        }
        setSearchVal(value);
    };
    const handleSearchValueClear = () => {
        if (onSearchClear) {
            onSearchClear();
            return;
        }
        setSearchVal('');
    };
    const visibleChildren = enableFrontendSearch ? filteredChildren : combinedItems;
    // Sort the filtered children based on their key property
    const sortedFilteredChildren = visibleChildren
        ? visibleChildren.sort((a, b) => {
              // Convert keys to strings to ensure proper lexicographical comparison
              const aKey = a.key?.toString() || '';
              const bKey = b.key?.toString() || '';
              return naturalSort(aKey, bKey);
          })
        : [];
    return (
        <div className='w-full h-full flex flex-col rounded-md px-3'>
            <div className='w-full flex flex-row items-center justify-between pt-3 pr-3 pb-3 gap-3'>
                <InputGroup className='flex-grow'>
                    <InputGroupInput
                        type='text'
                        placeholder='Search'
                        onChange={(e) => setSearchVal(e.target.value)}
                        value={searchVal}
                    />
                    <InputGroupAddon>
                        <MagnifyingGlassIcon />
                    </InputGroupAddon>
                    {searchVal && (
                        <InputGroupAddon
                            align='inline-end'
                        onClick={() => setSearchVal('')}
                        className='cursor-pointer'
                    >
                        <XIcon size={16} weight="bold" />
                    </InputGroupAddon>
                    )}
                </InputGroup>
                {addEnabled && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='h-fit pt-1'
                                onClick={() =>
                                    handleAdd((x) =>
                                        setAddedItems((prev) => [...prev, x]),
                                )
                            }
                        >
                            <PlusCircleIcon size={20} weight="bold" />
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent>{addTooltipText}</TooltipContent>
                    </Tooltip>
                )}
            </div>
            <ScrollArea className='w-full flex-grow space-y-4 gap-1 h-[80vh]'>
                {isLoading ? (
                    // Loading spinner
                    <div className='flex items-center justify-center min-h-[200px]'>
                        <Spinner className='size-10' />
                    </div>
                ) : sortedFilteredChildren && sortedFilteredChildren.length > 0 ? (
                    sortedFilteredChildren
                ) : (
                    <div className='container mx-auto flex flex-col items-center'>
                        <p className='mt-6 !text-sm !font-normal text-muted-foreground'>
                            No items found!
                        </p>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
