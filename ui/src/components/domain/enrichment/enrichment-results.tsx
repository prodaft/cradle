import { ActionBarSearch } from '@/components/base/action-bar/action-bar';
import Pagination from '@/components/base/pagination/pagination';
import { DataTableViewOptions } from '@/components/custom/data-table/data-table-view-options';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
    type ColumnDef,
    type VisibilityState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import JsonView from '@uiw/react-json-view';
import { format } from 'date-fns';
import { ReactNode, useEffect, useMemo, useState } from 'react';

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

// Grouped row component
interface ArtifactRowProps {
    artifact: EnricherArtifact;
    artifactBadge?: ReactNode;
    enricherName: string;
    isOpen: boolean;
    onToggle: (open: boolean) => void;
    relations: RelationDisplay[];
    isLoading: boolean;
    isChecked: boolean;
    onCheckChange: (checked: boolean) => void;
    showEnricherColumn: boolean;
    showArtifactColumn: boolean;
}

function ArtifactRow({
    artifact,
    artifactBadge,
    enricherName,
    isOpen,
    onToggle,
    relations,
    isLoading,
    isChecked,
    onCheckChange,
    showEnricherColumn,
    showArtifactColumn,
}: ArtifactRowProps) {
    const relationCount = artifact.count ?? (isOpen ? relations.length : undefined);
    const artifactName = artifact.name || 'Untitled';
    const colSpan = 1 + (showEnricherColumn ? 1 : 0) + (showArtifactColumn ? 1 : 0);

    const rowContent = (
        <TableRow>
            <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => onCheckChange(checked === true)}
                    aria-label={`Select ${artifactName}`}
                />
            </TableCell>
            {showEnricherColumn && <TableCell>{enricherName}</TableCell>}
            {showArtifactColumn && (
                <TableCell>
                    <div className='flex items-center gap-2'>
                        {artifactBadge}
                        <span className='text-foreground truncate'>{artifactName}</span>
                        {relationCount !== undefined && (
                            <span className='text-muted-foreground text-xs ml-auto'>
                                {relationCount} result{relationCount !== 1 ? 's' : ''}
                            </span>
                        )}
                        <CaretDownIcon
                            className={`size-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                        />
                    </div>
                </TableCell>
            )}
        </TableRow>
    );

    return (
        <Collapsible open={isOpen} onOpenChange={onToggle} asChild>
            <>
                <CollapsibleTrigger asChild>{rowContent}</CollapsibleTrigger>
                <CollapsibleContent asChild>
                    <tr>
                        <td colSpan={colSpan} className='p-0'>
                            <div className='bg-muted/30 border-t'>
                                {isLoading ? (
                                    <div className='flex items-center justify-center py-6'>
                                        <Spinner className='size-10' />
                                    </div>
                                ) : relations.length === 0 ? (
                                    <div className='px-4 py-3 text-sm text-muted-foreground'>
                                        No relations found.
                                    </div>
                                ) : (
                                    relations.map((relation, idx) => (
                                        <RelationItem
                                            key={idx}
                                            relation={relation}
                                            isLast={idx === relations.length - 1}
                                        />
                                    ))
                                )}
                            </div>
                        </td>
                    </tr>
                </CollapsibleContent>
            </>
        </Collapsible>
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

    const artifactViewColumns = useMemo<ColumnDef<EnricherArtifact>[]>(
        () => [
            {
                id: 'enricher',
                meta: { label: 'Enricher' },
                accessorFn: (row) => row.subtype ?? row.name ?? '',
                header: 'Enricher',
            },
            {
                id: 'artifact',
                meta: { label: 'Artifact' },
                accessorFn: (row) => row.name ?? '',
                header: 'Artifact',
                enableHiding: false,
            },
        ],
        [],
    );

    const artifactsViewTable = useReactTable({
        data: artifacts,
        columns: artifactViewColumns,
        state: { columnVisibility: artifactColumnVisibility },
        onColumnVisibilityChange: setArtifactColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
    });

    const showEnricherCol =
        artifactsViewTable.getColumn('enricher')?.getIsVisible() ?? true;
    const showArtifactCol =
        artifactsViewTable.getColumn('artifact')?.getIsVisible() ?? true;

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

    // Download results as JSON
    const handleDownloadResults = () => {
        if (!results || results.length === 0) return;

        // Format the data according to specifications
        const formattedData = results.map((result) => {
            // Build entries array from e1 and e2
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

        // Create and download the file
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

    // Handle enricher selection
    const handleEnricherSelect = (enricherType: string) => {
        setSelectedEnricher(enricherType);
        setSelectedArtifactId(null);
        setShowIgnored(false);
        setPage(1);
        setSearchParams('');
        setSearchInput('');
    };

    // Handle ignored artifacts selection
    const handleIgnoredSelect = () => {
        setSelectedEnricher(null);
        setSelectedArtifactId(null);
        setShowIgnored(true);
        // Query will automatically handle null when enabled is false
    };

    const handleArtifactToggle = (artifactId: number | null, open: boolean) => {
        if (open) {
            if (artifactId == null) {
                return;
            }
            setPage(1);
            setSelectedArtifactId(artifactId);
            return;
        }

        if (selectedArtifactId === artifactId) {
            setSelectedArtifactId(null);
        }
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

    const ignoredArtifacts = detailsAny?.ignored ?? [];
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
                                                table={artifactsViewTable}
                                                align='end'
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {showIgnored ? (
                                <ScrollArea className='min-h-0 flex-1 overflow-hidden rounded-md border'>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Artifact</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {ignoredArtifacts.map(
                                                (artifact: any, index: number) => (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            <div className='flex items-center gap-2'>
                                                                {artifact.subtype && (
                                                                    <Badge
                                                                        variant='secondary'
                                                                        className='flex-shrink-0'
                                                                    >
                                                                        {
                                                                            artifact.subtype
                                                                        }
                                                                    </Badge>
                                                                )}
                                                                <span className='text-foreground truncate'>
                                                                    {typeof artifact ===
                                                                    'string'
                                                                        ? artifact
                                                                        : artifact.name ||
                                                                          JSON.stringify(
                                                                              artifact,
                                                                          )}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                    <ScrollBar orientation='horizontal' />
                                </ScrollArea>
                            ) : selectedEnricher ? (
                                /* Relations View */
                                isLoadingEnricher ? (
                                    <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                                        <Spinner className='size-10' />
                                    </div>
                                ) : artifacts.length === 0 ? (
                                    <div className='text-center py-8'>
                                        <p className='text-sm text-muted-foreground'>
                                            No artifacts found.
                                        </p>
                                    </div>
                                ) : (
                                    <div className='flex min-h-0 flex-1 flex-col gap-2.5'>
                                        <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border'>
                                            <ScrollArea className='min-h-0 flex-1'>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className='w-10'>
                                                                <Checkbox
                                                                    checked={
                                                                        artifacts.length >
                                                                            0 &&
                                                                        artifacts.every(
                                                                            (a) => {
                                                                                const id =
                                                                                    normalizeId(
                                                                                        a.id,
                                                                                    );
                                                                                return (
                                                                                    id !==
                                                                                        null &&
                                                                                    selectedArtifacts.has(
                                                                                        id,
                                                                                    )
                                                                                );
                                                                            },
                                                                        )
                                                                    }
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) => {
                                                                        if (
                                                                            checked ===
                                                                            true
                                                                        ) {
                                                                            const allIds =
                                                                                artifacts
                                                                                    .map(
                                                                                        (
                                                                                            a,
                                                                                        ) =>
                                                                                            normalizeId(
                                                                                                a.id,
                                                                                            ),
                                                                                    )
                                                                                    .filter(
                                                                                        (
                                                                                            id,
                                                                                        ): id is number =>
                                                                                            id !==
                                                                                            null,
                                                                                    );
                                                                            setSelectedArtifacts(
                                                                                new Set(
                                                                                    allIds,
                                                                                ),
                                                                            );
                                                                        } else {
                                                                            setSelectedArtifacts(
                                                                                new Set(),
                                                                            );
                                                                        }
                                                                    }}
                                                                    aria-label='Select all'
                                                                />
                                                            </TableHead>
                                                            {showEnricherCol && (
                                                                <TableHead>
                                                                    Enricher
                                                                </TableHead>
                                                            )}
                                                            {showArtifactCol && (
                                                                <TableHead>
                                                                    Artifact
                                                                </TableHead>
                                                            )}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {artifacts.map(
                                                            (artifact, index) => {
                                                                const artifactId =
                                                                    normalizeId(
                                                                        artifact.id,
                                                                    );
                                                                const artifactBadge =
                                                                    renderEntryBadge(
                                                                        artifact,
                                                                    );

                                                                const isSelected =
                                                                    artifactId !==
                                                                        null &&
                                                                    artifactId ===
                                                                        selectedArtifactId;

                                                                return (
                                                                    <ArtifactRow
                                                                        key={
                                                                            artifact.id ??
                                                                            index
                                                                        }
                                                                        artifact={
                                                                            artifact
                                                                        }
                                                                        artifactBadge={
                                                                            artifactBadge
                                                                        }
                                                                        enricherName={
                                                                            selectedEnricherName ||
                                                                            ''
                                                                        }
                                                                        isOpen={
                                                                            isSelected
                                                                        }
                                                                        onToggle={(
                                                                            open,
                                                                        ) =>
                                                                            handleArtifactToggle(
                                                                                artifactId,
                                                                                open,
                                                                            )
                                                                        }
                                                                        relations={
                                                                            isSelected
                                                                                ? relations
                                                                                : []
                                                                        }
                                                                        isLoading={
                                                                            isSelected &&
                                                                            isLoadingResults
                                                                        }
                                                                        isChecked={
                                                                            artifactId !==
                                                                                null &&
                                                                            selectedArtifacts.has(
                                                                                artifactId,
                                                                            )
                                                                        }
                                                                        onCheckChange={(
                                                                            checked,
                                                                        ) => {
                                                                            if (
                                                                                artifactId ===
                                                                                null
                                                                            )
                                                                                return;
                                                                            setSelectedArtifacts(
                                                                                (
                                                                                    prev,
                                                                                ) => {
                                                                                    const next =
                                                                                        new Set(
                                                                                            prev,
                                                                                        );
                                                                                    if (
                                                                                        checked
                                                                                    ) {
                                                                                        next.add(
                                                                                            artifactId,
                                                                                        );
                                                                                    } else {
                                                                                        next.delete(
                                                                                            artifactId,
                                                                                        );
                                                                                    }
                                                                                    return next;
                                                                                },
                                                                            );
                                                                        }}
                                                                        showEnricherColumn={
                                                                            showEnricherCol
                                                                        }
                                                                        showArtifactColumn={
                                                                            showArtifactCol
                                                                        }
                                                                    />
                                                                );
                                                            },
                                                        )}
                                                    </TableBody>
                                                </Table>
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
