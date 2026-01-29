import Pagination from '@/components/base/Pagination/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import useApi from '@/hooks/api/useApi';
import { CaretDownIcon, GitForkIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import type { EventLog } from '@services/cradle/models';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import { diff_match_patch } from 'diff-match-patch';
import { useMemo, useState } from 'react';
import OfflineIndicator from '../../feedback/OfflineIndicator';

interface SearchFilters {
    username: string;
    start_date: string;
    end_date: string;
    type: string;
    content_type?: string;
    object_id?: string;
}

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

function ActivityRow({ event, showUser }: { event: ActivityEvent; showUser: boolean }) {
    const [open, setOpen] = useState(false);
    console.log(event);

    const hasDetails = !!event.details;
    const hasSrcLog = !!event.srcLog;
    const isExpandable = hasDetails || hasSrcLog;

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
            className={isExpandable ? 'cursor-pointer hover:bg-muted/50' : ''}
            onClick={() => isExpandable && setOpen(!open)}
        >
            <TableCell>
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
            </TableCell>
            {showUser && (
                <TableCell className='text-muted-foreground'>
                    {event.username}
                </TableCell>
            )}
            <TableCell>
                <span className='text-muted-foreground capitalize'>
                    {event.contentType}
                </span>
            </TableCell>
            <TableCell>
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
                    {isExpandable && (
                        <CaretDownIcon
                            className={`size-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
                        />
                    )}
                </div>
            </TableCell>
            <TableCell className='text-right text-muted-foreground text-sm'>
                {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm')}
            </TableCell>
        </TableRow>
    );

    if (!isExpandable) {
        return rowContent;
    }

    const colSpan = showUser ? 5 : 4;

    return (
        <Collapsible open={open} onOpenChange={setOpen} asChild>
            <>
                <CollapsibleTrigger asChild>{rowContent}</CollapsibleTrigger>
                <CollapsibleContent asChild>
                    <tr>
                        <td colSpan={colSpan} className='p-0'>
                            <div className='px-4 py-3 bg-muted/30 border-t space-y-3'>
                                {/* Main event details */}
                                {hasDetails && (
                                    <div className='space-y-1.5'>
                                        <div className='text-xs font-medium text-muted-foreground mb-1.5'>
                                            Changes
                                        </div>
                                        <div
                                            dangerouslySetInnerHTML={{
                                                __html: formatDiff(event.details!),
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Source log section */}
                                {hasSrcLog && srcLogFormatted && (
                                    <div className='space-y-1.5'>
                                        <div className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2'>
                                            <GitForkIcon className='size-3.5' />
                                            <span>Triggered by</span>
                                        </div>
                                        <div className='ml-1 pl-3 border-l-2 border-primary/30'>
                                            <div className='bg-background rounded-md border border-border p-3'>
                                                {/* Source log header */}
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

                                                {/* Source log details/diff */}
                                                {event.srcLog!.details && (
                                                    <div className='mt-2'>
                                                        <div className='text-xs font-medium text-muted-foreground mb-1'>
                                                            Changes
                                                        </div>
                                                        <div
                                                            dangerouslySetInnerHTML={{
                                                                __html: formatDiff(
                                                                    event.srcLog!
                                                                        .details,
                                                                ),
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </td>
                    </tr>
                </CollapsibleContent>
            </>
        </Collapsible>
    );
}

export default function ActivityList({
    name,
    objectId,
    content_type,
    username,
}: ActivityListProps) {
    const { logsApi } = useApi();
    const params = useParams({ strict: false });
    const usernameParam = (params as any).username;
    const effectiveUsername = username || usernameParam || '';

    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        username: effectiveUsername,
        start_date: dayjs(0).format('YYYY-MM-DDTHH:mm'),
        end_date: dayjs().format('YYYY-MM-DDTHH:mm'),
        type: '',
        content_type: content_type,
        object_id: objectId,
    });

    const [submittedFilters, setSubmittedFilters] =
        useState<SearchFilters>(searchFilters);

    const [page, setPage] = useState(1);

    const queryParams = useMemo(
        () => ({
            page,
            username: submittedFilters.username || undefined,
            startDate: submittedFilters.start_date
                ? new Date(submittedFilters.start_date)
                : undefined,
            endDate: submittedFilters.end_date
                ? new Date(submittedFilters.end_date)
                : undefined,
            type: submittedFilters.type || undefined,
            contentType: submittedFilters.content_type || undefined,
            objectId: submittedFilters.object_id || undefined,
        }),
        [page, submittedFilters],
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
            submittedFilters.username,
            submittedFilters.object_id,
            submittedFilters.content_type,
            submittedFilters.type,
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
    const totalCount = logsData?.count || 0;
    const loading = isPending && !isPaused;
    const showUser = !effectiveUsername;

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSubmittedFilters({ ...searchFilters });
    };

    return (
        <div className='w-full h-full overflow-auto flex flex-col space-y-4'>
            {/* Filters */}
            <form
                onSubmit={handleSearchSubmit}
                className='flex flex-wrap gap-4 items-end'
            >
                {/* Username input */}
                <div className='relative flex-1 min-w-[200px]'>
                    <MagnifyingGlassIcon className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                    <Input
                        type='text'
                        name='username'
                        value={searchFilters.username}
                        onChange={(e) =>
                            setSearchFilters((prev) => ({
                                ...prev,
                                username: e.target.value,
                            }))
                        }
                        placeholder='Search by username...'
                        className='pl-9'
                    />
                </div>

                {/* Date range picker */}
                <div className='flex-1 min-w-[320px]'>
                    <DateRangePicker
                        startDate={
                            searchFilters.start_date
                                ? new Date(searchFilters.start_date)
                                : null
                        }
                        endDate={
                            searchFilters.end_date
                                ? new Date(searchFilters.end_date)
                                : null
                        }
                        onChange={([start, end]) => {
                            const normalizedStart = start
                                ? dayjs(start).startOf('day').toDate()
                                : null;
                            const normalizedEnd = start
                                ? dayjs(end ?? start)
                                      .endOf('day')
                                      .toDate()
                                : null;
                            setSearchFilters((prev) => ({
                                ...prev,
                                start_date: normalizedStart
                                    ? format(normalizedStart, "yyyy-MM-dd'T'HH:mm")
                                    : '',
                                end_date: normalizedEnd
                                    ? format(normalizedEnd, "yyyy-MM-dd'T'HH:mm")
                                    : '',
                            }));
                        }}
                        className='h-9 w-full max-w-full font-mono'
                    />
                </div>

                {/* Type selector */}
                <div className='min-w-[140px]'>
                    <Select
                        value={searchFilters.type || 'any'}
                        onValueChange={(value) => {
                            setSearchFilters((prev) => ({
                                ...prev,
                                type: value === 'any' ? '' : value,
                            }));
                        }}
                    >
                        <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Any Type' />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value='any'>Any Type</SelectItem>
                            <SelectItem value='create'>Create</SelectItem>
                            <SelectItem value='edit'>Edit</SelectItem>
                            <SelectItem value='delete'>Delete</SelectItem>
                            <SelectItem value='fetch'>Fetch</SelectItem>
                            <SelectItem value='login'>Login</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Search button */}
                <Button type='submit' variant='outline'>
                    <MagnifyingGlassIcon className='size-4' />
                    Search
                </Button>
            </form>

            {/* Results */}
            {isPaused && <OfflineIndicator />}

            {loading ? (
                <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                    <Spinner className='size-10' />
                </div>
            ) : events.length > 0 ? (
                <>
                    <div className='overflow-hidden rounded-md border'>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='w-[80px]'>Action</TableHead>
                                    {showUser && (
                                        <TableHead className='w-[120px]'>
                                            User
                                        </TableHead>
                                    )}
                                    <TableHead className='w-[100px]'>Type</TableHead>
                                    <TableHead>Object</TableHead>
                                    <TableHead className='w-[140px] text-right'>
                                        Date
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.map((event) => (
                                    <ActivityRow
                                        key={event.id}
                                        event={event}
                                        showUser={showUser}
                                    />
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
                </>
            ) : (
                <div className='text-center py-8'>
                    <p className='text-sm text-muted-foreground'>
                        No event logs found.
                    </p>
                </div>
            )}
        </div>
    );
}
