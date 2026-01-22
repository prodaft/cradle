import Pagination from '@/components/base/Pagination/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group';
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
import { queryKeys } from '@/hooks/query';
import ReactJson from '@microlink/react-json-view';
import {
    EnrichmentRequestDetailStatusEnum,
    EntrySerializerMinimal,
} from '@services/cradle/models';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
    CalendarIcon,
    CaretDownIcon,
    CheckCircleIcon,
    ClockIcon,
    DownloadSimpleIcon,
    EyeSlashIcon,
    InfoIcon,
    MagnifyingGlassIcon,
    UserIcon,
    WarningCircleIcon,
    WarningIcon,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';

// Interface for grouped results
interface GroupedResult {
    artifact: {
        subtype: string;
        name: string;
        color?: string;
    };
    relations: Array<{
        target: {
            subtype: string;
            name: string;
            color?: string;
        } | null;
        details: any;
    }>;
}

// Group results by source artifact
function groupResultsByArtifact(results: any[]): GroupedResult[] {
    const groups = new Map<string, GroupedResult>();
    
    for (const result of results) {
        // Get source and target entries (filter out "enrichment" type)
        const source = result.e1?.subtype !== 'enrichment' ? result.e1 : result.e2;
        const target = result.e1?.subtype !== 'enrichment' && result.e2?.subtype !== 'enrichment' 
            ? result.e2 
            : (result.e1?.subtype === 'enrichment' ? null : null);
        
        if (!source) continue;
        
        const key = `${source.subtype}:${source.name}`;
        
        if (!groups.has(key)) {
            groups.set(key, {
                artifact: {
                    subtype: source.subtype,
                    name: source.name,
                    color: source.color,
                },
                relations: [],
            });
        }
        
        groups.get(key)!.relations.push({
            target: target ? {
                subtype: target.subtype,
                name: target.name,
                color: target.color,
            } : null,
            details: result.details,
        });
    }
    
    return Array.from(groups.values());
}

// Individual relation item component (collapsible)
interface RelationItemProps {
    relation: {
        target: {
            subtype: string;
            name: string;
            color?: string;
        } | null;
        details: any;
    };
    isLast: boolean;
}

function RelationItem({ relation, isLast }: RelationItemProps) {
    const [open, setOpen] = useState(false);
    const hasDetails = relation.details && Object.keys(relation.details).length > 0;
    
    return (
        <div className={`${!isLast ? 'border-b border-border/50' : ''}`}>
            <div
                className={`px-4 py-2 flex items-center gap-2 ${hasDetails ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                onClick={() => hasDetails && setOpen(!open)}
            >
                {relation.target ? (
                    <>
                        <Badge
                            className={`rounded-full flex-shrink-0 ${!relation.target.color ? 'bg-muted' : ''}`}
                            style={relation.target.color ? { backgroundColor: relation.target.color } : undefined}
                        >
                            {relation.target.subtype}
                        </Badge>
                        <span className='text-foreground text-sm'>{relation.target.name}</span>
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
                    <ReactJson
                        src={relation.details}
                        theme='monokai'
                        collapsed={1}
                        displayDataTypes={false}
                        displayObjectSize={false}
                        enableClipboard={true}
                        style={{
                            backgroundColor: 'transparent',
                            fontSize: '12px',
                        }}
                    />
                </div>
            )}
        </div>
    );
}

// Grouped row component
interface GroupedRowProps {
    group: GroupedResult;
    enricherName: string;
}

function GroupedRow({ group, enricherName }: GroupedRowProps) {
    const [open, setOpen] = useState(false);
    
    const relationCount = group.relations.length;
    
    const rowContent = (
        <TableRow
            className='cursor-pointer hover:bg-muted/50'
            onClick={() => setOpen(!open)}
        >
            <TableCell className='text-muted-foreground capitalize'>
                {enricherName}
            </TableCell>
            <TableCell>
                <div className='flex items-center gap-2'>
                    <Badge
                        className={`rounded-full flex-shrink-0 ${!group.artifact.color ? 'bg-muted' : ''}`}
                        style={group.artifact.color ? { backgroundColor: group.artifact.color } : undefined}
                    >
                        {group.artifact.subtype}
                    </Badge>
                    <span className='text-foreground truncate'>{group.artifact.name}</span>
                    <span className='text-muted-foreground text-xs ml-auto'>
                        {relationCount} result{relationCount !== 1 ? 's' : ''}
                    </span>
                    <CaretDownIcon
                        className={`size-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
                    />
                </div>
            </TableCell>
        </TableRow>
    );

    return (
        <Collapsible open={open} onOpenChange={setOpen} asChild>
            <>
                <CollapsibleTrigger asChild>{rowContent}</CollapsibleTrigger>
                <CollapsibleContent asChild>
                    <tr>
                        <td colSpan={2} className='p-0'>
                            <div className='bg-muted/30 border-t'>
                                {group.relations.map((relation, idx) => (
                                    <RelationItem
                                        key={idx}
                                        relation={relation}
                                        isLast={idx === group.relations.length - 1}
                                    />
                                ))}
                            </div>
                        </td>
                    </tr>
                </CollapsibleContent>
            </>
        </Collapsible>
    );
}

/**
 * EnrichmentResults component - displays enrichment results in a split-pane view
 *
 * Left pane shows list of enrichment techniques used in the request.
 * Right pane shows tabs for artifacts, relations, warnings, and errors.
 *
 * @example
 * ```tsx
 * <EnrichmentResults />
 * ```
 */
export default function EnrichmentResults() {
    const { intelioApi } = useApi();
    const params = useParams({ strict: false });
    const idParam = (params as any).id;
    const id = Number(idParam);

    if (isNaN(id)) {
        return (
            <div className='flex items-center justify-center h-full'>
                <p className='text-muted-foreground'>Invalid enrichment ID</p>
            </div>
        );
    }

    const [selectedEnricher, setSelectedEnricher] = useState<string | null>(null);
    const [showIgnored, setShowIgnored] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [searchParams, setSearchParams] = useState({ query: '', details: '' });
    const [searchInput, setSearchInput] = useState({ query: '', details: '' });

    // Query for enrichment details
    const { data: enrichmentDetails, isPending: isPendingDetails } = useQuery({
        queryKey: queryKeys.enrichment.results.detail(String(id)),
        queryFn: () => intelioApi.enrichmentDetailRetrieve({ id }),
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch enrichment details',
        },
    });

    // Select the first enricher by default when details load
    useEffect(() => {
        if (
            enrichmentDetails?.enrichers &&
            enrichmentDetails.enrichers.length > 0 &&
            !selectedEnricher
        ) {
            setSelectedEnricher(enrichmentDetails.enrichers[0].enricherType!);
        }
    }, [enrichmentDetails, selectedEnricher]);

    // Query for enricher details
    const { data: enricherDetails, isPending: isPendingEnricher } = useQuery({
        queryKey: queryKeys.enrichment.results.detail(`${id}-${selectedEnricher}`),
        queryFn: () =>
            intelioApi.enrichmentRequestEnricherRetrieve({
                id,
                enricherType: selectedEnricher!,
            }),
        enabled: !!selectedEnricher && !showIgnored,
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch enricher details',
        },
    });

    // Query for results (relations)
    const { data: resultsData, isPending: isPendingResults } = useQuery({
        queryKey: queryKeys.enrichment.results.relations({
            id: String(id),
            enricherType: selectedEnricher!,
            page,
            pageSize,
            query: searchParams.query || undefined,
            details: searchParams.details || undefined,
        }),
        queryFn: () =>
            intelioApi.enrichmentRelationsRetrieve({
                id,
                enricherType: selectedEnricher!,
                page,
                pageSize,
                query: searchParams.query || undefined,
                details: searchParams.details || undefined,
            }),
        enabled: !!selectedEnricher && !showIgnored,
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch enrichment results',
        },
    });

    const results = resultsData?.results || [];
    const totalPages = resultsData?.totalPages || 1;
    
    // Group results by artifact
    const groupedResults = useMemo(() => groupResultsByArtifact(results), [results]);

    // Reset to page 1 when search query changes
    const handleSearch = () => {
        setSearchParams(searchInput);
        setPage(1);
    };

    // Handle search input key press
    const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Get status icon for enrichment request
    const getStatusIcon = (status?: EnrichmentRequestDetailStatusEnum) => {
        if (!status) return null;

        switch (status) {
            case 'done':
                return <CheckCircleIcon className='text-primary' size={18} weight="fill" />;
            case 'working':
            case 'waiting':
                return <InfoIcon className='text-primary' size={18} weight="fill" />;
            case 'warning':
                return (
                    <WarningIcon
                        className='text-muted-foreground'
                        size={18}
                        weight="fill"
                    />
                );
            case 'error':
                return (
                    <WarningCircleIcon
                        className='text-destructive'
                        size={18}
                        weight="fill"
                    />
                );
            default:
                return null;
        }
    };

    // Get status icon for enricher
    const getEnricherStatusIcon = (status: string) => {
        switch (status) {
            case 'done':
                return (
                    <CheckCircleIcon
                        className='text-primary flex-shrink-0'
                        width='16'
                        height='16'
                    />
                );
            case 'working':
            case 'waiting':
                return (
                    <InfoIcon
                        className='text-primary flex-shrink-0'
                        width='16'
                        height='16'
                    />
                );
            case 'warning':
                return (
                    <WarningIcon
                        className='text-muted-foreground flex-shrink-0'
                        width='16'
                        height='16'
                    />
                );
            case 'error':
                return (
                    <WarningCircleIcon
                        className='text-destructive flex-shrink-0'
                        width='16'
                        height='16'
                    />
                );
            default:
                return null;
        }
    };

    // Render entry badge if subtype is not "enrichment"
    const renderEntryBadge = (entry: EntrySerializerMinimal | undefined) => {
        if (!entry || entry.subtype === 'enrichment') {
            return null;
        }

        return (
            <Badge
                className={`rounded-full ${!entry.color ? 'bg-muted' : ''}`}
                style={entry.color ? { backgroundColor: entry.color } : undefined}
            >
                {entry.subtype}: {entry.name}
            </Badge>
        );
    };

    // Download results as JSON
    const handleDownloadResults = () => {
        if (!results || results.length === 0) return;

        // Format the data according to specifications
        const formattedData = results.map((result) => {
            // Build entries array from e1 and e2
            const entries: Array<{ type: string; name: string }> = [];

            if (result.e1 && result.e1.subtype !== 'enrichment') {
                entries.push({
                    type: result.e1.subtype || 'unknown',
                    name: result.e1.name || '',
                });
            }

            if (result.e2 && result.e2.subtype !== 'enrichment') {
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
        setShowIgnored(false);
        setPage(1);
        setSearchParams({ query: '', details: '' });
        setSearchInput({ query: '', details: '' });
    };

    // Handle ignored artifacts selection
    const handleIgnoredSelect = () => {
        setSelectedEnricher(null);
        setShowIgnored(true);
        // Query will automatically handle null when enabled is false
    };

    const errorMsg = () => {
        let msgs: string[] = [];
        if (enrichmentDetails?.ignored && enrichmentDetails.ignored.length > 0) {
            msgs.push(
                `Ignored ${enrichmentDetails.ignored.length} artifact${enrichmentDetails.ignored.length > 1 ? 's' : ''}`,
            );
        }
        let warn_count =
            enrichmentDetails?.enrichers?.filter(
                (enricher) => enricher.status === 'warning',
            ).length || 0;
        if (warn_count > 0) {
            msgs.push(`Warnings in ${warn_count} enricher${warn_count > 1 ? 's' : ''}`);
        }
        let error_count =
            enrichmentDetails?.enrichers?.filter(
                (enricher) => enricher.status === 'error',
            ).length || 0;
        if (error_count > 0) {
            msgs.push(`Errors in ${error_count} enricher${error_count > 1 ? 's' : ''}`);
        }

        return msgs.join(', ');
    };

    // Check if enricher has warnings or errors
    const hasWarnings =
        enricherDetails?.warnings && enricherDetails.warnings.length > 0;
    const hasErrors = enricherDetails?.errors && enricherDetails.errors.length > 0;

    // Get ignored artifacts from enrichmentDetails (assuming it comes from 'ignored' field)
    const ignoredArtifacts = (enrichmentDetails as any)?.ignored || [];

    return (
        <div className='w-full h-full flex flex-col overflow-hidden'>
            {/* Title Section */}
            {enrichmentDetails && (
                <div className='w-full border-b border-border px-4 py-4'>
                    <h1 className='text-2xl font-medium break-all text-foreground mb-2'>
                        {enrichmentDetails.title || `Enrichment Request #${id}`}
                    </h1>
                    <div className='h-px bg-card mb-2' />
                    <div className='flex items-center gap-4 text-xs text-muted-foreground'>
                        {enrichmentDetails.status && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className='flex items-center gap-1.5'>
                                        {getStatusIcon(enrichmentDetails.status)}
                                        <span className='capitalize'>
                                            {enrichmentDetails.status}
                                        </span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>{errorMsg()}</TooltipContent>
                            </Tooltip>
                        )}
                        {enrichmentDetails.createdAt && (
                            <div className='flex items-center gap-1.5'>
                                <CalendarIcon size={14} weight="bold" />
                                <span>
                                    {format(
                                        new Date(enrichmentDetails.createdAt),
                                        'dd/MM/yyyy, HH:mm',
                                    )}
                                </span>
                            </div>
                        )}
                        {enrichmentDetails.completedAt && (
                            <div className='flex items-center gap-1.5'>
                                <ClockIcon size={14} weight="bold" />
                                <span>
                                    {format(
                                        new Date(enrichmentDetails.completedAt),
                                        'dd/MM/yyyy, HH:mm',
                                    )}
                                </span>
                            </div>
                        )}
                        {enrichmentDetails.userDetail && (
                            <div className='flex items-center gap-1.5'>
                                <UserIcon size={14} weight="bold" />
                                <span>{enrichmentDetails.userDetail.username}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className='flex-1 overflow-hidden flex flex-col p-4'>
                {isPendingDetails ? (
                    <div className='flex items-center justify-center min-h-[200px]'>
                        <Spinner className='size-10' />
                    </div>
                ) : (
                    <>
                        {/* Filters */}
                        <div className='flex gap-2 items-center pb-4'>
                            {/* Enricher selector */}
                            <div className='min-w-[180px]'>
                                <Select
                                    value={showIgnored ? 'ignored' : (selectedEnricher || '')}
                                    onValueChange={(value) => {
                                        if (value === 'ignored') {
                                            handleIgnoredSelect();
                                        } else {
                                            handleEnricherSelect(value);
                                        }
                                    }}
                                >
                                    <SelectTrigger className='w-full'>
                                        <SelectValue placeholder='Select enricher' />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {enrichmentDetails?.enrichers?.map((enricher) => (
                                            <SelectItem
                                                key={enricher.enricherType}
                                                value={enricher.enricherType!}
                                            >
                                                <div className='flex items-center gap-2'>
                                                    {getEnricherStatusIcon(enricher.status!)}
                                                    <span>{enricher.displayName}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                        {ignoredArtifacts.length > 0 && (
                                            <SelectItem value='ignored'>
                                                <div className='flex items-center gap-2'>
                                                    <EyeSlashIcon
                                                        className='text-muted-foreground flex-shrink-0'
                                                        width='16'
                                                        height='16'
                                                    />
                                                    <span>Ignored ({ignoredArtifacts.length})</span>
                                                </div>
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Search Entries */}
                            <InputGroup className='flex-1 min-w-[200px]'>
                                <InputGroupInput
                                    placeholder='Search entries...'
                                    value={searchInput.query}
                                    onChange={(e) =>
                                        setSearchInput({
                                            ...searchInput,
                                            query: e.target.value,
                                        })
                                    }
                                    onKeyDown={handleSearchKeyPress}
                                    disabled={showIgnored}
                                />
                                <InputGroupAddon align='inline-start'>
                                    <MagnifyingGlassIcon />
                                </InputGroupAddon>
                            </InputGroup>

                            {/* Search Details */}
                            <InputGroup className='flex-1 min-w-[200px]'>
                                <InputGroupInput
                                    placeholder='Search details...'
                                    value={searchInput.details}
                                    onChange={(e) =>
                                        setSearchInput({
                                            ...searchInput,
                                            details: e.target.value,
                                        })
                                    }
                                    onKeyDown={handleSearchKeyPress}
                                    disabled={showIgnored}
                                />
                                <InputGroupAddon align='inline-start'>
                                    <MagnifyingGlassIcon />
                                </InputGroupAddon>
                            </InputGroup>
                            <Button
                                variant='outline'
                                size='icon'
                                onClick={handleDownloadResults}
                                disabled={showIgnored || !results || results.length === 0}
                                title='Download results as JSON'
                            >
                                <DownloadSimpleIcon size={18} weight="bold" />
                            </Button>
                        </div>

                        {/* Content */}
                        {showIgnored ? (
                            /* Ignored Artifacts View */
                            <Card className='border-border bg-muted/5 flex-1 overflow-hidden'>
                                <CardContent className='p-0 h-full overflow-auto'>
                                    <Table>
                                        <TableHeader className='sticky top-0 bg-card z-10'>
                                            <TableRow>
                                                <TableHead>Artifact</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {ignoredArtifacts.map((artifact: any, index: number) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <div className='flex items-center gap-2'>
                                                            {artifact.entry_class && (
                                                                <Badge variant='secondary' className='flex-shrink-0'>
                                                                    {artifact.entry_class}
                                                                </Badge>
                                                            )}
                                                            <span className='text-foreground truncate'>
                                                                {typeof artifact === 'string'
                                                                    ? artifact
                                                                    : artifact.name || JSON.stringify(artifact)}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ) : selectedEnricher ? (
                            /* Relations View */
                            isPendingResults ? (
                                <div className='flex items-center justify-center min-h-[200px]'>
                                    <Spinner className='size-10' />
                                </div>
                            ) : groupedResults.length === 0 ? (
                                <Card className='border-border bg-muted/5'>
                                    <CardContent className='py-8'>
                                        <p className='text-center text-sm text-muted-foreground'>
                                            No results found.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <>
                                    <Card className='border-border bg-muted/5 flex-1 overflow-hidden flex flex-col'>
                                        <CardContent className='p-0 flex-1 overflow-auto'>
                                            <Table>
                                                <TableHeader className='sticky top-0 bg-card z-10'>
                                                    <TableRow>
                                                        <TableHead className='w-[120px]'>Enricher</TableHead>
                                                        <TableHead>Artifact</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {groupedResults.map((group, index) => (
                                                        <GroupedRow
                                                            key={`${group.artifact.subtype}:${group.artifact.name}`}
                                                            group={group}
                                                            enricherName={
                                                                enrichmentDetails?.enrichers?.find(
                                                                    (e) => e.enricherType === selectedEnricher
                                                                )?.displayName || selectedEnricher
                                                            }
                                                        />
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                    {/* Pagination */}
                                    <div className='pt-3'>
                                        <Pagination
                                            currentPage={page}
                                            totalPages={totalPages}
                                            onPageChange={(newPage) => setPage(newPage)}
                                            pageSize={pageSize}
                                            onPageSizeChange={(newSize) => {
                                                setPageSize(newSize);
                                                setPage(1);
                                            }}
                                        />
                                    </div>
                                </>
                            )
                        ) : (
                            <Card className='border-border bg-muted/5'>
                                <CardContent className='py-8'>
                                    <p className='text-center text-sm text-muted-foreground'>
                                        Select an enrichment technique to view results
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Warnings Section - shown below table when an enricher is selected */}
                        {hasWarnings && (
                            <div className='mt-4'>
                                <h3 className='text-sm font-semibold mb-2'>Warnings</h3>
                                <Card className='border-border bg-muted/5'>
                                    <CardContent className='p-0'>
                                        <div className='divide-y divide-border'>
                                            {enricherDetails!.warnings!.map((warning: any, index: number) => (
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
                                                        {typeof warning === 'string'
                                                            ? warning
                                                            : JSON.stringify(warning)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Errors Section - shown below warnings when an enricher is selected */}
                        {hasErrors && (
                            <div className='mt-4'>
                                <h3 className='text-sm font-semibold mb-2'>Errors</h3>
                                <Card className='border-border bg-muted/5'>
                                    <CardContent className='p-0'>
                                        <div className='divide-y divide-border'>
                                            {enricherDetails!.errors!.map((error: any, index: number) => (
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
                                                        {typeof error === 'string'
                                                            ? error
                                                            : JSON.stringify(error)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
