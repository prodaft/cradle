import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

export interface DateRangePickerProps {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (dates: [Date | null, Date | null]) => void;
    placeholderText?: string;
    className?: string;
    numberOfMonths?: number;
    disabled?: boolean;
}

/**
 * ShadCN-style date range picker (Popover + Button + Calendar).
 * This is a thin wrapper around our ShadCN `Calendar` component (react-day-picker).
 */
export function DateRangePicker({
    startDate,
    endDate,
    onChange,
    placeholderText = 'Pick a date range',
    className,
    numberOfMonths = 2,
    disabled = false,
}: DateRangePickerProps) {
    const selected: DateRange | undefined = startDate
        ? { from: startDate, to: endDate ?? undefined }
        : undefined;

    const label = selected?.from
        ? selected.to
            ? `${format(selected.from, 'yyyy-MM-dd')} - ${format(selected.to, 'yyyy-MM-dd')}`
            : format(selected.from, 'yyyy-MM-dd')
        : placeholderText;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type='button'
                    variant='outline'
                    disabled={disabled}
                    className={cn(
                        'w-full justify-start text-left font-normal',
                        !selected?.from && 'text-muted-foreground',
                        className,
                    )}
                >
                    <CalendarIcon className='mr-2 size-4' />
                    {label}
                </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                    mode='range'
                    selected={selected}
                    onSelect={(range) => {
                        onChange([range?.from ?? null, range?.to ?? null]);
                    }}
                    numberOfMonths={numberOfMonths}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}
