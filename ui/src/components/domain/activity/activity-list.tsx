import { ActionBarSearch } from '@/components/base/action-bar-controls/action-bar-controls';
import { TableSkeleton } from '@/components/base/table-skeleton';
import { DataTable } from '@/components/custom/data-table/data-table';
import { DateRangeFilterButton } from '@/components/custom/data-table/data-table-date-range-filter';
import { DataTableViewOptions } from '@/components/custom/data-table/data-table-view-options';
import OfflineIndicator from '@/components/feedback/offline-indicator';
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
import type { DateRangeFilter } from '@/types/list-view';
import { CaretDownIcon, GitForkIcon } from '@phosphor-icons/react';
import { $api } from '@services/openapi/client';
import type { operations } from '@services/openapi/schema';
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

type EventLogsListQuery = NonNullable<
    operations['event_logs_list']['parameters']['query']
>;

interface Filters {
    dateRange: DateRangeFilter;
    type: string;
    contentType?: string;
    objectId?: string;
}

const EVENT_TYPE_OPTIONS = [
    { value: 'create', label: 'Create' },
    { value: 'edit', label: 'Edit' },
    { value: 'delete', label: 'Delete' },
    { value: 'fetch', label: 'Fetch' },
    { value: 'login', label: 'Login' },
] as const;

interface ActivityListProps {
    objectId?: string;
    contentType?: string;
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
    repr: string;
    details?: string | null;
    srcLog?: SrcLog | null;
}

const typeBadgeVariant = (type: string) => {
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
    const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
    const hasFilter = value !== '';

    const selectType = useCallback(
        (selected: string) => {
            onChange(selected === value ? '' : selected);
            setIsTypePickerOpen(false);
        },
        [onChange, value],
    );

    const clearFilter = useCallback(
        (e?: React.MouseEvent) => {
            e?.stopPropagation();
            onChange('');
        },
        [onChange],
    );

    const label = EVENT_TYPE_OPTIONS.find((o) => o.value === value)?.label;

    return (
        <Popover open={isTypePickerOpen} onOpenChange={setIsTypePickerOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant='outline'
                    size='sm'
                    className='border-dashed font-normal'
                >
                    {hasFilter ? (
                        <span
                            role='button'
                            tabIndex={0}
                            aria-label='Clear type filter'
                            className='inline-flex rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                            onClick={(e) => {
                                e.stopPropagation();
                                clearFilter(e);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    clearFilter();
                                }
                            }}
                        >
                            <XCircle />
                        </span>
                    ) : (
                        <PlusCircle />
                    )}
                    Type
                    {hasFilter && label && (
                        <>
                            <Separator
                                orientation='vertical'
                                className='mx-0.5 data-[orientation=vertical]:h-4'
                            />
                            <Badge
                                variant='secondary'
                                className='rounded-sm px-1 font-normal'
                            >
                                {label}
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
                                            onSelect={() => selectType(option.value)}
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

const formatObjectRepr = (
    value: string,
    id: string,
): { label: string; fullId: string; isDeleted: boolean } => {
    if (!value) return { label: '-', fullId: '', isDeleted: false };

    if (value === 'DELETED') {
        return { label: 'Deleted', fullId: id, isDeleted: true };
    }

    const bracketMatch = value.match(/^\[\[([^:]+):([^\]]+)\]\]$/);
    if (bracketMatch) {
        return {
            label: `${bracketMatch[1]}:${bracketMatch[2]}`,
            fullId: id,
            isDeleted: false,
        };
    }

    const angleMatch = value.match(/^<(\w+):([^>]+)>$/);
    if (angleMatch) {
        const label = angleMatch[1] ?? '';
        const fullId = angleMatch[2] ?? '';
        return { label, fullId, isDeleted: false };
    }

    return { label: value, fullId: id, isDeleted: false };
};

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

function ExpandedRowDetail({ item }: { item: ActivityEvent }) {
    const hasDetails = !!item.details;
    const hasSource = !!item.srcLog;
    const source = item.srcLog
        ? formatObjectRepr(item.srcLog.object_repr, item.srcLog.object_id)
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
                            __html: formatDiff(item.details!),
                        }}
                    />
                </div>
            )}
            {hasSource && source && (
                <div className='space-y-1.5'>
                    <div className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2'>
                        <GitForkIcon className='size-3.5' />
                        <span>Triggered by</span>
                    </div>
                    <div className='ml-1 pl-3 border-l-2 border-primary/30'>
                        <div className='bg-background rounded-md border border-border p-3'>
                            <div className='flex flex-wrap items-baseline gap-2 mb-2'>
                                <Badge
                                    variant={typeBadgeVariant(item.srcLog!.type)}
                                    className='capitalize text-xs'
                                >
                                    {item.srcLog!.type}
                                </Badge>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span
                                            className={`text-xs cursor-help ${source.isDeleted ? 'text-muted-foreground line-through' : ''}`}
                                        >
                                            {source.label}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <span className='font-mono text-xs'>
                                            {source.fullId}
                                        </span>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            {item.srcLog!.details && (
                                <>
                                    <div className='text-xs font-medium text-muted-foreground mt-2 mb-1'>
                                        Changes
                                    </div>
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: formatDiff(item.srcLog!.details),
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
    contentType,
    username,
}: ActivityListProps) {
    const params = useParams({ strict: false });
    const scope = username || (params as any).username || '';

    const [applied, setApplied] = useState(scope);
    const [filters, setFilters] = useState<Filters>({
        dateRange: { from: '', to: '' },
        type: '',
        contentType,
        objectId,
    });

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const hasUserColumn = !scope;

    useEffect(() => {
        setApplied(scope);
        setFilters((prev) => ({
            ...prev,
            contentType,
            objectId,
        }));
        setPage(1);
    }, [scope, contentType, objectId]);

    const listQuery = useMemo((): EventLogsListQuery => {
        const type: EventLogsListQuery['type'] | undefined = EVENT_TYPE_OPTIONS.some(
            (o) => o.value === filters.type,
        )
            ? (filters.type as EventLogsListQuery['type'])
            : undefined;

        return Object.fromEntries(
            Object.entries({
                page,
                page_size: pageSize,
                username: applied || undefined,
                start_date: filters.dateRange.from || undefined,
                end_date: filters.dateRange.to || undefined,
                type,
                content_type: filters.contentType || undefined,
                object_id: filters.objectId || undefined,
            }).filter(([, v]) => v !== undefined),
        ) as EventLogsListQuery;
    }, [page, pageSize, filters, applied]);

    const {
        data: logsPage,
        isLoading,
        isPaused,
    } = $api.useQuery(
        'get',
        '/logs/',
        {
            params: { query: listQuery },
        },
        {
            meta: {
                showErrorToast: true,
            },
        },
    );

    const rows = useMemo(() => {
        if (!logsPage?.results) return [];

        return logsPage.results.map((log: any): ActivityEvent => ({
            id: log.id || '',
            timestamp:
                typeof log.timestamp === 'string'
                    ? log.timestamp
                    : new Date().toISOString(),
            type: log.type,
            username: log.user?.username || 'unknown',
            contentType: log.content_type || 'unknown',
            objectId: log.object_id || '',
            repr: log.object_repr || '',
            details: log.details || undefined,
            srcLog: log.src_log
                ? {
                      id: log.src_log.id,
                      type: log.src_log.type,
                      details: log.src_log.details,
                      content_type: log.src_log.content_type,
                      object_id: log.src_log.object_id,
                      object_repr: log.src_log.object_repr,
                  }
                : undefined,
        }));
    }, [logsPage?.results]);

    const totalPages = logsPage?.total_pages || 1;
    const totalCount = logsPage?.count || 0;

    const columns = useMemo<ColumnDef<ActivityEvent>[]>(
        () => [
            {
                accessorKey: 'type',
                id: 'action',
                header: 'Type',
                meta: { label: 'Type' },
                size: 80,
                cell: ({ row }) => {
                    const item = row.original;
                    const hasSource = !!item.srcLog;
                    return (
                        <div className='flex items-center gap-1.5'>
                            <Badge
                                variant={typeBadgeVariant(item.type)}
                                className='capitalize'
                            >
                                {item.type}
                            </Badge>
                            {hasSource && (
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
            ...(hasUserColumn
                ? [
                      {
                          accessorKey: 'username',
                          id: 'user',
                          header: 'User',
                          meta: { label: 'User' },
                          size: 120,
                          cell: ({ row }: any) => {
                              const item = row.original;
                              return (
                                  <span className='text-muted-foreground'>
                                      {item.username}
                                  </span>
                              );
                          },
                          enableSorting: false,
                      } satisfies ColumnDef<ActivityEvent>,
                  ]
                : []),
            {
                accessorKey: 'contentType',
                id: 'content',
                header: 'Content',
                meta: { label: 'Content' },
                size: 100,
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <span className='text-muted-foreground capitalize'>
                            {item.contentType}
                        </span>
                    );
                },
                enableSorting: false,
            },
            {
                accessorKey: 'repr',
                id: 'object',
                header: 'Object',
                meta: { label: 'Object' },
                cell: ({ row }) => {
                    const item = row.original;
                    const { label, fullId, isDeleted } = formatObjectRepr(
                        item.repr,
                        item.objectId,
                    );
                    return (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span
                                    className={`cursor-help ${isDeleted ? 'text-muted-foreground line-through' : ''}`}
                                >
                                    {label}
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
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='text-right text-muted-foreground text-sm'>
                            {format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm')}
                        </div>
                    );
                },
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
        [hasUserColumn],
    );

    const paginate = useCallback(
        (pageIndex: number, size: number) => {
            const target = pageIndex + 1;
            if (size !== pageSize) {
                setPageSize(size);
                setPage(1);
            } else if (target !== page) {
                setPage(target);
            }
        },
        [page, pageSize],
    );

    const table = useReactTable({
        data: rows,
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
            paginate(next.pageIndex, next.pageSize);
        },
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getRowCanExpand: (row) => !!(row.original.details || row.original.srcLog),
        getRowId: (row) => row.id,
        manualPagination: true,
        pageCount: totalPages,
        rowCount: totalCount,
    });

    const applyFilters = useCallback((update: Partial<Filters>) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(1);
    }, []);

    const applySearch = useCallback((value: string) => {
        setApplied(value);
        setPage(1);
    }, []);

    const toggleRow = useCallback((row: Row<ActivityEvent>) => {
        if (row.getCanExpand()) row.toggleExpanded();
    }, []);

    const renderSubRow = useCallback(
        (row: Row<ActivityEvent>) => <ExpandedRowDetail item={row.original} />,
        [],
    );

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
                        columns={hasUserColumn ? 6 : 5}
                    />
                }
                showPagination={!isLoading}
                toolbarEnd={<DataTableViewOptions table={table} />}
                onRowClickRow={toggleRow}
                interactiveRow={(row) => row.getCanExpand()}
                renderSubRow={renderSubRow}
                emptyMessage='No event logs found.'
            >
                <ActionBarSearch
                    placeholder='Search by username...'
                    name='username'
                    value={applied}
                    debounceMs={300}
                    onDebouncedChange={applySearch}
                    onSubmit={applySearch}
                    onClear={() => applySearch('')}
                />
                <DateRangeFilterButton
                    title='Date'
                    value={filters.dateRange}
                    onChange={(dateRange) => applyFilters({ dateRange })}
                />
                <EventTypeFilter
                    value={filters.type}
                    onChange={(type) => applyFilters({ type })}
                />
            </DataTable>
            <ScrollBar orientation='horizontal' />
        </ScrollArea>
    );
}
