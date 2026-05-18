'use client';

import type { Column } from '@tanstack/react-table';
import * as React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ExtendedColumnFilter } from '@/types/data-table';

interface DataTableRangeFilterProps<TData> extends React.ComponentProps<'div'> {
    filter: ExtendedColumnFilter<TData>;
    column: Column<TData>;
    inputId: string;
    onFilterUpdate: (
        filterId: string,
        updates: Partial<Omit<ExtendedColumnFilter<TData>, 'filterId'>>,
    ) => void;
}

export function DataTableRangeFilter<TData>({
    filter,
    column,
    inputId,
    onFilterUpdate,
    className,
    ...props
}: DataTableRangeFilterProps<TData>) {
    const label = column.columnDef.meta?.label ?? column.id;
    const currentValue = Array.isArray(filter.value)
        ? filter.value
        : [filter.value ?? '', ''];
    const minValue = currentValue[0] ?? '';
    const maxValue = currentValue[1] ?? '';

    const handleChange =
        (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
            const nextValue: string[] = [minValue, maxValue];
            nextValue[index] = event.target.value;
            onFilterUpdate(filter.filterId, { value: nextValue });
        };

    return (
        <div className={cn('flex items-center gap-2', className)} {...props}>
            <Input
                id={`${inputId}-min`}
                data-slot='range-min'
                type='number'
                inputMode='numeric'
                placeholder={`Min ${label}`}
                className='h-8 w-16 rounded-none px-1.5'
                value={minValue}
                onChange={handleChange(0)}
                aria-label={`Minimum ${label}`}
            />
            <Input
                id={`${inputId}-max`}
                data-slot='range-max'
                type='number'
                inputMode='numeric'
                placeholder={`Max ${label}`}
                className='h-8 w-16 rounded-none px-1.5'
                value={maxValue}
                onChange={handleChange(1)}
                aria-label={`Maximum ${label}`}
            />
        </div>
    );
}
