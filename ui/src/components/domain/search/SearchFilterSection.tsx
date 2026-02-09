import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { XIcon } from '@phosphor-icons/react';
import { PlusCircle, XCircle } from 'lucide-react';
import React, { Dispatch, SetStateAction, useState } from 'react';

/**
 * SearchFilterSection component props
 */
export interface SearchFilterSectionProps {
    /** @deprecated No longer used — popover manages its own state */
    showFilters?: boolean;
    /** @deprecated No longer used — popover manages its own state */
    setShowFilters?: Dispatch<SetStateAction<boolean>>;
    /** Available entry subtypes */
    entrySubtypes: string[];
    /** Current entry subtype filters */
    entrySubtypeFilters: string[];
    /** Function to update the entry subtype filters */
    setEntrySubtypeFilters: Dispatch<SetStateAction<string[]>>;
    /** Map of subtype to color */
    entryClassColors: Map<string, string>;
}

/**
 * Section for filters in the search dialog
 * Contains popover filters for entry type organized by hierarchy
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
    entrySubtypes,
    entrySubtypeFilters,
    setEntrySubtypeFilters,
    entryClassColors,
}: SearchFilterSectionProps): React.JSX.Element {
    const [open, setOpen] = useState(false);
    const hasFilters = entrySubtypeFilters.length > 0;

    const handleClear = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEntrySubtypeFilters([]);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant='outline'
                    size='sm'
                    className='border-dashed font-normal'
                >
                    {hasFilters ? (
                        <XCircle
                            className='opacity-70 hover:opacity-100'
                            onClick={handleClear}
                        />
                    ) : (
                        <PlusCircle />
                    )}
                    Type
                    {hasFilters && (
                        <>
                            <Separator
                                orientation='vertical'
                                className='mx-0.5 data-[orientation=vertical]:h-4'
                            />
                            {entrySubtypeFilters.length <= 2 ? (
                                entrySubtypeFilters.map((filter) => {
                                    const color = entryClassColors.get(filter);
                                    return (
                                        <Badge
                                            key={filter}
                                            variant='secondary'
                                            className='rounded-sm px-1 font-normal'
                                            style={
                                                color
                                                    ? {
                                                          backgroundColor: color,
                                                          borderColor: color,
                                                          color: '#fff',
                                                      }
                                                    : undefined
                                            }
                                        >
                                            {filter}
                                        </Badge>
                                    );
                                })
                            ) : (
                                <Badge
                                    variant='secondary'
                                    className='rounded-sm px-1 font-normal'
                                >
                                    {entrySubtypeFilters.length} selected
                                </Badge>
                            )}
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className='w-60 p-0' align='start'>
                <div className='p-3 overflow-y-auto max-h-56 flex flex-wrap gap-1.5 items-center'>
                    {[...entrySubtypes]
                        .sort((a, b) => a.localeCompare(b))
                        .map((subtype) => {
                            const color = entryClassColors.get(subtype);
                            const isActive = entrySubtypeFilters.includes(subtype);
                            const toggleFilter = () => {
                                setEntrySubtypeFilters((prevFilters) =>
                                    isActive
                                        ? prevFilters.filter((item) => item !== subtype)
                                        : [...prevFilters, subtype],
                                );
                            };
                            return (
                                <Badge
                                    key={subtype}
                                    variant='outline'
                                    onClick={toggleFilter}
                                    className={`cursor-pointer ${isActive ? '' : 'opacity-60'}`}
                                    style={
                                        color && isActive
                                            ? {
                                                  backgroundColor: color,
                                                  borderColor: color,
                                                  color: '#fff',
                                              }
                                            : undefined
                                    }
                                >
                                    {subtype}
                                    {isActive && <XIcon className='size-3' />}
                                </Badge>
                            );
                        })}
                </div>
                {hasFilters && (
                    <>
                        <Separator />
                        <div className='p-1.5'>
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={handleClear}
                                className='w-full text-xs'
                            >
                                Clear filters
                            </Button>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
}
