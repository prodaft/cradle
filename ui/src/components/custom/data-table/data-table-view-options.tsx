'use client';

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
import type { Table } from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';
import * as React from 'react';

interface DataTableViewOptionsProps<TData> extends React.ComponentProps<
    typeof PopoverContent
> {
    table: Table<TData>;
}

export function DataTableViewOptions<TData>({
    table,
    ...props
}: DataTableViewOptionsProps<TData>) {
    const columns = React.useMemo(
        () =>
            table
                .getAllColumns()
                .filter(
                    (column) =>
                        typeof column.accessorFn !== 'undefined' && column.getCanHide(),
                ),
        [table],
    );

    return (
        <Popover>
            <PopoverTrigger
                render={
                    <Button
                        aria-label='Toggle columns'
                        role='combobox'
                        variant='outline'
                        size='sm'
                        className='ml-auto h-8 font-normal max-sm:w-8 max-sm:px-0'
                    />
                }
            >
                <Settings2 className='text-muted-foreground' />
                <span className='max-sm:sr-only'>View</span>
            </PopoverTrigger>
            <PopoverContent className='w-44 p-0' {...props}>
                <Command>
                    <CommandInput placeholder='Search columns...' />
                    <CommandList>
                        <CommandEmpty>No columns found.</CommandEmpty>
                        <CommandGroup>
                            {columns.map((column) => (
                                <CommandItem
                                    key={column.id}
                                    data-checked={column.getIsVisible()}
                                    onSelect={() =>
                                        column.toggleVisibility(!column.getIsVisible())
                                    }
                                >
                                    <span className='truncate'>
                                        {column.columnDef.meta?.label ?? column.id}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
