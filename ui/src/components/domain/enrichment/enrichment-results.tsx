import { ActionBarSearch } from '@/components/base/action-bar-controls/action-bar-controls';
import Pagination from '@/components/base/pagination/pagination';
import { DataTable } from '@/components/custom/data-table/data-table';
import { DataTableViewOptions } from '@/components/custom/data-table/data-table-view-options';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cradleJsonTheme } from '@/config/json-view';
import { queryKeys } from '@/hooks/query';
import {
    CalendarIcon,
    CaretDownIcon,
    CheckCircleIcon,
    ClockIcon,
    DownloadSimpleIcon,
    EyeSlashIcon,
    InfoIcon,
    UserIcon,
    WarningCircleIcon,
    WarningIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';

type EntrySerializerMinimal = components['schemas']['EntrySerializerMinimal'];

import NotFound from '@/components/feedback/not-found';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import {
    getCoreRowModel,
    getExpandedRowModel,
    useReactTable,
    type ColumnDef,
    type ExpandedState,
    type Row,
    type Updater,
    type VisibilityState,
} from '@tanstack/react-table';
import JsonView from '@uiw/react-json-view';
import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';

interface EntryLabel {
    subtype: string;
    name: string;
    color?: string;
}

interface RelationDisplay {
    target: EntryLabel | null;
    details: any;
}

interface EnricherArtifact {
    id?: number | string;
    name?: string;
    subtype?: string;
    color?: string;
    count?: number;
}

const normalizeId = (value?: number | string | null) => {
    if (value == null) return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(parsed) ? null : parsed;
};

function rowId(row: EnricherArtifact, index: number): string {
    const n = normalizeId(row.id);
    return n != null ? `id-${n}` : `idx-${index}`;
}

function expandedFor(
    rows: EnricherArtifact[],
    activeArtifactId: number | null,
): ExpandedState {
    if (activeArtifactId == null) return {};
    const idx = rows.findIndex((a) => normalizeId(a.id) === activeArtifactId);
    if (idx === -1) return {};
    const row = rows[idx];
    if (!row) return {};
    return { [rowId(row, idx)]: true };
}

const entryLabel = (entry?: EntrySerializerMinimal | null): EntryLabel | null => {
    if (!entry) return null;
    const subtype =
        entry.subtype || entry.entry_class?.subtype || entry.type || 'entry';
    const color = entry.color || entry.entry_class?.color;
    return {
        subtype,
        name: entry.name,
        color,
    };
};

const mapRelationsForEntry = (
    results: any[],
    activeArtifactId: number | null,
): RelationDisplay[] => {
    if (!activeArtifactId) return [];

    return results.map((result) => {
        const entries = [result.e1, result.e2].filter(Boolean);
        const targetEntry =
            entries.find((entry: any) => {
                const entryId = normalizeId(entry?.id);
                return entryId != null && entryId !== activeArtifactId;
            }) || null;

        return {
            target: entryLabel(targetEntry),
            details: result.details,
        };
    });
};

const renderEntryBadge = (entry: { subtype?: string; color?: string }) => {
    const subtype = entry.subtype ?? 'unknown';
    return (
        <Badge
            className={`rounded-full flex-shrink-0 ${!entry.color || subtype === 'enrichment' ? 'bg-muted' : ''}`}
            style={
                entry.color && subtype !== 'enrichment'
                    ? { backgroundColor: entry.color }
                    : undefined
            }
        >
            {subtype}
        </Badge>
    );
};

interface RelationItemProps {
    relation: RelationDisplay;
    isLast: boolean;
}

function RelationItem({ relation, isLast }: RelationItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasDetails = relation.details && Object.keys(relation.details).length > 0;

    return (
        <div className={`${!isLast ? 'border-b border-border/50' : ''}`}>
            <div
                className={`px-4 py-2 flex items-center gap-2 ${hasDetails ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                onClick={() => hasDetails && setIsExpanded((prev) => !prev)}
            >
                {relation.target ? (
                    <>
                        {renderEntryBadge(relation.target)}
                        <span className='text-foreground text-sm'>
                            {relation.target.name}
                        </span>
                    </>
                ) : (
                    <span className='text-muted-foreground text-sm'>No target</span>
                )}
                {hasDetails && (
                    <CaretDownIcon
                        className={`size-3 text-muted-foreground transition-transform flex-shrink-0 ml-auto ${isExpanded ? 'rotate-180' : ''}`}
                    />
                )}
            </div>
            {hasDetails && isExpanded && (
                <div className='px-4 pb-3 ml-6'>
                    <JsonView
                        value={relation.details}
                        collapsed={1}
                        displayDataTypes={false}
                        displayObjectSize={false}
                        enableClipboard={true}
                        style={{
                            backgroundColor: 'transparent',
                            fontSize: '12px',
                            ...cradleJsonTheme,
                        }}
                    />
                </div>
            )}
        </div>
    );
}

function ArtifactRelationsPanel({
    isLoading,
    relations,
}: {
    isLoading: boolean;
    relations: RelationDisplay[];
}) {
    if (isLoading) {
        return (
            <div className='flex items-center justify-center py-6'>
                <Spinner className='size-10' />
            </div>
        );
    }
    if (relations.length === 0) {
        return (
            <Empty className='border-0 p-3'>
                <EmptyHeader className='max-w-none'>
                    <EmptyDescription>No relations found.</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }
    return (
        <>
            {relations.map((relation, idx) => (
                <RelationItem
                    key={idx}
                    relation={relation}
                    isLast={idx === relations.length - 1}
                />
            ))}
        </>
    );
}

/**
 * EnrichmentResults component - displays enrichment results for a request
 *
 * Technique selector and main area show artifacts, relations, warnings, and errors.
 *
 * @example
 * ```tsx
 * <EnrichmentResults />
 * ```
 */
export default function EnrichmentResults() {
    const params = useParams({ strict: false });
    const id = (params as any).id;

    const [selectedEnricher, setSelectedEnricher] = useState<string | null>(null);
    const [activeArtifactId, setActiveArtifactId] = useState<number | null>(null);
    const [isShowingIgnored, setIsShowingIgnored] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [applied, setApplied] = useState('');
    const [draft, setDraft] = useState('');
    const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    useEffect(() => {
        setPage(1);
    }, [applied]);

    const {
        data: requestDetail,
        isLoading,
        isError,
    } = useQuery({
        queryKey: queryKeys.enrichment.results.detail(String(id)),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/enrich/{id}/',
                { params: { path: { id } } },
            );
            if (error) throw { response, error };
            return data;
        },
        retry: false,
        meta: {
            showErrorToast: false,
        },
    });

    const request = requestDetail as any;

    const dockPanelTitle = useMemo(() => {
        if (isError) {
            return 'Not found';
        }
        if (!id) {
            return 'Enrichment';
        }
        const t = request?.title;
        if (typeof t === 'string' && t.trim().length > 0) {
            const s = t.length > 48 ? `${t.slice(0, 45)}…` : t;
            return `Enrichment: ${s}`;
        }
        return `Enrichment: Request #${id}`;
    }, [id, isError, request?.title]);

    useDockPanelTab({
        title: dockPanelTitle,
        icon: isError ? 'not-found' : 'enrichment',
    });

    useEffect(() => {
        if (request?.enrichers && request.enrichers.length > 0 && !selectedEnricher) {
            const first = request.enrichers[0];
            setSelectedEnricher(first.enricher_type ?? first.enricherType);
        }
    }, [request, selectedEnricher]);

    const { data: enricherResults, isLoading: isEnricherLoading } = useQuery({
        queryKey: queryKeys.enrichment.results.detail(`${id}-${selectedEnricher}`),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/enrich/{id}/{enricher_type}/',
                {
                    params: {
                        path: { id, enricher_type: selectedEnricher! },
                    },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        enabled: !!selectedEnricher && !isShowingIgnored,
        meta: {
            showErrorToast: true,
        },
    });

    const { data: relationsPage, isLoading: isRelationsLoading } = useQuery({
        queryKey: queryKeys.enrichment.results.relations({
            id: String(id),
            enricherType: selectedEnricher!,
            entryId: activeArtifactId ?? undefined,
            page,
            pageSize,
            search: applied.trim() || undefined,
        }),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/enrich/{id}/{enricher_type}/relations/',
                {
                    params: {
                        path: {
                            id,
                            enricher_type: selectedEnricher!,
                        },
                        query: {
                            entry_id: activeArtifactId!,
                            page,
                            page_size: pageSize,
                            ...(applied.trim() ? { search: applied.trim() } : {}),
                        },
                    },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        enabled: !!selectedEnricher && !isShowingIgnored && !!activeArtifactId,
        meta: {
            showErrorToast: true,
        },
    });

    const results = useMemo(
        () => relationsPage?.results ?? [],
        [relationsPage?.results],
    );
    const totalPages =
        relationsPage?.total_pages ??
        (relationsPage as { totalPages?: number })?.totalPages ??
        1;
    const rows = useMemo(
        () => (enricherResults?.artifacts || []) as EnricherArtifact[],
        [enricherResults?.artifacts],
    );
    const relations = useMemo(
        () => mapRelationsForEntry(results, activeArtifactId),
        [results, activeArtifactId],
    );

    const enricherLabel =
        request?.enrichers?.find(
            (item: any) =>
                (item.enricher_type ?? item.enricherType) === selectedEnricher,
        )?.display_name ??
        request?.enrichers?.find(
            (item: any) =>
                (item.enricher_type ?? item.enricherType) === selectedEnricher,
        )?.displayName ??
        selectedEnricher;

    const expandedState = useMemo(
        () => expandedFor(rows, activeArtifactId),
        [rows, activeArtifactId],
    );

    const columns = useMemo<ColumnDef<EnricherArtifact>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => {
                    const tableRows = table.getRowModel().rows;
                    const allSelected =
                        tableRows.length > 0 &&
                        tableRows.every((r) => {
                            const aid = normalizeId(r.original.id);
                            return aid !== null && checkedIds.has(aid);
                        });
                    return (
                        <Checkbox
                            checked={allSelected}
                            onCheckedChange={(checked) => {
                                if (checked === true) {
                                    const allIds = rows
                                        .map((a) => normalizeId(a.id))
                                        .filter((aid): aid is number => aid !== null);
                                    setCheckedIds(new Set(allIds));
                                } else {
                                    setCheckedIds(new Set());
                                }
                            }}
                            aria-label='Select all'
                        />
                    );
                },
                cell: ({ row }) => {
                    const artifact = row.original;
                    const artifactId = normalizeId(artifact.id);
                    const artifactName = artifact.name || 'Untitled';
                    return (
                        <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                                checked={
                                    artifactId !== null && checkedIds.has(artifactId)
                                }
                                onCheckedChange={(checked) => {
                                    if (artifactId === null) return;
                                    setCheckedIds((prev) => {
                                        const next = new Set(prev);
                                        if (checked === true) {
                                            next.add(artifactId);
                                        } else {
                                            next.delete(artifactId);
                                        }
                                        return next;
                                    });
                                }}
                                aria-label={`Select ${artifactName}`}
                            />
                        </div>
                    );
                },
                enableHiding: false,
                size: 40,
            },
            {
                id: 'enricher',
                meta: { label: 'Enricher' },
                accessorFn: (row) => row.subtype ?? row.name ?? '',
                header: 'Enricher',
                cell: () => (
                    <span className='text-sm text-foreground'>{enricherLabel}</span>
                ),
            },
            {
                id: 'artifact',
                meta: { label: 'Artifact' },
                accessorFn: (row) => row.name ?? '',
                header: 'Artifact',
                enableHiding: false,
                cell: ({ row }) => {
                    const artifact = row.original;
                    const badge = renderEntryBadge(artifact);
                    const artifactName = artifact.name || 'Untitled';
                    const isExpanded = row.getIsExpanded();
                    const artifactId = normalizeId(artifact.id);
                    const relationCount =
                        artifact.count ??
                        (isExpanded && artifactId === activeArtifactId
                            ? relations.length
                            : undefined);
                    return (
                        <div className='flex items-center gap-2'>
                            {badge}
                            <span className='text-foreground truncate'>
                                {artifactName}
                            </span>
                            {relationCount !== undefined && (
                                <span className='text-muted-foreground text-xs ml-auto'>
                                    {relationCount} result
                                    {relationCount !== 1 ? 's' : ''}
                                </span>
                            )}
                            <CaretDownIcon
                                className={`size-4 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                        </div>
                    );
                },
            },
        ],
        [rows, relations, activeArtifactId, checkedIds, enricherLabel],
    );

    const syncExpanded = useCallback(
        (updater: Updater<ExpandedState>) => {
            const prev = expandedFor(rows, activeArtifactId);
            const next =
                typeof updater === 'function'
                    ? (updater as (p: ExpandedState) => ExpandedState)(prev)
                    : updater;
            if (next === true) {
                return;
            }
            if (!next || typeof next !== 'object') {
                setActiveArtifactId(null);
                return;
            }
            const openEntries = Object.entries(next as Record<string, boolean>).filter(
                ([, v]) => v,
            );
            if (openEntries.length === 0) {
                setActiveArtifactId(null);
                return;
            }
            const lastOpen = openEntries[openEntries.length - 1];
            if (!lastOpen) {
                setActiveArtifactId(null);
                return;
            }
            const key = lastOpen[0];
            if (key.startsWith('id-')) {
                setActiveArtifactId(Number(key.slice(3)));
                setPage(1);
                return;
            }
            if (key.startsWith('idx-')) {
                const i = Number(key.slice(4));
                setActiveArtifactId(normalizeId(rows[i]?.id));
                setPage(1);
            }
        },
        [rows, activeArtifactId],
    );

    const table = useReactTable({
        data: rows,
        columns,
        state: {
            columnVisibility,
            expanded: expandedState,
        },
        onColumnVisibilityChange: setColumnVisibility,
        onExpandedChange: syncExpanded,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getRowId: (row, index) => rowId(row, index),
        getRowCanExpand: () => true,
    });

    const subRow = useCallback(
        (row: Row<EnricherArtifact>) => {
            const aid = normalizeId(row.original.id);
            const isSelected = aid === activeArtifactId;
            return (
                <div className='bg-muted/30 border-t'>
                    <ArtifactRelationsPanel
                        isLoading={isSelected && isRelationsLoading}
                        relations={isSelected ? relations : []}
                    />
                </div>
            );
        },
        [isRelationsLoading, relations, activeArtifactId],
    );

    const statusIcon = (status?: string) => {
        if (!status) return null;

        switch (status) {
            case 'done':
                return (
                    <CheckCircleIcon className='text-primary' size={18} weight='fill' />
                );
            case 'working':
            case 'waiting':
                return <InfoIcon className='text-primary' size={18} weight='fill' />;
            case 'warning':
                return (
                    <WarningIcon
                        className='text-muted-foreground'
                        size={18}
                        weight='fill'
                    />
                );
            case 'error':
                return (
                    <WarningCircleIcon
                        className='text-destructive'
                        size={18}
                        weight='fill'
                    />
                );
            default:
                return null;
        }
    };

    const download = () => {
        if (!results || results.length === 0) return;

        const formatted = results.map((result) => {
            const entries: Array<{ type: string; name: string }> = [];

            if (result.e1) {
                entries.push({
                    type: result.e1.subtype || 'unknown',
                    name: result.e1.name || '',
                });
            }

            if (result.e2) {
                entries.push({
                    type: result.e2.subtype || 'unknown',
                    name: result.e2.name || '',
                });
            }

            return {
                entries,
                details: result.details || {},
            };
        });

        const jsonString = JSON.stringify(formatted, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `enrichment-results-${selectedEnricher || 'export'}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const selectEnricher = (type: string) => {
        setSelectedEnricher(type);
        setActiveArtifactId(null);
        setIsShowingIgnored(false);
        setPage(1);
        setApplied('');
        setDraft('');
    };

    const viewIgnored = () => {
        setSelectedEnricher(null);
        setActiveArtifactId(null);
        setIsShowingIgnored(true);
    };

    const statusDetail = () => {
        const msgs: string[] = [];
        if (request?.ignored && request.ignored.length > 0) {
            msgs.push(
                `Ignored ${request.ignored.length} artifact${request.ignored.length > 1 ? 's' : ''}`,
            );
        }
        const warn_count =
            request?.enrichers?.filter((item: any) => item.status === 'warning')
                .length || 0;
        if (warn_count > 0) {
            msgs.push(`Warnings in ${warn_count} enricher${warn_count > 1 ? 's' : ''}`);
        }
        const error_count =
            request?.enrichers?.filter((item: any) => item.status === 'error').length ||
            0;
        if (error_count > 0) {
            msgs.push(`Errors in ${error_count} enricher${error_count > 1 ? 's' : ''}`);
        }

        return msgs.join(', ');
    };

    const hasWarnings =
        !!(enricherResults as any)?.warnings &&
        (enricherResults as any).warnings.length > 0;
    const hasErrors =
        !!(enricherResults as any)?.errors &&
        (enricherResults as any).errors.length > 0;

    const ignoredArtifacts = useMemo(() => request?.ignored ?? [], [request?.ignored]);

    const ignoredRows = useMemo(
        () =>
            ignoredArtifacts.map((artifact: any, index: number) => ({
                key: `ignored-${index}`,
                artifact,
            })),
        [ignoredArtifacts],
    );

    const ignoredColumns = useMemo<ColumnDef<{ key: string; artifact: any }>[]>(
        () => [
            {
                id: 'artifact',
                header: 'Artifact',
                meta: { label: 'Artifact' },
                enableHiding: false,
                cell: ({ row }) => {
                    const artifact = row.original.artifact;
                    return (
                        <div className='flex items-center gap-2'>
                            {artifact.subtype && (
                                <Badge variant='secondary' className='flex-shrink-0'>
                                    {artifact.subtype}
                                </Badge>
                            )}
                            <span className='text-foreground truncate'>
                                {typeof artifact === 'string'
                                    ? artifact
                                    : artifact.name || JSON.stringify(artifact)}
                            </span>
                        </div>
                    );
                },
            },
        ],
        [],
    );

    const ignoredTable = useReactTable({
        data: ignoredRows,
        columns: ignoredColumns,
        getCoreRowModel: getCoreRowModel(),
        getRowId: (r) => r.key,
    });

    if (isError) {
        return (
            <NotFound message='The enrichment request you are looking for does not exist.' />
        );
    }

    return (
        <div className='w-full h-full flex flex-col overflow-hidden'>
            {request && (
                <div className='w-full border-b border-border px-4 py-4'>
                    <h1 className='text-2xl font-medium break-all text-foreground mb-2'>
                        {request.title || `Enrichment Request #${id}`}
                    </h1>
                    <div className='h-px bg-card mb-2' />
                    <div className='flex items-center gap-4 text-xs text-muted-foreground'>
                        {request.status && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className='flex items-center gap-1.5'>
                                        {statusIcon(request.status)}
                                        <span className='capitalize'>
                                            {request.status}
                                        </span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>{statusDetail()}</TooltipContent>
                            </Tooltip>
                        )}
                        {(request.created_at ?? request.createdAt) && (
                            <div className='flex items-center gap-1.5'>
                                <CalendarIcon size={14} weight='bold' />
                                <span>
                                    {format(
                                        new Date(
                                            request.created_at ?? request.createdAt,
                                        ),
                                        'dd/MM/yyyy, HH:mm',
                                    )}
                                </span>
                            </div>
                        )}
                        {(request.completed_at ?? request.completedAt) && (
                            <div className='flex items-center gap-1.5'>
                                <ClockIcon size={14} weight='bold' />
                                <span>
                                    {format(
                                        new Date(
                                            request.completed_at ?? request.completedAt,
                                        ),
                                        'dd/MM/yyyy, HH:mm',
                                    )}
                                </span>
                            </div>
                        )}
                        {(request.user_detail ?? request.userDetail) && (
                            <div className='flex items-center gap-1.5'>
                                <UserIcon size={14} weight='bold' />
                                <span>
                                    {
                                        (request.user_detail ?? request.userDetail)
                                            ?.username
                                    }
                                </span>
                            </div>
                        )}
                        {ignoredArtifacts.length > 0 && (
                            <>
                                {isShowingIgnored ? (
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-auto gap-1 px-2 py-1 text-xs text-muted-foreground'
                                        onClick={() => {
                                            const first = request.enrichers?.[0];
                                            if (first) {
                                                selectEnricher(
                                                    String(
                                                        first.enricher_type ??
                                                            first.enricherType,
                                                    ),
                                                );
                                            }
                                        }}
                                    >
                                        View enrichment results
                                    </Button>
                                ) : (
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-auto gap-1 px-2 py-1 text-xs text-muted-foreground'
                                        onClick={viewIgnored}
                                    >
                                        <EyeSlashIcon
                                            className='size-3.5'
                                            weight='bold'
                                        />
                                        Ignored ({ignoredArtifacts.length})
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
                {isLoading ? (
                    <div className='flex flex-1 items-center justify-center text-foreground'>
                        <Spinner className='size-10' />
                    </div>
                ) : (
                    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
                        <div className='flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-4'>
                            {!isShowingIgnored && selectedEnricher && (
                                <div
                                    role='toolbar'
                                    aria-orientation='horizontal'
                                    className='flex w-full shrink-0 items-start justify-between gap-2 py-1'
                                >
                                    <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
                                        <ActionBarSearch
                                            placeholder='Search relations...'
                                            name='relations-search'
                                            value={draft}
                                            debounceMs={300}
                                            className='w-full min-w-0'
                                            onValueChange={setDraft}
                                            onDebouncedChange={(v) =>
                                                setApplied((prev) =>
                                                    prev === v ? prev : v,
                                                )
                                            }
                                            onSubmit={(v) => {
                                                setApplied(v);
                                                setPage(1);
                                            }}
                                            onClear={() => {
                                                setDraft('');
                                                setApplied('');
                                                setPage(1);
                                            }}
                                        />
                                    </div>
                                    <div className='flex shrink-0 items-center gap-2'>
                                        <Button
                                            variant='outline'
                                            size='icon'
                                            className='size-8'
                                            onClick={download}
                                            disabled={
                                                !activeArtifactId ||
                                                !results ||
                                                results.length === 0
                                            }
                                            title='Download results as JSON'
                                        >
                                            <DownloadSimpleIcon
                                                size={18}
                                                weight='bold'
                                            />
                                        </Button>
                                        {rows.length > 0 && (
                                            <DataTableViewOptions
                                                table={table}
                                                align='end'
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {isShowingIgnored ? (
                                <ScrollArea className='min-h-0 flex-1 overflow-hidden rounded-md border'>
                                    <DataTable
                                        table={ignoredTable}
                                        density='compact'
                                        emptyMessage='No ignored artifacts.'
                                        showPagination={false}
                                    />
                                    <ScrollBar orientation='horizontal' />
                                </ScrollArea>
                            ) : selectedEnricher ? (
                                /* Relations View */
                                isEnricherLoading ? (
                                    <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                                        <Spinner className='size-10' />
                                    </div>
                                ) : rows.length === 0 ? (
                                    <Empty className='border-0 py-8'>
                                        <EmptyHeader className='max-w-none'>
                                            <EmptyDescription>
                                                No artifacts found.
                                            </EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                ) : (
                                    <div className='flex min-h-0 flex-1 flex-col gap-2.5'>
                                        <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border'>
                                            <ScrollArea className='min-h-0 flex-1'>
                                                <DataTable
                                                    table={table}
                                                    density='compact'
                                                    onRowClickRow={(row) =>
                                                        row.toggleExpanded()
                                                    }
                                                    interactiveRow={() => true}
                                                    renderSubRow={subRow}
                                                    getCellProps={(cell) =>
                                                        cell.column.id === 'select'
                                                            ? {
                                                                  onClick: (
                                                                      e: MouseEvent<HTMLTableCellElement>,
                                                                  ) =>
                                                                      e.stopPropagation(),
                                                              }
                                                            : undefined
                                                    }
                                                    emptyMessage='No artifacts found.'
                                                    showPagination={false}
                                                />
                                                <ScrollBar orientation='horizontal' />
                                            </ScrollArea>
                                        </div>
                                        {activeArtifactId && (
                                            <div className='flex flex-col gap-2.5'>
                                                <Pagination
                                                    currentPage={page}
                                                    totalPages={totalPages}
                                                    onPageChange={setPage}
                                                    pageSize={pageSize}
                                                    onPageSizeChange={(size) => {
                                                        setPageSize(size);
                                                        setPage(1);
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : (
                                <Card className='border-border bg-muted/5'>
                                    <CardContent className='py-8'>
                                        <p className='text-center text-sm text-muted-foreground'>
                                            Select an enrichment technique to view
                                            results
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {!isShowingIgnored && selectedEnricher && hasWarnings && (
                                <div className='mt-4'>
                                    <h3 className='text-sm font-semibold mb-2'>
                                        Warnings
                                    </h3>
                                    <Card className='border-border bg-muted/5'>
                                        <CardContent className='p-0'>
                                            <div className='divide-y divide-border'>
                                                {(enricherResults as any)!.warnings!.map(
                                                    (warning: any, index: number) => (
                                                        <div
                                                            key={index}
                                                            className='px-4 py-3 flex items-center gap-3 border-l-2 border-l-muted-foreground'
                                                        >
                                                            <WarningIcon
                                                                className='text-muted-foreground flex-shrink-0'
                                                                width='16'
                                                                height='16'
                                                            />
                                                            <span className='flex-1 text-sm text-foreground'>
                                                                {typeof warning ===
                                                                'string'
                                                                    ? warning
                                                                    : JSON.stringify(
                                                                          warning,
                                                                      )}
                                                            </span>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {!isShowingIgnored && selectedEnricher && hasErrors && (
                                <div className='mt-4'>
                                    <h3 className='text-sm font-semibold mb-2'>
                                        Errors
                                    </h3>
                                    <Card className='border-border bg-muted/5'>
                                        <CardContent className='p-0'>
                                            <div className='divide-y divide-border'>
                                                {(enricherResults as any)!.errors!.map(
                                                    (error: any, index: number) => (
                                                        <div
                                                            key={index}
                                                            className='px-4 py-3 flex items-center gap-3 border-l-2 border-l-red-500'
                                                        >
                                                            <WarningCircleIcon
                                                                className='text-destructive flex-shrink-0'
                                                                width='16'
                                                                height='16'
                                                            />
                                                            <span className='flex-1 text-sm text-foreground'>
                                                                {typeof error ===
                                                                'string'
                                                                    ? error
                                                                    : JSON.stringify(
                                                                          error,
                                                                      )}
                                                            </span>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
