import Pagination from '@/components/base/pagination/pagination';
import { Badge } from '@/components/ui/badge';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { CaretDownIcon } from '@phosphor-icons/react';
import type { ApiQuery } from '@services/openapi/api-query';
import { $api } from '@services/openapi/client';
import { format } from 'date-fns';
import { diff_match_patch } from 'diff-match-patch';
import { useMemo, useState } from 'react';

interface UserActivityListProps {
    username: string;
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

// Format object representation for display
const formatObjectRepr = (
    repr: string,
    objectId: string,
): { text: string; fullId: string; isDeleted: boolean } => {
    if (!repr) return { text: '-', fullId: '', isDeleted: false };

    // Check if deleted
    if (repr === 'DELETED') {
        return { text: 'Deleted', fullId: objectId, isDeleted: true };
    }

    // Format [[type:name]] style
    const bracketMatch = repr.match(/^\[\[([^:]+):([^\]]+)\]\]$/);
    if (bracketMatch) {
        return {
            text: `${bracketMatch[1]}:${bracketMatch[2]}`,
            fullId: objectId,
            isDeleted: false,
        };
    }

    // Format <Type:uuid> style - extract just the type
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
            // URL decode the text first
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

function ActivityRow({ event }: { event: ActivityEvent }) {
    const [open, setOpen] = useState(false);

    // Get details from event or from srcLog if event has no details
    const effectiveDetails = event.details || event.srcLog?.details;
    const hasDetails = !!effectiveDetails;

    const {
        text: objectText,
        fullId,
        isDeleted,
    } = formatObjectRepr(event.objectRepr, event.objectId);

    const srcLogFormatted = event.srcLog
        ? formatObjectRepr(event.srcLog.object_repr, event.srcLog.object_id)
        : null;

    const rowContent = (
        <TableRow
            className={hasDetails ? 'cursor-pointer hover:bg-muted/50' : ''}
            onClick={() => hasDetails && setOpen(!open)}
        >
            <TableCell>
                <Badge variant={getTypeBadgeVariant(event.type)} className='capitalize'>
                    {event.type}
                </Badge>
            </TableCell>
            <TableCell>
                <span className='text-muted-foreground capitalize'>
                    {event.contentType}
                </span>
            </TableCell>
            <TableCell>
                <div className='flex flex-col gap-0.5'>
                    <div className='flex items-center gap-2'>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span
                                    className={`cursor-help ${isDeleted ? 'text-muted-foreground line-through' : ''}`}
                                >
                                    {objectText}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <span className='font-mono text-xs'>{fullId}</span>
                            </TooltipContent>
                        </Tooltip>
                        {hasDetails && (
                            <CaretDownIcon
                                className={`size-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
                            />
                        )}
                    </div>
                    {event.srcLog && srcLogFormatted && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className='text-xs text-muted-foreground cursor-help'>
                                    via {event.srcLog.content_type}:{' '}
                                    {srcLogFormatted.text}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <span className='font-mono text-xs'>
                                    {srcLogFormatted.fullId}
                                </span>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </TableCell>
            <TableCell className='text-right text-muted-foreground text-sm'>
                {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm')}
            </TableCell>
        </TableRow>
    );

    if (!hasDetails) {
        return rowContent;
    }

    return (
        <Collapsible open={open} onOpenChange={setOpen} asChild>
            <>
                <CollapsibleTrigger asChild>{rowContent}</CollapsibleTrigger>
                <CollapsibleContent asChild>
                    <tr>
                        <td colSpan={4} className='p-0'>
                            <div className='px-4 py-3 bg-muted/30 border-t'>
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: formatDiff(effectiveDetails!),
                                    }}
                                />
                            </div>
                        </td>
                    </tr>
                </CollapsibleContent>
            </>
        </Collapsible>
    );
}

export default function UserActivityList({ username }: UserActivityListProps) {
    const [page, setPage] = useState(1);

    const eventLogsQuery = useMemo((): ApiQuery<'event_logs_list'> => {
        const q: ApiQuery<'event_logs_list'> = { page };
        if (username) q.username = username;
        return q;
    }, [page, username]);

    const { data: logsData, isLoading } = $api.useQuery(
        'get',
        '/logs/',
        {
            params: { query: eventLogsQuery },
        },
        {
            enabled: !!username,
            meta: {
                showErrorToast: true,
            },
        },
    );

    const totalPages = logsData?.total_pages || 1;
    const totalCount = logsData?.count || 0;

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

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
                    contentType: log.content_type || 'unknown',
                    objectId: log.object_id || '',
                    objectRepr: log.object_repr || '',
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
                }),
            );
    }, [logsData?.results]);

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className='text-center py-8'>
                <p className='text-sm text-muted-foreground'>
                    No activity found for this user.
                </p>
            </div>
        );
    }

    return (
        <div className='flex flex-col space-y-4'>
            <div className='overflow-hidden rounded-md border'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className='w-[80px]'>Action</TableHead>
                            <TableHead className='w-[100px]'>Type</TableHead>
                            <TableHead>Object</TableHead>
                            <TableHead className='w-[140px] text-right'>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {events.map((event) => (
                            <ActivityRow key={event.id} event={event} />
                        ))}
                    </TableBody>
                </Table>
            </div>
            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalRows={totalCount}
            />
        </div>
    );
}
