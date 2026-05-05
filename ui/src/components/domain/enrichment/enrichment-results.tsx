import { ActionBarSearch } from '@/components/base/action-bar/action-bar';
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

function getArtifactRowId(row: EnricherArtifact, index: number): string {
    const n = normalizeId(row.id);
    return n != null ? `id-${n}` : `idx-${index}`;
}

function expandedFromSelectedArtifact(
    artifacts: EnricherArtifact[],
    selectedArtifactId: number | null,
): ExpandedState {
    if (selectedArtifactId == null) return {};
    const idx = artifacts.findIndex((a) => normalizeId(a.id) === selectedArtifactId);
    if (idx === -1) return {};
    const row = artifacts[idx];
    if (!row) return {};
    return { [getArtifactRowId(row, idx)]: true };
}

const getEntryLabel = (entry?: EntrySerializerMinimal | null): EntryLabel | null => {
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
    selectedEntryId: number | null,
): RelationDisplay[] => {
    if (!selectedEntryId) return [];

    return results.map((result) => {
        const entries = [result.e1, result.e2].filter(Boolean);
        const targetEntry =
            entries.find((entry: any) => {
                const entryId = normalizeId(entry?.id);
                return entryId != null && entryId !== selectedEntryId;
            }) || null;

        return {
            target: getEntryLabel(targetEntry),
            details: result.details,
        };
    });
};

// Render entry badge if subtype is not "enrichment"
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

// Individual relation item component (collapsible)
interface RelationItemProps {
    relation: RelationDisplay;
    isLast: boolean;
}

function RelationItem({ relation, isLast }: RelationItemProps) {
    const [open, setOpen] = useState(false);
    const hasDetails = relation.details && Object.keys(relation.details).length > 0;

    return (
        <div className={`${!isLast ? 'border-b border-border/50' : ''}`}>
            <div
                className={`px-4 py-2 flex items-center gap-2 ${hasDetails ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                onClick={() => hasDetails && setOpen((prev) => !prev)}
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
                        className={`size-3 text-muted-foreground transition-transform flex-shrink-0 ml-auto ${open ? 'rotate-180' : ''}`}
                    />
                )}
            </div>
            {hasDetails && open && (
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
    const [selectedArtifactId, setSelectedArtifactId] = useState<number | null>(null);
    const [showIgnored, setShowIgnored] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [searchParams, setSearchParams] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [selectedArtifacts, setSelectedArtifacts] = useState<Set<number>>(new Set());
    const [artifactColumnVisibility, setArtifactColumnVisibility] =
        useState<VisibilityState>({});

    useEffect(() => {
        setPage(1);
    }, [searchParams]);

    const {
        data: enrichmentDetails,
        isLoading: isLoadingDetails,
        isError: isErrorDetails,
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

    const detailsAny = enrichmentDetails as any;

    const dockPanelTitle = useMemo(() => {
        if (isErrorDetails) {
            return 'Not found';
        }
        if (!id) {
            return 'Enrichment';
        }
        const t = detailsAny?.title;
        if (typeof t === 'string' && t.trim().length > 0) {
            const s = t.length > 48 ? `${t.slice(0, 45)}…` : t;
            return `Enrichment: ${s}`;
        }
        return `Enrichment: Request #${id}`;
    }, [id, isErrorDetails, detailsAny?.title]);

    useDockPanelTab({
        title: dockPanelTitle,
        icon: isErrorDetails ? 'not-found' : 'enrichment',
    });

    useEffect(() => {
        if (
            detailsAny?.enrichers &&
            detailsAny.enrichers.length > 0 &&
            !selectedEnricher
        ) {
            const first = detailsAny.enrichers[0];
            setSelectedEnricher(first.enricher_type ?? first.enricherType);
        }
    }, [detailsAny, selectedEnricher]);

    const { data: enricherDetails, isLoading: isLoadingEnricher } = useQuery({
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
        enabled: !!selectedEnricher && !showIgnored,
        meta: {
            showErrorToast: true,
        },
    });

    const { data: resultsData, isLoading: isLoadingResults } = useQuery({
        queryKey: queryKeys.enrichment.results.relations({
            id: String(id),
            enricherType: selectedEnricher!,
            entryId: selectedArtifactId ?? undefined,
            page,
            pageSize,
            search: searchParams.trim() || undefined,
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
                            entry_id: selectedArtifactId!,
                            page,
                            page_size: pageSize,
                            ...(searchParams.trim()
                                ? { search: searchParams.trim() }
                                : {}),
                        },
                    },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        enabled: !!selectedEnricher && !showIgnored && !!selectedArtifactId,
        meta: {
            showErrorToast: true,
        },
    });

    const resultsAny = resultsData as any;
    const results = useMemo(() => resultsAny?.results ?? [], [resultsAny?.results]);
    const totalPages = resultsAny?.total_pages ?? resultsAny?.totalPages ?? 1;
    const artifacts = useMemo(
        () => (enricherDetails?.artifacts || []) as EnricherArtifact[],
        [enricherDetails?.artifacts],
    );
    const relations = useMemo(
        () => mapRelationsForEntry(results, selectedArtifactId),
        [results, selectedArtifactId],
    );

    const selectedEnricherName =
        detailsAny?.enrichers?.find(
            (enricher: any) =>
                (enricher.enricher_type ?? enricher.enricherType) === selectedEnricher,
        )?.display_name ??
        detailsAny?.enrichers?.find(
            (enricher: any) =>
                (enricher.enricher_type ?? enricher.enricherType) === selectedEnricher,
        )?.displayName ??
        selectedEnricher;

    const expandedState = useMemo(
        () => expandedFromSelectedArtifact(artifacts, selectedArtifactId),
        [artifacts, selectedArtifactId],
    );

    const artifactColumns = useMemo<ColumnDef<EnricherArtifact>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => {
                    const rows = table.getRowModel().rows;
                    const allSelected =
                        rows.length > 0 &&
                        rows.every((r) => {
                            const aid = normalizeId(r.original.id);
                            return aid !== null && selectedArtifacts.has(aid);
                        });
                    return (
                        <Checkbox
                            checked={allSelected}
                            onCheckedChange={(checked) => {
                                if (checked === true) {
                                    const allIds = artifacts
                                        .map((a) => normalizeId(a.id))
                                        .filter((aid): aid is number => aid !== null);
                                    setSelectedArtifacts(new Set(allIds));
                                } else {
                                    setSelectedArtifacts(new Set());
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
                                    artifactId !== null &&
                                    selectedArtifacts.has(artifactId)
                                }
                                onCheckedChange={(checked) => {
                                    if (artifactId === null) return;
                                    setSelectedArtifacts((prev) => {
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
                    <span className='text-sm text-foreground'>
                        {selectedEnricherName}
                    </span>
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
                    const artifactBadge = renderEntryBadge(artifact);
                    const artifactName = artifact.name || 'Untitled';
                    const isOpen = row.getIsExpanded();
                    const artifactId = normalizeId(artifact.id);
                    const relationCount =
                        artifact.count ??
                        (isOpen && artifactId === selectedArtifactId
                            ? relations.length
                            : undefined);
                    return (
                        <div className='flex items-center gap-2'>
                            {artifactBadge}
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
                                className={`size-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                            />
                        </div>
                    );
                },
            },
        ],
        [
            artifacts,
            relations,
            selectedArtifactId,
            selectedArtifacts,
            selectedEnricherName,
        ],
    );

    const onArtifactsExpandedChange = useCallback(
        (updater: Updater<ExpandedState>) => {
            const prev = expandedFromSelectedArtifact(artifacts, selectedArtifactId);
            const next =
                typeof updater === 'function'
                    ? (updater as (p: ExpandedState) => ExpandedState)(prev)
                    : updater;
            if (next === true) {
                return;
            }
            if (!next || typeof next !== 'object') {
                setSelectedArtifactId(null);
                return;
            }
            const openEntries = Object.entries(next as Record<string, boolean>).filter(
                ([, v]) => v,
            );
            if (openEntries.length === 0) {
                setSelectedArtifactId(null);
                return;
            }
            const lastOpen = openEntries[openEntries.length - 1];
            if (!lastOpen) {
                setSelectedArtifactId(null);
                return;
            }
            const key = lastOpen[0];
            if (key.startsWith('id-')) {
                setSelectedArtifactId(Number(key.slice(3)));
                setPage(1);
                return;
            }
            if (key.startsWith('idx-')) {
                const i = Number(key.slice(4));
                setSelectedArtifactId(normalizeId(artifacts[i]?.id));
                setPage(1);
            }
        },
        [artifacts, selectedArtifactId],
    );

    const artifactsTable = useReactTable({
        data: artifacts,
        columns: artifactColumns,
        state: {
            columnVisibility: artifactColumnVisibility,
            expanded: expandedState,
        },
        onColumnVisibilityChange: setArtifactColumnVisibility,
        onExpandedChange: onArtifactsExpandedChange,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getRowId: (row, index) => getArtifactRowId(row, index),
        getRowCanExpand: () => true,
    });

    const renderArtifactSubRow = useCallback(
        (row: Row<EnricherArtifact>) => {
            const aid = normalizeId(row.original.id);
            const isSel = aid === selectedArtifactId;
            return (
                <div className='bg-muted/30 border-t'>
                    <ArtifactRelationsPanel
                        isLoading={isSel && isLoadingResults}
                        relations={isSel ? relations : []}
                    />
                </div>
            );
        },
        [isLoadingResults, relations, selectedArtifactId],
    );

    const getStatusIcon = (status?: string) => {
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

    const handleDownloadResults = () => {
        if (!results || results.length === 0) return;

        const formattedData = results.map((result) => {
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

        const jsonString = JSON.stringify(formattedData, null, 2);
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

    const handleEnricherSelect = (enricherType: string) => {
        setSelectedEnricher(enricherType);
        setSelectedArtifactId(null);
        setShowIgnored(false);
        setPage(1);
        setSearchParams('');
        setSearchInput('');
    };

    const handleIgnoredSelect = () => {
        setSelectedEnricher(null);
        setSelectedArtifactId(null);
        setShowIgnored(true);
    };

    const errorMsg = () => {
        const msgs: string[] = [];
        if (detailsAny?.ignored && detailsAny.ignored.length > 0) {
            msgs.push(
                `Ignored ${detailsAny.ignored.length} artifact${detailsAny.ignored.length > 1 ? 's' : ''}`,
            );
        }
        const warn_count =
            detailsAny?.enrichers?.filter(
                (enricher: any) => enricher.status === 'warning',
            ).length || 0;
        if (warn_count > 0) {
            msgs.push(`Warnings in ${warn_count} enricher${warn_count > 1 ? 's' : ''}`);
        }
        const error_count =
            detailsAny?.enrichers?.filter(
                (enricher: any) => enricher.status === 'error',
            ).length || 0;
        if (error_count > 0) {
            msgs.push(`Errors in ${error_count} enricher${error_count > 1 ? 's' : ''}`);
        }

        return msgs.join(', ');
    };

    const enricherAny = enricherDetails as any;
    const hasWarnings = enricherAny?.warnings && enricherAny.warnings.length > 0;
    const hasErrors = enricherAny?.errors && enricherAny.errors.length > 0;

    const ignoredArtifacts = useMemo(
        () => detailsAny?.ignored ?? [],
        [detailsAny?.ignored],
    );

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

    if (isErrorDetails) {
        return (
            <NotFound message='The enrichment request you are looking for does not exist.' />
        );
    }

    return (
        <div className='w-full h-full flex flex-col overflow-hidden'>
            {detailsAny && (
                <div className='w-full border-b border-border px-4 py-4'>
                    <h1 className='text-2xl font-medium break-all text-foreground mb-2'>
                        {detailsAny.title || `Enrichment Request #${id}`}
                    </h1>
                    <div className='h-px bg-card mb-2' />
                    <div className='flex items-center gap-4 text-xs text-muted-foreground'>
                        {detailsAny.status && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className='flex items-center gap-1.5'>
                                        {getStatusIcon(detailsAny.status)}
                                        <span className='capitalize'>
                                            {detailsAny.status}
                                        </span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>{errorMsg()}</TooltipContent>
                            </Tooltip>
                        )}
                        {(detailsAny.created_at ?? detailsAny.createdAt) && (
                            <div className='flex items-center gap-1.5'>
                                <CalendarIcon size={14} weight='bold' />
                                <span>
                                    {format(
                                        new Date(
                                            detailsAny.created_at ??
                                                detailsAny.createdAt,
                                        ),
                                        'dd/MM/yyyy, HH:mm',
                                    )}
                                </span>
                            </div>
                        )}
                        {(detailsAny.completed_at ?? detailsAny.completedAt) && (
                            <div className='flex items-center gap-1.5'>
                                <ClockIcon size={14} weight='bold' />
                                <span>
                                    {format(
                                        new Date(
                                            detailsAny.completed_at ??
                                                detailsAny.completedAt,
                                        ),
                                        'dd/MM/yyyy, HH:mm',
                                    )}
                                </span>
                            </div>
                        )}
                        {(detailsAny.user_detail ?? detailsAny.userDetail) && (
                            <div className='flex items-center gap-1.5'>
                                <UserIcon size={14} weight='bold' />
                                <span>
                                    {
                                        (
                                            detailsAny.user_detail ??
                                            detailsAny.userDetail
                                        )?.username
                                    }
                                </span>
                            </div>
                        )}
                        {ignoredArtifacts.length > 0 && (
                            <>
                                {showIgnored ? (
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-auto gap-1 px-2 py-1 text-xs text-muted-foreground'
                                        onClick={() => {
                                            const first = detailsAny.enrichers?.[0];
                                            if (first) {
                                                handleEnricherSelect(
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
                                        onClick={handleIgnoredSelect}
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
                {isLoadingDetails ? (
                    <div className='flex flex-1 items-center justify-center text-foreground'>
                        <Spinner className='size-10' />
                    </div>
                ) : (
                    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
                        <div className='flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-4'>
                            {!showIgnored && selectedEnricher && (
                                <div
                                    role='toolbar'
                                    aria-orientation='horizontal'
                                    className='flex w-full shrink-0 items-start justify-between gap-2 py-1'
                                >
                                    <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
                                        <ActionBarSearch
                                            placeholder='Search relations...'
                                            name='relations-search'
                                            value={searchInput}
                                            debounceMs={300}
                                            className='w-full min-w-0'
                                            onValueChange={setSearchInput}
                                            onDebouncedChange={(v) =>
                                                setSearchParams((prev) =>
                                                    prev === v ? prev : v,
                                                )
                                            }
                                            onSubmit={(v) => {
                                                setSearchParams(v);
                                                setPage(1);
                                            }}
                                            onClear={() => {
                                                setSearchInput('');
                                                setSearchParams('');
                                                setPage(1);
                                            }}
                                        />
                                    </div>
                                    <div className='flex shrink-0 items-center gap-2'>
                                        <Button
                                            variant='outline'
                                            size='icon'
                                            className='size-8'
                                            onClick={handleDownloadResults}
                                            disabled={
                                                !selectedArtifactId ||
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
                                        {artifacts.length > 0 && (
                                            <DataTableViewOptions
                                                table={artifactsTable}
                                                align='end'
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {showIgnored ? (
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
                                isLoadingEnricher ? (
                                    <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                                        <Spinner className='size-10' />
                                    </div>
                                ) : artifacts.length === 0 ? (
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
                                                    table={artifactsTable}
                                                    density='compact'
                                                    onRowClickRow={(row) =>
                                                        row.toggleExpanded()
                                                    }
                                                    interactiveRow={() => true}
                                                    renderSubRow={renderArtifactSubRow}
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
                                        {selectedArtifactId && (
                                            <div className='flex flex-col gap-2.5'>
                                                <Pagination
                                                    currentPage={page}
                                                    totalPages={totalPages}
                                                    onPageChange={(newPage) =>
                                                        setPage(newPage)
                                                    }
                                                    pageSize={pageSize}
                                                    onPageSizeChange={(newSize) => {
                                                        setPageSize(newSize);
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

                            {!showIgnored && selectedEnricher && hasWarnings && (
                                <div className='mt-4'>
                                    <h3 className='text-sm font-semibold mb-2'>
                                        Warnings
                                    </h3>
                                    <Card className='border-border bg-muted/5'>
                                        <CardContent className='p-0'>
                                            <div className='divide-y divide-border'>
                                                {enricherAny!.warnings!.map(
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

                            {!showIgnored && selectedEnricher && hasErrors && (
                                <div className='mt-4'>
                                    <h3 className='text-sm font-semibold mb-2'>
                                        Errors
                                    </h3>
                                    <Card className='border-border bg-muted/5'>
                                        <CardContent className='p-0'>
                                            <div className='divide-y divide-border'>
                                                {enricherAny!.errors!.map(
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
