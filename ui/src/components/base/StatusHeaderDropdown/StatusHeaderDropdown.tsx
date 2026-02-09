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
import { StatusIcon, type StatusType } from '@components/domain/notes/StatusIcon';
import { startCase } from 'lodash';
import { Check, PlusCircle, XCircle } from 'lucide-react';
import { useCallback, useState } from 'react';

export type StatusOption = StatusType;

interface StatusHeaderDropdownProps {
    onStatusChange: (status: string) => void;
    status?: string | null;
    statusOptions: StatusOption[];
    /** @deprecated No longer needed — kept for backwards compat */
    hideFleetingNotes?: boolean;
    /** @deprecated No longer needed — kept for backwards compat */
    triggerClassName?: string;
}

export default function StatusHeaderDropdown({
    onStatusChange,
    status = null,
    statusOptions,
}: StatusHeaderDropdownProps) {
    const [open, setOpen] = useState(false);
    const currentStatus = status || 'all';
    const isFiltered = currentStatus !== 'all';

    const handleSelect = useCallback(
        (value: string) => {
            onStatusChange(value);
            setOpen(false);
        },
        [onStatusChange],
    );

    const handleReset = useCallback(
        (e?: React.MouseEvent) => {
            e?.stopPropagation();
            onStatusChange('all');
        },
        [onStatusChange],
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
                            onClick={handleReset}
                        >
                            <XCircle />
                        </div>
                    ) : (
                        <PlusCircle />
                    )}
                    Status
                    {isFiltered && (
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
                                    status={currentStatus as StatusType}
                                    size={14}
                                />
                                {startCase(currentStatus)}
                            </Badge>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className='w-44 p-0' align='start'>
                <Command>
                    <CommandList className='max-h-full'>
                        <CommandGroup className='max-h-[300px] overflow-y-auto'>
                            {statusOptions.map((opt) => {
                                const isSelected = currentStatus === opt;
                                return (
                                    <CommandItem
                                        key={opt}
                                        onSelect={() => handleSelect(opt)}
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
                                        <StatusIcon status={opt} size={16} />
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
