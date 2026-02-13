import { Badge } from '@/components/ui/badge';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FunnelIcon, XIcon } from '@phosphor-icons/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import React, {
    Dispatch,
    SetStateAction,
    useMemo,
    useState,
} from 'react';

/**
 * SearchFilterSection component props
 */
export interface SearchFilterSectionProps {
    /** Available entry subtypes */
    entrySubtypes: string[];
    /** Current entry subtype filters */
    entrySubtypeFilters: string[];
    /** Function to update the entry subtype filters */
    setEntrySubtypeFilters: Dispatch<SetStateAction<string[]>>;
    /** Map of subtype to color */
    entryClassColors: Map<string, string>;
}


function resolveColor(
    subtype: string,
    colorMap: Map<string, string>,
): string | undefined {
    const direct = colorMap.get(subtype);
    if (direct) return direct;
    const parts = subtype.split('/');
    if (parts.length > 1) return colorMap.get(parts.at(-1)!);
    return undefined;
}

/**
 * Inline toggle-chip filter for entry types in the search dialog.
 * Shows selected filters as inline chips and a searchable popover
 * for browsing/toggling from the full list.
 */
export default function SearchFilterSection({
    entrySubtypes,
    entrySubtypeFilters,
    setEntrySubtypeFilters,
    entryClassColors,
}: SearchFilterSectionProps): React.JSX.Element | null {
    const [open, setOpen] = useState(false);

    const hasFilters = entrySubtypeFilters.length > 0;
    const filterSet = useMemo(
        () => new Set(entrySubtypeFilters),
        [entrySubtypeFilters],
    );
    const sorted = useMemo(
        () => [...entrySubtypes].sort((a, b) => a.localeCompare(b)),
        [entrySubtypes],
    );

    const handleToggle = (subtype: string) => {
        setEntrySubtypeFilters((prev) =>
            prev.includes(subtype)
                ? prev.filter((item) => item !== subtype)
                : [...prev, subtype],
        );
    };

    const handleRemove = (subtype: string, e: React.MouseEvent) => {
        e.stopPropagation();
        handleToggle(subtype);
    };

    const handleClear = () => {
        setEntrySubtypeFilters([]);
        setOpen(false);
    };

    if (sorted.length === 0) return null;

    return (
        <div className='flex items-center gap-2 border-b px-3 py-2'>
            <div className='flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground'>
                <FunnelIcon
                    className='size-3.5'
                    weight={hasFilters ? 'fill' : 'regular'}
                />
                Type
            </div>

            <Separator
                orientation='vertical'
                className='data-[orientation=vertical]:h-4'
            />

            {/* Chips area — single line, no wrap */}
            <div className='flex flex-1 items-center gap-1 min-w-0 overflow-hidden'>
                {hasFilters ? (
                    entrySubtypeFilters.map((subtype) => {
                        const color = resolveColor(subtype, entryClassColors);
                        return (
                            <Badge
                                key={subtype}
                                variant='outline'
                                onClick={() => handleToggle(subtype)}
                                className='shrink-0 cursor-pointer text-[11px] px-1.5 py-0 h-5 gap-0.5'
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
                                {subtype}
                                <XIcon
                                    className='size-2.5 cursor-pointer opacity-70 hover:opacity-100'
                                    weight='bold'
                                    onClick={(e) => handleRemove(subtype, e)}
                                />
                            </Badge>
                        );
                    })
                ) : (
                    sorted.map((subtype) => {
                        const color = resolveColor(subtype, entryClassColors);
                        return (
                            <Badge
                                key={subtype}
                                variant='outline'
                                onClick={() => handleToggle(subtype)}
                                className='shrink-0 cursor-pointer select-none text-[11px] px-1.5 py-0 h-5 opacity-50 hover:opacity-80 transition-opacity'
                                style={
                                    color
                                        ? { borderColor: color, color }
                                        : undefined
                                }
                            >
                                {subtype}
                            </Badge>
                        );
                    })
                )}
            </div>

            {/* Right side: popover trigger + clear */}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type='button'
                        className='shrink-0 inline-flex items-center gap-1 rounded-full border border-dashed px-2 h-5 text-[11px] text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors'
                    >
                        <ChevronsUpDown className='size-2.5' />
                        {hasFilters ? 'Edit' : 'Select'}
                    </button>
                </PopoverTrigger>
                <PopoverContent className='w-56 p-0' align='end'>
                    <Command>
                        <CommandInput placeholder='Search types...' />
                        <CommandList className='max-h-[240px]'>
                            <CommandEmpty>No types found.</CommandEmpty>
                            <CommandGroup>
                                {sorted.map((subtype) => {
                                    const color = resolveColor(
                                        subtype,
                                        entryClassColors,
                                    );
                                    const isActive = filterSet.has(subtype);

                                    return (
                                        <CommandItem
                                            key={subtype}
                                            value={subtype}
                                            onSelect={() => handleToggle(subtype)}
                                            className='gap-2'
                                        >
                                            <div
                                                className={cn(
                                                    'flex size-3.5 items-center justify-center rounded-sm border',
                                                    isActive
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : 'border-muted-foreground/40 opacity-50 [&_svg]:invisible',
                                                )}
                                            >
                                                <Check className='size-2.5' />
                                            </div>
                                            {color && (
                                                <span
                                                    className='size-2 rounded-full shrink-0'
                                                    style={{
                                                        backgroundColor: color,
                                                    }}
                                                />
                                            )}
                                            <span className='truncate text-xs'>
                                                {subtype}
                                            </span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                        {hasFilters && (
                            <>
                                <Separator />
                                <div className='p-1'>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={handleClear}
                                        className='w-full text-xs text-muted-foreground'
                                    >
                                        Clear all
                                    </Button>
                                </div>
                            </>
                        )}
                    </Command>
                </PopoverContent>
            </Popover>

            {hasFilters && (
                <>
                    <Separator
                        orientation='vertical'
                        className='data-[orientation=vertical]:h-4'
                    />
                    <Button
                        variant='ghost'
                        size='xs'
                        onClick={handleClear}
                        className='shrink-0 text-[11px] text-muted-foreground h-5 px-1'
                    >
                        Clear
                    </Button>
                </>
            )}
        </div>
    );
}
