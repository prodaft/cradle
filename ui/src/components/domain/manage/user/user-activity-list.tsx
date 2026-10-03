import { ActionBarSearch } from '@/components/base/action-bar-controls/action-bar-controls';
import { TableSkeleton } from '@/components/base/table-skeleton';
import { DataTable } from '@/components/custom/data-table/data-table';
import { DataTableViewOptions } from '@/components/custom/data-table/data-table-view-options';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CaretDownIcon, GitForkIcon } from '@phosphor-icons/react';
import { $api } from '@services/openapi/client';
import type { operations } from '@services/openapi/schema';
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
import { useCallback, useMemo, useState } from 'react';

interface UserActivityListProps {
    username: string;
}

type EventLogsListQuery = NonNullable<
    operations['event_logs_list']['parameters']['query']
>;

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

const parseRepr = (
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
        ? parseRepr(item.srcLog.object_repr, item.srcLog.object_id)
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

export default function UserActivityList({ username }: UserActivityListProps) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [appliedSearch, setAppliedSearch] = useState('');
    const [expanded, setExpanded] = useState<ExpandedState>({});

    const listQuery = useMemo((): EventLogsListQuery => {
        return Object.fromEntries(
            Object.entries({
                page,
                page_size: pageSize,
                username: username || undefined,
                search: appliedSearch.trim() || undefined,
            }).filter(([, v]) => v !== undefined),
        ) as EventLogsListQuery;
    }, [page, pageSize, username, appliedSearch]);

    const applySearch = useCallback((value: string) => {
        setAppliedSearch(value);
        setPage(1);
    }, []);

    const { data: logsPage, isLoading } = $api.useQuery(
        'get',
        '/logs/',
        {
            params: { query: listQuery },
        },
        {
            enabled: !!username,
            meta: {
                showErrorToast: true,
            },
        },
    );

    const totalPages = logsPage?.total_pages || 1;
    const totalCount = logsPage?.count || 0;

    const rows = useMemo(() => {
        if (!logsPage?.results) return [];

        return logsPage.results.map((log: any): ActivityEvent => ({
            id: log.id || '',
            timestamp:
                typeof log.timestamp === 'string'
                    ? log.timestamp
                    : new Date().toISOString(),
            type: log.type,
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
            {
                accessorKey: 'contentType',
                id: 'type',
                header: 'Content type',
                meta: { label: 'Content type' },
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
                    const { label, fullId, isDeleted } = parseRepr(
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
        [],
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

    const toggleRow = useCallback((row: Row<ActivityEvent>) => {
        if (row.getCanExpand()) row.toggleExpanded();
    }, []);

    const renderExpandedRow = useCallback(
        (row: Row<ActivityEvent>) => <ExpandedRowDetail item={row.original} />,
        [],
    );

    if (!username) {
        return null;
    }

    return (
        <div className='flex flex-col space-y-4'>
            <DataTable
                table={table}
                isLoading={isLoading}
                loadingPlaceholder={
                    <TableSkeleton showToolbar={false} rows={8} columns={5} />
                }
                showPagination={!isLoading}
                toolbarEnd={<DataTableViewOptions table={table} />}
                onRowClickRow={toggleRow}
                interactiveRow={(row) => row.getCanExpand()}
                renderSubRow={renderExpandedRow}
                emptyMessage='No activity found for this user.'
            >
                <ActionBarSearch
                    placeholder='Search object id, type, details...'
                    name='user_activity_search'
                    value={appliedSearch}
                    debounceMs={300}
                    onDebouncedChange={applySearch}
                    onSubmit={applySearch}
                    onClear={() => applySearch('')}
                    className='w-full min-w-[12rem] max-w-md sm:w-72'
                />
            </DataTable>
        </div>
    );
}
