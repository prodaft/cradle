import { ActionBarSearch } from '@/components/base/action-bar/action-bar';
import type { DateRangeFilter } from '@/components/base/list-view/types';
import { TableSkeleton } from '@/components/base/table-skeleton';
import { DataTable } from '@/components/custom/data-table/data-table';
import { DateRangeFilterButton } from '@/components/custom/data-table/data-table-date-range-filter';
import { DataTableViewOptions } from '@/components/custom/data-table/data-table-view-options';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CaretDownIcon, GitForkIcon } from '@phosphor-icons/react';
import type { operations } from '@services/openapi/schema';
import { $api } from '@services/openapi/client';
import { useParams } from '@tanstack/react-router';
import {
    type ColumnDef,
    type ExpandedState,
    type Row,
    getCoreRowModel,
    getExpandedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { diff_match_patch } from 'diff-match-patch';
import { Check, PlusCircle, XCircle } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import OfflineIndicator from '../../feedback/offline-indicator';

type EventLogsListQuery = NonNullable<
    operations['event_logs_list']['parameters']['query']
>;

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
] as const;

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
    content_type: string;
    object_id: string;
    object_repr: string;
    details?: string | null;
    src_log?: SrcLog | null;
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
                        <ScrollArea className='max-h-[300px]'>
                            <CommandGroup>
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
                                            <span className='truncate'>
                                                {option.label}
                                            </span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </ScrollArea>
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
        const text = angleMatch[1] ?? '';
        const fullId = angleMatch[2] ?? '';
        return { text, fullId, isDeleted: false };
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

// Expandable detail panel for a row (rendered inside DataTable sub-row cell)
function ExpandedRowDetail({ event }: { event: ActivityEvent }) {
    const hasDetails = !!event.details;
    const hasSrcLog = !!event.src_log;
    const srcLogFormatted = event.src_log
        ? formatObjectRepr(event.src_log.object_repr, event.src_log.object_id)
        : null;

    return (
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
                                    variant={getTypeBadgeVariant(event.src_log!.type)}
                                    className='capitalize text-xs'
                                >
                                    {event.src_log!.type}
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
                            {event.src_log!.details && (
                                <>
                                    <div className='text-xs font-medium text-muted-foreground mt-2 mb-1'>
                                        Changes
                                    </div>
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: formatDiff(event.src_log!.details),
                                        }}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ActivityList({
    objectId,
    content_type,
    username,
}: ActivityListProps) {
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
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const showUser = !effectiveUsername;

    useEffect(() => {
        setFilters((prev) => ({
            ...prev,
            username: effectiveUsername,
            content_type: content_type,
            object_id: objectId,
        }));
        setPage(1);
    }, [effectiveUsername, content_type, objectId]);

    const queryParams = useMemo((): EventLogsListQuery => {
        const type: EventLogsListQuery['type'] | undefined = EVENT_TYPE_OPTIONS.some(
            (o) => o.value === filters.type,
        )
            ? (filters.type as EventLogsListQuery['type'])
            : undefined;

        return Object.fromEntries(
            Object.entries({
                page,
                page_size: pageSize,
                username: filters.username || undefined,
                start_date: filters.dateRange.from || undefined,
                end_date: filters.dateRange.to || undefined,
                type,
                content_type: filters.content_type || undefined,
                object_id: filters.object_id || undefined,
            }).filter(([, v]) => v !== undefined),
        ) as EventLogsListQuery;
    }, [page, pageSize, filters]);

    const {
        data: logsData,
        isLoading,
        isPaused,
    } = $api.useQuery(
        'get',
        '/logs/',
        {
            params: { query: queryParams },
        },
        {
            meta: {
                showErrorToast: true,
            },
        },
    );

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
                (log: any): ActivityEvent => ({
                    id: log.id || '',
                    timestamp:
                        typeof log.timestamp === 'string'
                            ? log.timestamp
                            : new Date().toISOString(),
                    type: log.type,
                    username: log.user?.username || 'unknown',
                    content_type: log.content_type || 'unknown',
                    object_id: log.object_id || '',
                    object_repr: log.object_repr || '',
                    details: log.details || undefined,
                    src_log: log.src_log
                        ? {
                              id: log.src_log.id,
                              type: log.src_log.type,
                              details: log.src_log.details,
                              content_type: log.src_log.content_type,
                              object_id: log.src_log.object_id,
                              object_repr: log.src_log.object_repr,
                          }
                        : undefined,
                }),
            );
    }, [logsData?.results]);

    const totalPages = logsData?.total_pages || 1;

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
                    const hasSrcLog = !!event.src_log;
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
                accessorKey: 'content_type',
                id: 'type',
                header: 'Type',
                meta: { label: 'Type' },
                size: 100,
                cell: ({ row }) => (
                    <span className='text-muted-foreground capitalize'>
                        {row.original.content_type}
                    </span>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'object_repr',
                id: 'object',
                header: 'Object',
                meta: { label: 'Object' },
                cell: ({ row }) => {
                    const event = row.original;
                    const { text, fullId, isDeleted } = formatObjectRepr(
                        event.object_repr,
                        event.object_id,
                    );
                    return (
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
            {
                id: 'expand',
                header: () => <span className='sr-only'>Expand row</span>,
                meta: { label: 'Expand' },
                size: 36,
                enableHiding: false,
                cell: ({ row }) => {
                    if (!row.getCanExpand()) return null;
                    return (
                        <div className='flex justify-end pr-0.5'>
                            <CaretDownIcon
                                className={`size-4 shrink-0 text-muted-foreground transition-transform ${row.getIsExpanded() ? 'rotate-180' : ''}`}
                            />
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [showUser],
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
            expanded,
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
        },
        onExpandedChange: setExpanded,
        onPaginationChange: (updater) => {
            const current = { pageIndex: page - 1, pageSize };
            const next = typeof updater === 'function' ? updater(current) : updater;
            handlePaginationChange(next.pageIndex, next.pageSize);
        },
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getRowCanExpand: (row) => !!(row.original.details || row.original.src_log),
        getRowId: (row) => row.id,
        manualPagination: true,
        pageCount: totalPages,
    });

    const handleFilterChange = useCallback((update: Partial<SearchFilters>) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(1);
    }, []);

    const onRowClickRow = useCallback((row: Row<ActivityEvent>) => {
        if (row.getCanExpand()) row.toggleExpanded();
    }, []);

    const renderSubRow = useCallback(
        (row: Row<ActivityEvent>) => <ExpandedRowDetail event={row.original} />,
        [],
    );

    const skeletonColumns = showUser ? 6 : 5;

    return (
        <ScrollArea className='flex w-full flex-col gap-2.5'>
            {isPaused && <OfflineIndicator />}

            <DataTable
                table={table}
                isLoading={isLoading}
                loadingPlaceholder={
                    <TableSkeleton
                        showToolbar={false}
                        rows={8}
                        columns={skeletonColumns}
                    />
                }
                showPagination={!isLoading}
                toolbarEnd={<DataTableViewOptions table={table} />}
                onRowClickRow={onRowClickRow}
                interactiveRow={(row) => row.getCanExpand()}
                renderSubRow={renderSubRow}
                emptyMessage='No event logs found.'
            >
                <ActionBarSearch
                    placeholder='Search by username...'
                    name='username'
                    value={filters.username}
                    debounceMs={300}
                    onDebouncedChange={(username) => handleFilterChange({ username })}
                    onSubmit={(username) => handleFilterChange({ username })}
                    onClear={() => handleFilterChange({ username: '' })}
                />
                <DateRangeFilterButton
                    title='Date'
                    value={filters.dateRange}
                    onChange={(dateRange) => handleFilterChange({ dateRange })}
                />
                <EventTypeFilter
                    value={filters.type}
                    onChange={(type) => handleFilterChange({ type })}
                />
            </DataTable>
            <ScrollBar orientation='horizontal' />
        </ScrollArea>
    );
}
