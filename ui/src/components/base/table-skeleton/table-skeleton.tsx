import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import React from 'react';

export interface TableSkeletonProps {
    /** Number of skeleton rows */
    rows?: number;
    /** Number of columns (cell widths alternate) */
    columns?: number;
    /** Show toolbar placeholder (for tables with filters) */
    showToolbar?: boolean;
}

/**
 * Skeleton placeholder for table content loading.
 * Use instead of centered Spinner for element-level loading (distinct from PageLoader).
 */
export default function TableSkeleton({
    rows = 8,
    columns = 4,
    showToolbar = true,
}: TableSkeletonProps): React.JSX.Element {
    return (
        <div className='flex w-full flex-col gap-2.5 overflow-auto'>
            {showToolbar && (
                <div
                    role='toolbar'
                    className='flex w-full items-start justify-between gap-2 py-1'
                >
                    <div className='flex flex-1 flex-wrap items-center gap-2'>
                        <Skeleton className='h-9 w-48' />
                        <Skeleton className='h-9 w-24' />
                        <Skeleton className='h-9 w-32' />
                    </div>
                    <Skeleton className='h-9 w-9' />
                </div>
            )}
            <div className='overflow-hidden rounded-md border'>
                <Table>
                    <TableHeader>
                        <TableRow className='h-12'>
                            {Array.from({ length: columns }).map((_, i) => {
                                const widths = ['w-24', 'w-32', 'w-20', 'w-28'];
                                return (
                                    <TableHead key={i}>
                                        <Skeleton
                                            className={cn(
                                                'h-4',
                                                widths[i % widths.length],
                                            )}
                                        />
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: rows }).map((_, rowIdx) => (
                            <TableRow key={rowIdx} className='h-14'>
                                {Array.from({ length: columns }).map((_, colIdx) => {
                                    const widths = [
                                        'w-full max-w-48',
                                        'w-24',
                                        'w-20',
                                        'w-28',
                                    ];
                                    return (
                                        <TableCell key={colIdx}>
                                            <Skeleton
                                                className={cn(
                                                    'h-4',
                                                    widths[colIdx % widths.length],
                                                )}
                                            />
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
