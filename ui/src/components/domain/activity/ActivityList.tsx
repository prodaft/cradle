import type { DateRangeFilter } from '@/components/base/ListView/types';
import { DateRangeFilterButton } from '@/components/data-table/data-table-date-range-filter';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/use-api';
import { cn } from '@/lib/utils';
import { CaretDownIcon, GitForkIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import type { EventLog } from '@services/cradle/models';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { diff_match_patch } from 'diff-match-patch';
import { Check, PlusCircle, XCircle } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import OfflineIndicator from '../../feedback/offline-indicator';

interface SearchFilters {
    username: string;
    dateRange: DateRangeFilter;
    type: string;
    content_type?: string;
    object_id?: string;
}

const EVENT_TYPE_OPTIONS = [
    { value: 'create', label: 'Create' },
    { value: 'edit', label: 'Edit' },
    { value: 'delete', label: 'Delete' },
    { value: 'fetch', label: 'Fetch' },
    { value: 'login', label: 'Login' },
];

interface ActivityListProps {
    name?: string;
    objectId?: string;
    content_type?: string;
    username?: string;
}

interface SrcLog {
    id: string;
    type: string;
    details?: string | null;
    content_type: string;
    object_id: string;
    object_repr: string;
}

interface ActivityEvent {
    id: string;
    timestamp: string;
    type: string;
    username: string;
    contentType: string;
    objectId: string;
    objectRepr: string;
    details?: string | null;
    srcLog?: SrcLog | null;
}

const getTypeBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
        case 'create':
            return 'default';
        case 'edit':
            return 'secondary';
        case 'delete':
            return 'destructive';
        case 'login':
            return 'outline';
        default:
            return 'outline';
    }
};

function EventTypeFilter({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const isFiltered = value !== '';

    const handleSelect = useCallback(
        (selected: string) => {
            onChange(selected === value ? '' : selected);
            setOpen(false);
        },
        [onChange, value],
    );

    const handleReset = useCallback(
        (e?: React.MouseEvent) => {
            e?.stopPropagation();
            onChange('');
        },
        [onChange],
    );

    const selectedLabel = EVENT_TYPE_OPTIONS.find((o) => o.value === value)?.label;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant='outline'
                    size='sm'
                    className='border-dashed font-normal'
                >
                    {isFiltered ? (
                        <span
                            role='button'
                            tabIndex={0}
                            aria-label='Clear type filter'
                            className='inline-flex rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                            onClick={(e) => {
                                e.stopPropagation();
                                handleReset(e);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleReset();
                                }
                            }}
                        >
                            <XCircle />
                        </span>
                    ) : (
                        <PlusCircle />
                    )}
                    Type
                    {isFiltered && selectedLabel && (
                        <>
                            <Separator
                                orientation='vertical'
                                className='mx-0.5 data-[orientation=vertical]:h-4'
                            />
                            <Badge
                                variant='secondary'
                                className='rounded-sm px-1 font-normal'
                            >
                                {selectedLabel}
                            </Badge>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className='w-44 p-0' align='start'>
                <Command>
                    <CommandList className='max-h-full'>
                        <CommandGroup className='max-h-[300px] overflow-y-auto'>
                            {EVENT_TYPE_OPTIONS.map((option) => {
                                const isSelected = value === option.value;
                                return (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => handleSelect(option.value)}
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
                                        <span className='truncate'>{option.label}</span>
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

// Format object representation for display
const formatObjectRepr = (
    repr: string,
    objectId: string,
): { text: string; fullId: string; isDeleted: boolean } => {
    if (!repr) return { text: '-', fullId: '', isDeleted: false };

    if (repr === 'DELETED') {
        return { text: 'Deleted', fullId: objectId, isDeleted: true };
    }

    const bracketMatch = repr.match(/^\[\[([^:]+):([^\]]+)\]\]$/);
    if (bracketMatch) {
        return {
            text: `${bracketMatch[1]}:${bracketMatch[2]}`,
            fullId: objectId,
            isDeleted: false,
        };
    }

    const angleMatch = repr.match(/^<(\w+):([^>]+)>$/);
    if (angleMatch) {
        return { text: angleMatch[1], fullId: angleMatch[2], isDeleted: false };
    }

    return { text: repr, fullId: objectId, isDeleted: false };
};

// Format diff for display
const formatDiff = (diffTxt: string): string => {
    if (!diffTxt) return '';

    try {
        const dmp = new diff_match_patch();
        const patch = dmp.patch_fromText(diffTxt);
        if (!patch || patch.length === 0) {
            return '<span class="text-muted-foreground">No changes</span>';
        }

        const diffs = (patch[0] as any).diffs as any[][];
        const lines: string[] = [];

        for (const [op, text] of diffs) {
            let decodedText: string;
            try {
                decodedText = decodeURIComponent(text);
            } catch {
                decodedText = text;
            }

            const escapedText = decodedText
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            const parts = escapedText.split('\n');
            for (const part of parts) {
                if (!part) continue;
                if (op === diff_match_patch.DIFF_INSERT) {
                    lines.push(
                        `<div class="flex items-start bg-primary/10 border-l-2 border-primary px-2 py-0.5"><span class="text-primary font-bold mr-2 select-none">+</span><span class="text-primary/90 whitespace-pre-wrap break-all">${part}</span></div>`,
                    );
                } else if (op === diff_match_patch.DIFF_DELETE) {
                    lines.push(
                        `<div class="flex items-start bg-destructive/10 border-l-2 border-destructive px-2 py-0.5"><span class="text-destructive font-bold mr-2 select-none">-</span><span class="text-destructive/90 whitespace-pre-wrap break-all">${part}</span></div>`,
                    );
                }
            }
        }

        if (lines.length === 0) {
            return '<span class="text-muted-foreground text-xs">No text changes</span>';
        }

        return `<div class="text-xs bg-muted rounded border border-border overflow-hidden">${lines.join('')}</div>`;
    } catch {
        return '<span class="text-muted-foreground text-xs">Unable to parse diff</span>';
    }
};

// Expandable detail panel for a row
function ExpandedRowDetail({
    event,
    colSpan,
}: {
    event: ActivityEvent;
    colSpan: number;
}) {
    const hasDetails = !!event.details;
    const hasSrcLog = !!event.srcLog;
    const srcLogFormatted = event.srcLog
        ? formatObjectRepr(event.srcLog.object_repr, event.srcLog.object_id)
        : null;

    return (
        <tr>
            <td colSpan={colSpan} className='p-0'>
                <div className='px-4 py-3 bg-muted/30 border-t space-y-3'>
                    {hasDetails && (
                        <div className='space-y-1.5'>
                            <div className='text-xs font-medium text-muted-foreground'>
                                Changes
                            </div>
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: formatDiff(event.details!),
                                }}
                            />
                        </div>
                    )}
                    {hasSrcLog && srcLogFormatted && (
                        <div className='space-y-1.5'>
                            <div className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2'>
                                <GitForkIcon className='size-3.5' />
                                <span>Triggered by</span>
                            </div>
                            <div className='ml-1 pl-3 border-l-2 border-primary/30'>
                                <div className='bg-background rounded-md border border-border p-3'>
                                    <div className='flex flex-wrap items-baseline gap-2 mb-2'>
                                        <Badge
                                            variant={getTypeBadgeVariant(
                                                event.srcLog!.type,
                                            )}
                                            className='capitalize text-xs'
                                        >
                                            {event.srcLog!.type}
                                        </Badge>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span
                                                    className={`text-xs cursor-help ${srcLogFormatted.isDeleted ? 'text-muted-foreground line-through' : ''}`}
                                                >
                                                    {srcLogFormatted.text}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <span className='font-mono text-xs'>
                                                    {srcLogFormatted.fullId}
                                                </span>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    {event.srcLog!.details && (
                                        <>
                                            <div className='text-xs font-medium text-muted-foreground mt-2 mb-1'>
                                                Changes
                                            </div>
                                            <div
                                                dangerouslySetInnerHTML={{
                                                    __html: formatDiff(
                                                        event.srcLog!.details,
                                                    ),
                                                }}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}

export default function ActivityList({
    objectId,
    content_type,
    username,
}: ActivityListProps) {
    const { logsApi } = useApi();
    const params = useParams({ strict: false });
    const usernameParam = (params as any).username;
    const effectiveUsername = username || usernameParam || '';

    const [filters, setFilters] = useState<SearchFilters>({
        username: effectiveUsername,
        dateRange: { from: '', to: '' },
        type: '',
        content_type: content_type,
        object_id: objectId,
    });

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const showUser = !effectiveUsername;

    const queryParams = useMemo(
        () => ({
            page,
            pageSize,
            username: filters.username || undefined,
            startDate: filters.dateRange.from
                ? new Date(filters.dateRange.from)
                : undefined,
            endDate: filters.dateRange.to ? new Date(filters.dateRange.to) : undefined,
            type: filters.type || undefined,
            contentType: filters.content_type || undefined,
            objectId: filters.object_id || undefined,
        }),
        [page, pageSize, filters],
    );

    const {
        data: logsData,
        isPending,
        isPaused,
    } = useQuery({
        queryKey: [
            'activity',
            'list',
            page,
            pageSize,
            filters.username,
            filters.dateRange.from,
            filters.dateRange.to,
            filters.object_id,
            filters.content_type,
            filters.type,
        ],
        queryFn: () => logsApi.logsList(queryParams),
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch event logs. Please try again.',
        },
    });

    const events = useMemo(() => {
        if (!logsData?.results) return [];

        const srcLogIds = new Set<string>();
        logsData.results.forEach((log: any) => {
            if (log.src_log?.id) {
                srcLogIds.add(log.src_log.id);
            }
        });

        return logsData.results
            .filter((log: any) => !srcLogIds.has(log.id))
            .map(
                (
                    log: EventLog & {
                        content_type?: string;
                        object_id?: string;
                        src_log?: any;
                    },
                ): ActivityEvent => ({
                    id: (log as any).id || '',
                    timestamp:
                        typeof log.timestamp === 'string'
                            ? log.timestamp
                            : log.timestamp instanceof Date
                              ? log.timestamp.toISOString()
                              : new Date().toISOString(),
                    type: log.type,
                    username: log.user?.username || 'unknown',
                    contentType:
                        (log as any).content_type ||
                        (log as any).contentType ||
                        'unknown',
                    objectId: (log as any).object_id || (log as any).objectId || '',
                    objectRepr: log.objectRepr || '',
                    details: log.details || undefined,
                    srcLog: log.srcLog
                        ? {
                              id: log.srcLog.id,
                              type: log.srcLog.type,
                              details: log.srcLog.details,
                              content_type: log.srcLog.content_type,
                              object_id: log.srcLog.object_id,
                              object_repr: log.srcLog.object_repr,
                          }
                        : undefined,
                }),
            );
    }, [logsData?.results]);

    const totalPages = logsData?.totalPages || 1;
    const loading = isPending && !isPaused;

    // Column definitions (TanStack Table)
    const columns = useMemo<ColumnDef<ActivityEvent>[]>(
        () => [
            {
                accessorKey: 'type',
                id: 'action',
                header: 'Action',
                meta: { label: 'Action' },
                size: 80,
                cell: ({ row }) => {
                    const event = row.original;
                    const hasSrcLog = !!event.srcLog;
                    return (
                        <div className='flex items-center gap-1.5'>
                            <Badge
                                variant={getTypeBadgeVariant(event.type)}
                                className='capitalize'
                            >
                                {event.type}
                            </Badge>
                            {hasSrcLog && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className='text-muted-foreground'>
                                            <GitForkIcon className='size-3.5' />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <span className='text-xs'>
                                            Triggered by another event
                                        </span>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    );
                },
                enableSorting: false,
            },
            ...(showUser
                ? [
                      {
                          accessorKey: 'username',
                          id: 'user',
                          header: 'User',
                          meta: { label: 'User' },
                          size: 120,
                          cell: ({ row }: any) => (
                              <span className='text-muted-foreground'>
                                  {row.original.username}
                              </span>
                          ),
                          enableSorting: false,
                      } satisfies ColumnDef<ActivityEvent>,
                  ]
                : []),
            {
                accessorKey: 'contentType',
                id: 'type',
                header: 'Type',
                meta: { label: 'Type' },
                size: 100,
                cell: ({ row }) => (
                    <span className='text-muted-foreground capitalize'>
                        {row.original.contentType}
                    </span>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'objectRepr',
                id: 'object',
                header: 'Object',
                meta: { label: 'Object' },
                cell: ({ row }) => {
                    const event = row.original;
                    const { text, fullId, isDeleted } = formatObjectRepr(
                        event.objectRepr,
                        event.objectId,
                    );
                    const isExpandable = !!event.details || !!event.srcLog;
                    const isExpanded = expandedRows[event.id] ?? false;
                    return (
                        <div className='flex items-center gap-2'>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span
                                        className={`cursor-help ${isDeleted ? 'text-muted-foreground line-through' : ''}`}
                                    >
                                        {text}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <span className='font-mono text-xs'>{fullId}</span>
                                </TooltipContent>
                            </Tooltip>
                            {isExpandable && (
                                <CaretDownIcon
                                    className={`size-4 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            )}
                        </div>
                    );
                },
                enableSorting: false,
            },
            {
                accessorKey: 'timestamp',
                id: 'date',
                header: () => <span className='block text-right'>Date</span>,
                meta: { label: 'Date' },
                size: 140,
                cell: ({ row }) => (
                    <div className='text-right text-muted-foreground text-sm'>
                        {format(new Date(row.original.timestamp), 'dd/MM/yyyy HH:mm')}
                    </div>
                ),
                enableSorting: false,
            },
        ],
        [showUser, expandedRows],
    );

    // Pagination handler
    const handlePaginationChange = useCallback(
        (pageIndex: number, newPageSize: number) => {
            const newPage = pageIndex + 1;
            if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
                setPage(1);
            } else if (newPage !== page) {
                setPage(newPage);
            }
        },
        [page, pageSize],
    );

    const table = useReactTable({
        data: events,
        columns,
        state: {
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
        },
        onPaginationChange: (updater) => {
            const current = { pageIndex: page - 1, pageSize };
            const next = typeof updater === 'function' ? updater(current) : updater;
            handlePaginationChange(next.pageIndex, next.pageSize);
        },
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: totalPages,
    });

    const handleFilterChange = useCallback((update: Partial<SearchFilters>) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(1);
    }, []);

    const toggleRowExpanded = (eventId: string) => {
        setExpandedRows((prev) => ({
            ...prev,
            [eventId]: !prev[eventId],
        }));
    };

    return (
        <div className='flex w-full flex-col gap-2.5 overflow-auto'>
            {/* Toolbar */}
            <div
                role='toolbar'
                aria-orientation='horizontal'
                className='flex w-full items-start justify-between gap-2 py-1'
            >
                <div className='flex flex-1 flex-wrap items-center gap-2'>
                    {/* Username input */}
                    <div className='relative w-[200px]'>
                        <MagnifyingGlassIcon className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                        <Input
                            type='text'
                            name='username'
                            value={filters.username}
                            onChange={(e) =>
                                handleFilterChange({ username: e.target.value })
                            }
                            placeholder='Search by username...'
                            className='pl-9 h-8'
                        />
                    </div>

                    {/* Date range filter */}
                    <DateRangeFilterButton
                        title='Date'
                        value={filters.dateRange}
                        onChange={(dateRange) => handleFilterChange({ dateRange })}
                    />

                    {/* Type filter */}
                    <EventTypeFilter
                        value={filters.type}
                        onChange={(type) => handleFilterChange({ type })}
                    />
                </div>
                <DataTableViewOptions table={table} />
            </div>

            {/* Results */}
            {isPaused && <OfflineIndicator />}

            {loading ? (
                <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                    <Spinner className='size-10' />
                </div>
            ) : (
                <>
                    <div className='overflow-hidden rounded-md border'>
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead
                                                key={header.id}
                                                colSpan={header.colSpan}
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column.columnDef
                                                              .header,
                                                          header.getContext(),
                                                      )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => {
                                        const event = row.original;
                                        const isExpandable =
                                            !!event.details || !!event.srcLog;
                                        const isExpanded =
                                            expandedRows[event.id] ?? false;
                                        return (
                                            <React.Fragment key={row.id}>
                                                <TableRow
                                                    className={
                                                        isExpandable
                                                            ? 'cursor-pointer hover:bg-muted/50'
                                                            : ''
                                                    }
                                                    onClick={() =>
                                                        isExpandable &&
                                                        toggleRowExpanded(event.id)
                                                    }
                                                >
                                                    {row
                                                        .getVisibleCells()
                                                        .map((cell) => (
                                                            <TableCell key={cell.id}>
                                                                {flexRender(
                                                                    cell.column
                                                                        .columnDef.cell,
                                                                    cell.getContext(),
                                                                )}
                                                            </TableCell>
                                                        ))}
                                                </TableRow>
                                                {isExpanded && (
                                                    <ExpandedRowDetail
                                                        event={event}
                                                        colSpan={
                                                            row.getVisibleCells().length
                                                        }
                                                    />
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length}
                                            className='h-24 text-center'
                                        >
                                            No event logs found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <DataTablePagination table={table} />
                </>
            )}
        </div>
    );
}
