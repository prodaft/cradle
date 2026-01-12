import { Button } from '@/components/ui/button';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from 'iconoir-react';
import { useEffect, useState } from 'react';

interface DatepickerProps {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (dates: [Date | null, Date | null]) => void;
    placeholderText?: string;
    className?: string;
    open?: boolean;
    onClickOutside?: () => void;
}

const Datepicker = ({
    startDate,
    endDate,
    onChange,
    placeholderText = 'Select date range',
    className,
    open: controlledOpen,
    onClickOutside,
}: DatepickerProps) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const [startTime, setStartTime] = useState('00:00');
    const [endTime, setEndTime] = useState('00:00');

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;

    // Initialize time values from dates
    useEffect(() => {
        if (startDate) {
            const hours = String(startDate.getHours()).padStart(2, '0');
            const minutes = String(startDate.getMinutes()).padStart(2, '0');
            setStartTime(`${hours}:${minutes}`);
        }
        if (endDate) {
            const hours = String(endDate.getHours()).padStart(2, '0');
            const minutes = String(endDate.getMinutes()).padStart(2, '0');
            setEndTime(`${hours}:${minutes}`);
        }
    }, [startDate, endDate]);

    const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
        if (!range) {
            onChange([null, null]);
            return;
        }

        const { from, to } = range;

        // Apply time to dates
        let newStartDate: Date | null = null;
        let newEndDate: Date | null = null;

        if (from) {
            const [hours, minutes] = startTime.split(':').map(Number);
            newStartDate = new Date(from);
            newStartDate.setHours(hours, minutes, 0, 0);
        }

        if (to) {
            const [hours, minutes] = endTime.split(':').map(Number);
            newEndDate = new Date(to);
            newEndDate.setHours(hours, minutes, 0, 0);
        } else if (from) {
            // If only start date selected (range not complete), keep existing end date or use start date
            if (endDate) {
                // Preserve existing end date time
                newEndDate = new Date(endDate);
            } else {
                // Use start time for end time if no end date exists
                const [hours, minutes] = startTime.split(':').map(Number);
                newEndDate = new Date(from);
                newEndDate.setHours(hours, minutes, 0, 0);
            }
        }

        onChange([newStartDate, newEndDate]);
    };

    const handleTimeChange = (time: string, isStart: boolean) => {
        if (isStart) {
            setStartTime(time);
            if (startDate) {
                const [hours, minutes] = time.split(':').map(Number);
                const newDate = new Date(startDate);
                newDate.setHours(hours, minutes, 0, 0);
                onChange([newDate, endDate]);
            }
        } else {
            setEndTime(time);
            if (endDate) {
                const [hours, minutes] = time.split(':').map(Number);
                const newDate = new Date(endDate);
                newDate.setHours(hours, minutes, 0, 0);
                onChange([startDate, newDate]);
            }
        }
    };

    const formatDisplayValue = () => {
        if (startDate && endDate) {
            return `${format(startDate, 'yyyy-MM-dd HH:mm')} - ${format(endDate, 'yyyy-MM-dd HH:mm')}`;
        }
        if (startDate) {
            return format(startDate, 'yyyy-MM-dd HH:mm');
        }
        return '';
    };

    const displayValue = formatDisplayValue();

    return (
        <Popover
            open={open}
            onOpenChange={(newOpen) => {
                if (!isControlled) {
                    setInternalOpen(newOpen);
                }
                if (!newOpen && onClickOutside) {
                    onClickOutside();
                }
            }}
        >
            <PopoverTrigger asChild>
                <div className={cn('relative flex items-center w-full', className)}>
                    <Calendar className='absolute left-3 w-4 h-4 text-text-muted-foreground z-10 pointer-events-none' />
                    <Button
                        variant='outline'
                        className={cn(
                            'w-full justify-start text-left font-normal font-mono bg-transparent',
                            !displayValue && 'text-muted-foreground',
                            'pl-9',
                        )}
                    >
                        {displayValue || placeholderText}
                    </Button>
                </div>
            </PopoverTrigger>
            <PopoverContent
                className='w-auto p-0'
                align='start'
                onInteractOutside={(e) => {
                    // Don't close when clicking inside the calendar
                    if (
                        e.target instanceof Element &&
                        e.target.closest('[data-slot="calendar"]')
                    ) {
                        e.preventDefault();
                    }
                }}
            >
                <div className='p-3'>
                    <ShadcnCalendar
                        mode='range'
                        selected={{
                            from: startDate || undefined,
                            to: endDate || undefined,
                        }}
                        onSelect={handleDateSelect}
                        numberOfMonths={2}
                        className='rounded-md border-0'
                    />
                    <div className='flex gap-4 p-3 border-t'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-medium text-text-foreground'>
                                Start Time
                            </Label>
                            <Input
                                type='time'
                                value={startTime}
                                onChange={(e) => handleTimeChange(e.target.value, true)}
                                className='w-32 font-mono'
                            />
                        </div>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-medium text-text-foreground'>
                                End Time
                            </Label>
                            <Input
                                type='time'
                                value={endTime}
                                onChange={(e) =>
                                    handleTimeChange(e.target.value, false)
                                }
                                className='w-32 font-mono'
                            />
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default Datepicker;
