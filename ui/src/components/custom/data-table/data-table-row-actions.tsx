import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DotsThreeIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

/**
 * Per-row "..." actions menu for data tables. Stops click propagation so
 * opening the menu does not trigger the row's click handler.
 */
export function DataTableRowActions({ children }: { children: ReactNode }) {
    return (
        <div
            className='text-right flex justify-end'
            onClick={(e) => e.stopPropagation()}
        >
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            variant='ghost'
                            size='icon-sm'
                            className='text-muted-foreground hover:text-foreground'
                            title='Actions'
                        />
                    }
                >
                    <DotsThreeIcon
                        className='w-4 h-4'
                        weight='bold'
                        aria-hidden='true'
                    />
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>{children}</DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
