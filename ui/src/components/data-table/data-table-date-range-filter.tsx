import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/format';
import type { DateRangeFilter } from '@/components/base/ListView/types';
import { CalendarIcon, XCircle } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

interface DateRangeFilterButtonProps {
    title: string;
    value: DateRangeFilter;
    onChange: (value: DateRangeFilter) => void;
}

export function DateRangeFilterButton({
    title,
    value,
    onChange,
}: DateRangeFilterButtonProps) {
    const [open, setOpen] = useState(false);

    const hasValue = Boolean(value.from) || Boolean(value.to);

    const selected = useMemo<DateRange>(
        () => ({
            from: value.from ? new Date(value.from) : undefined,
            to: value.to ? new Date(value.to) : undefined,
        }),
        [value.from, value.to],
    );

    const onSelect = useCallback(
        (range: DateRange | undefined) => {
            if (!range) {
                onChange({ from: '', to: '' });
                return;
            }
            onChange({
                from: range.from?.toISOString() ?? '',
                to: range.to?.toISOString() ?? '',
            });
        },
        [onChange],
    );

    const onReset = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onChange({ from: '', to: '' });
        },
        [onChange],
    );

    const label = useMemo(() => {
        if (!hasValue) return null;
        const from = value.from ? formatDate(value.from, { month: 'short' }) : '';
        const to = value.to ? formatDate(value.to, { month: 'short' }) : '';
        if (from && to) return `${from} – ${to}`;
        return from || to;
    }, [hasValue, value.from, value.to]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant='outline'
                    size='sm'
                    className='border-dashed font-normal'
                >
                    {hasValue ? (
                        <div
                            role='button'
                            aria-label={`Clear ${title} filter`}
                            tabIndex={0}
                            onClick={onReset}
                            className='rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                        >
                            <XCircle />
                        </div>
                    ) : (
                        <CalendarIcon />
                    )}
                    <span className='flex items-center gap-2'>
                        <span>{title}</span>
                        {label && (
                            <>
                                <Separator
                                    orientation='vertical'
                                    className='mx-0.5 data-[orientation=vertical]:h-4'
                                />
                                <span>{label}</span>
                            </>
                        )}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                    autoFocus
                    captionLayout='dropdown'
                    mode='range'
                    selected={selected}
                    onSelect={onSelect}
                />
            </PopoverContent>
        </Popover>
    );
}
