import { StatusIcon, type StatusType } from '@/components/base/status-icon/status-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { startCase } from 'lodash';
import { Check, PlusCircle, XCircle } from 'lucide-react';
import { useCallback, useState } from 'react';

interface StatusHeaderDropdownProps {
    options: readonly StatusType[];
    /** Single-select: current value or `all`. */
    status?: string | null;
    onStatusChange?: (status: string) => void;
    /** Multi-select (e.g. notes list): when set, toggles OR semantics and ignores `status` / `onStatusChange`. */
    selected?: string[];
    onSelectedChange?: (values: string[]) => void;
}

export default function StatusHeaderDropdown({
    onStatusChange,
    status = null,
    options,
    selected,
    onSelectedChange,
}: StatusHeaderDropdownProps) {
    const [open, setOpen] = useState(false);
    const isMulti = Boolean(onSelectedChange);

    const activeStatus = status || 'all';
    const isFiltered = isMulti ? (selected?.length ?? 0) > 0 : activeStatus !== 'all';

    const handleSelectSingle = useCallback(
        (value: string) => {
            onStatusChange?.(value);
            setOpen(false);
        },
        [onStatusChange],
    );

    const handleResetSingle = useCallback(
        (e?: React.MouseEvent) => {
            e?.stopPropagation();
            onStatusChange?.('all');
        },
        [onStatusChange],
    );

    const handleResetMulti = useCallback(
        (e?: React.MouseEvent) => {
            e?.stopPropagation();
            onSelectedChange?.([]);
        },
        [onSelectedChange],
    );

    const toggleMulti = useCallback(
        (opt: string) => {
            if (!onSelectedChange) return;
            const currentSelection = selected ?? [];
            if (opt === 'all') {
                onSelectedChange([]);
                return;
            }
            const next = currentSelection.includes(opt)
                ? currentSelection.filter((s) => s !== opt)
                : [...currentSelection, opt];
            onSelectedChange(next);
        },
        [onSelectedChange, selected],
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant='outline'
                    size='sm'
                    className='border-dashed font-normal'
                >
                    {isFiltered ? (
                        <div
                            role='button'
                            aria-label='Clear status filter'
                            tabIndex={0}
                            className='rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                            onClick={isMulti ? handleResetMulti : handleResetSingle}
                        >
                            <XCircle />
                        </div>
                    ) : (
                        <PlusCircle />
                    )}
                    Status
                    {isFiltered && !isMulti && (
                        <>
                            <Separator
                                orientation='vertical'
                                className='mx-0.5 data-[orientation=vertical]:h-4'
                            />
                            <Badge
                                variant='secondary'
                                className='rounded-sm px-1 font-normal'
                            >
                                <StatusIcon
                                    status={activeStatus as StatusType}
                                    size={14}
                                />
                                {startCase(activeStatus)}
                            </Badge>
                        </>
                    )}
                    {isFiltered && isMulti && (
                        <>
                            <Separator
                                orientation='vertical'
                                className='mx-0.5 data-[orientation=vertical]:h-4'
                            />
                            <Badge
                                variant='secondary'
                                className='rounded-sm px-1 font-normal'
                            >
                                {(selected?.length ?? 0) === 1 ? (
                                    <>
                                        <StatusIcon
                                            status={selected![0] as StatusType}
                                            size={14}
                                        />
                                        {startCase(selected![0])}
                                    </>
                                ) : (
                                    <span>{selected?.length} selected</span>
                                )}
                            </Badge>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className='w-44 p-0' align='start'>
                <Command>
                    <CommandList className='max-h-full'>
                        <CommandGroup className='max-h-[300px] overflow-y-auto'>
                            {options.map((opt) => {
                                const isSelected = isMulti
                                    ? opt === 'all'
                                        ? (selected?.length ?? 0) === 0
                                        : (selected ?? []).includes(opt)
                                    : activeStatus === opt;
                                return (
                                    <CommandItem
                                        key={opt}
                                        onSelect={() =>
                                            isMulti
                                                ? toggleMulti(opt)
                                                : handleSelectSingle(opt)
                                        }
                                    >
                                        <div
                                            className={cn(
                                                'flex size-4 items-center justify-center rounded-sm border border-primary',
                                                isSelected
                                                    ? 'bg-primary'
                                                    : 'opacity-50 [&_svg]:invisible',
                                            )}
                                        >
                                            <Check className='size-3 text-primary-foreground' />
                                        </div>
                                        {opt !== 'all' && (
                                            <StatusIcon status={opt} size={16} />
                                        )}
                                        <span className='truncate'>
                                            {startCase(opt)}
                                        </span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
