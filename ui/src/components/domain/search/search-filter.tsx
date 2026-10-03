import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { FunnelIcon, XIcon } from '@phosphor-icons/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import React, { Dispatch, SetStateAction, useMemo, useState } from 'react';

/**
 * SearchFilterSection component props
 */
interface SearchFilterSectionProps {
    subtypes: string[];
    selectedSubtypes: string[];
    setSelectedSubtypes: Dispatch<SetStateAction<string[]>>;
    colors: Map<string, string>;
}

function resolveColor(
    subtype: string,
    colors: Map<string, string>,
): string | undefined {
    const direct = colors.get(subtype);
    if (direct) return direct;
    const parts = subtype.split('/');
    if (parts.length > 1) return colors.get(parts.at(-1)!);
    return undefined;
}

/**
 * Inline toggle-chip filter for entry types in the search dialog.
 * Shows selected filters as inline chips and a searchable popover
 * for browsing/toggling from the full list.
 */
export default function SearchFilterSection({
    subtypes,
    selectedSubtypes,
    setSelectedSubtypes,
    colors,
}: SearchFilterSectionProps): React.JSX.Element | null {
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const sortedSubtypes = useMemo(
        () => [...subtypes].sort((a, b) => a.localeCompare(b)),
        [subtypes],
    );

    const toggleSubtype = (subtype: string) => {
        setSelectedSubtypes((prev) =>
            prev.includes(subtype)
                ? prev.filter((item) => item !== subtype)
                : [...prev, subtype],
        );
    };

    const removeSubtype = (subtype: string, e: React.MouseEvent) => {
        e.stopPropagation();
        toggleSubtype(subtype);
    };

    const clearSubtypes = () => {
        setSelectedSubtypes([]);
        setIsPickerOpen(false);
    };

    if (sortedSubtypes.length === 0) return null;

    return (
        <div className='flex items-center gap-2 border-b px-3 py-2'>
            <div className='flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground'>
                <FunnelIcon
                    className='size-3.5'
                    weight={selectedSubtypes.length > 0 ? 'fill' : 'regular'}
                />
                Type
            </div>

            <Separator
                orientation='vertical'
                className='data-[orientation=vertical]:h-4'
            />

            {/* Chips area - single line, no wrap */}
            <div className='flex flex-1 items-center gap-1 min-w-0 overflow-hidden'>
                {selectedSubtypes.length > 0
                    ? selectedSubtypes.map((subtype) => {
                          const color = resolveColor(subtype, colors);
                          return (
                              <Badge
                                  key={subtype}
                                  variant='outline'
                                  onClick={() => toggleSubtype(subtype)}
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
                                      onClick={(e) => removeSubtype(subtype, e)}
                                  />
                              </Badge>
                          );
                      })
                    : sortedSubtypes.map((subtype) => {
                          const color = resolveColor(subtype, colors);
                          return (
                              <Badge
                                  key={subtype}
                                  variant='outline'
                                  onClick={() => toggleSubtype(subtype)}
                                  className='shrink-0 cursor-pointer select-none text-[11px] px-1.5 py-0 h-5 opacity-50 hover:opacity-80 transition-opacity'
                                  style={
                                      color ? { borderColor: color, color } : undefined
                                  }
                              >
                                  {subtype}
                              </Badge>
                          );
                      })}
            </div>

            {/* Right side: popover trigger + clear */}
            <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
                <PopoverTrigger asChild>
                    <button
                        type='button'
                        className='shrink-0 inline-flex items-center gap-1 rounded-full border border-dashed px-2 h-5 text-[11px] text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors'
                    >
                        <ChevronsUpDown className='size-2.5' />
                        {selectedSubtypes.length > 0 ? 'Edit' : 'Select'}
                    </button>
                </PopoverTrigger>
                <PopoverContent className='w-56 p-0' align='end'>
                    <Command>
                        <CommandInput placeholder='Search types...' />
                        <CommandList className='max-h-[240px]'>
                            <CommandEmpty>No types found.</CommandEmpty>
                            <CommandGroup>
                                {sortedSubtypes.map((subtype) => {
                                    const color = resolveColor(subtype, colors);
                                    const isActive = selectedSubtypes.includes(subtype);

                                    return (
                                        <CommandItem
                                            key={subtype}
                                            value={subtype}
                                            onSelect={() => toggleSubtype(subtype)}
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
                        {selectedSubtypes.length > 0 && (
                            <>
                                <Separator />
                                <div className='p-1'>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={clearSubtypes}
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

            {selectedSubtypes.length > 0 && (
                <>
                    <Separator
                        orientation='vertical'
                        className='data-[orientation=vertical]:h-4'
                    />
                    <Button
                        variant='ghost'
                        size='xs'
                        onClick={clearSubtypes}
                        className='shrink-0 text-[11px] text-muted-foreground h-5 px-1'
                    >
                        Clear
                    </Button>
                </>
            )}
        </div>
    );
}
