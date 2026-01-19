import Pagination from '@/components/base/Pagination/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
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
    Calendar,
    CheckCircle,
    Clock,
    Download,
    EyeClosed,
    InfoCircle,
    Search,
    User,
    WarningCircle,
    WarningTriangle,
    Xmark,
} from 'iconoir-react';
import { useEffect, useState } from 'react';

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
                return <CheckCircle className='text-primary' width='18' height='18' />;
            case 'working':
            case 'waiting':
                return <InfoCircle className='text-primary' width='18' height='18' />;
            case 'warning':
                return (
                    <WarningTriangle
                        className='text-muted-foreground'
                        width='18'
                        height='18'
                    />
                );
            case 'error':
                return (
                    <WarningCircle
                        className='text-destructive'
                        width='18'
                        height='18'
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
                    <CheckCircle
                        className='text-primary flex-shrink-0'
                        width='16'
                        height='16'
                    />
                );
            case 'working':
            case 'waiting':
                return (
                    <InfoCircle
                        className='text-primary flex-shrink-0'
                        width='16'
                        height='16'
                    />
                );
            case 'warning':
                return (
                    <WarningTriangle
                        className='text-muted-foreground flex-shrink-0'
                        width='16'
                        height='16'
                    />
                );
            case 'error':
                return (
                    <WarningCircle
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
                                <Calendar width='14' height='14' />
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
                                <Clock width='14' height='14' />
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
                                <User width='14' height='14' />
                                <span>{enrichmentDetails.userDetail.username}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className='flex-1 overflow-hidden'>
                <ResizablePanelGroup direction='horizontal' className='h-full'>
                    {/* Left Panel - Enrichment Techniques */}
                    <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
                        <ScrollArea className='h-full px-3 pt-3'>
                            {isPendingDetails ? (
                                <div className='flex items-center justify-center min-h-[200px]'>
                                    <Spinner className='size-10' />
                                </div>
                            ) : (
                                <div className='space-y-1 pr-2'>
                                    {/* Ignored Artifacts - only show if there are any */}
                                    {ignoredArtifacts.length > 0 && (
                                        <>
                                            {/* Separator */}
                                            {enrichmentDetails?.enrichers &&
                                                enrichmentDetails.enrichers.length >
                                                    0 && (
                                                    <div className='h-px bg-card my-2' />
                                                )}

                                            <div
                                                className={`px-3 py-2 flex items-center gap-2 cursor-pointer transition-all rounded-md border ${
                                                    showIgnored
                                                        ? 'bg-secondary border-primary shadow-sm'
                                                        : 'bg-card border-transparent hover:bg-secondary hover:border-border'
                                                }`}
                                                onClick={handleIgnoredSelect}
                                            >
                                                <EyeClosed
                                                    className='text-muted-foreground flex-shrink-0'
                                                    width='16'
                                                    height='16'
                                                />
                                                <span className='text-sm font-medium truncate text-foreground'>
                                                    Ignored Artifacts
                                                </span>
                                                <span className='ml-auto text-xs text-muted-foreground'>
                                                    ({ignoredArtifacts.length})
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {/* Enricher list */}
                                    {enrichmentDetails?.enrichers?.map((enricher) => (
                                        <div
                                            key={enricher.enricherType}
                                            className={`px-3 py-2 flex items-center gap-2 cursor-pointer transition-all rounded-md border ${
                                                selectedEnricher ===
                                                    enricher.enricherType &&
                                                !showIgnored
                                                    ? 'bg-secondary border-primary shadow-sm'
                                                    : 'bg-card border-transparent hover:bg-secondary hover:border-border'
                                            }`}
                                            onClick={() =>
                                                handleEnricherSelect(
                                                    enricher.enricherType!,
                                                )
                                            }
                                        >
                                            {getEnricherStatusIcon(enricher.status!)}
                                            <span className='text-sm font-medium truncate text-foreground'>
                                                {enricher.displayName!}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </ResizablePanel>

                    <ResizableHandle className='w-[2px] bg-card border-x border-border hover:bg-primary hover:bg-opacity-50 transition-colors' />

                    {/* Right Panel - Tabs */}
                    <ResizablePanel defaultSize={75} minSize={60}>
                        {showIgnored ? (
                            /* Ignored Artifacts View */
                            <div className='h-full flex flex-col overflow-hidden'>
                                <div className='p-4 border-b border-border'>
                                    <h2 className='text-lg font-medium text-foreground'>
                                        Ignored Artifacts
                                    </h2>
                                    <p className='text-xs text-muted-foreground mt-1'>
                                        These artifacts were ignored because they could
                                        not be matched with any enrichment technique.
                                    </p>
                                </div>
                                <ScrollArea className='flex-1 min-h-0'>
                                    <div className='divide-y divide-border'>
                                        {ignoredArtifacts.map(
                                            (artifact: any, index: number) => (
                                                <div
                                                    key={index}
                                                    className='px-4 py-3 flex items-center gap-3'
                                                >
                                                    {/* Entry class indicator */}
                                                    {artifact.entry_class && (
                                                        <Badge variant='secondary'>
                                                            {artifact.entry_class}
                                                        </Badge>
                                                    )}

                                                    {/* Name */}
                                                    <span className='flex-1 text-sm text-foreground truncate'>
                                                        {typeof artifact === 'string'
                                                            ? artifact
                                                            : artifact.name ||
                                                              JSON.stringify(artifact)}
                                                    </span>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        ) : selectedEnricher ? (
                            /* Enricher Tabs View */
                            isPendingEnricher ? (
                                <div className='flex items-center justify-center h-full'>
                                    <Spinner className='size-10' />
                                </div>
                            ) : (
                                <div className='flex flex-col h-full'>
                                    {/* Relations Section */}
                                    <div className='flex-1 overflow-hidden flex flex-col'>
                                        <h3 className='text-sm font-semibold mb-2 px-3 pt-3'>
                                            Relations
                                        </h3>
                                        <div className='px-3 pb-3 flex-1 flex flex-col overflow-hidden'>
                                            {/* Search Bars */}
                                            <div className='flex gap-2 items-center pb-3'>
                                                {/* Search Entries */}
                                                <div className='flex items-center gap-2 flex-grow bg-card border border-border h-10 px-2 rounded-full focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all'>
                                                    <Button
                                                        variant='ghost'
                                                        size='icon-sm'
                                                        className='p-1 flex-shrink-0'
                                                        title='Search'
                                                        onClick={handleSearch}
                                                    >
                                                        <Search className='w-4 h-4' />
                                                    </Button>
                                                    <Input
                                                        type='text'
                                                        className='flex-grow bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground rounded-none font-mono border-0 shadow-none'
                                                        placeholder='Search entries...'
                                                        value={searchInput.query}
                                                        onChange={(e) =>
                                                            setSearchInput({
                                                                ...searchInput,
                                                                query: e.target.value,
                                                            })
                                                        }
                                                        onKeyDown={handleSearchKeyPress}
                                                    />
                                                    {searchInput.query && (
                                                        <Button
                                                            variant='ghost'
                                                            size='icon-sm'
                                                            onClick={() => {
                                                                setSearchInput({
                                                                    ...searchInput,
                                                                    query: '',
                                                                });
                                                            }}
                                                            className='p-1 flex-shrink-0'
                                                            title='Clear'
                                                        >
                                                            <Xmark className='w-4 h-4' />
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* Search Details */}
                                                <div className='flex items-center gap-2 flex-grow bg-card border border-border h-10 px-2 rounded-full focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all'>
                                                    <Button
                                                        variant='ghost'
                                                        size='icon-sm'
                                                        className='p-1 flex-shrink-0'
                                                        title='Search Details'
                                                        onClick={handleSearch}
                                                    >
                                                        <Search className='w-4 h-4' />
                                                    </Button>
                                                    <Input
                                                        type='text'
                                                        className='flex-grow bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground rounded-none font-mono border-0 shadow-none'
                                                        placeholder='Search details...'
                                                        value={searchInput.details}
                                                        onChange={(e) =>
                                                            setSearchInput({
                                                                ...searchInput,
                                                                details: e.target.value,
                                                            })
                                                        }
                                                        onKeyDown={handleSearchKeyPress}
                                                    />
                                                    {searchInput.details && (
                                                        <Button
                                                            variant='ghost'
                                                            size='icon-sm'
                                                            onClick={() => {
                                                                setSearchInput({
                                                                    ...searchInput,
                                                                    details: '',
                                                                });
                                                            }}
                                                            className='p-1 flex-shrink-0'
                                                            title='Clear'
                                                        >
                                                            <Xmark className='w-4 h-4' />
                                                        </Button>
                                                    )}
                                                </div>

                                                <Button
                                                    variant='outline'
                                                    size='default'
                                                    onClick={handleSearch}
                                                >
                                                    Search
                                                </Button>
                                                <Button
                                                    variant='outline'
                                                    size='icon'
                                                    onClick={handleDownloadResults}
                                                    disabled={
                                                        !results || results.length === 0
                                                    }
                                                    title='Download results as JSON'
                                                >
                                                    <Download width='18' height='18' />
                                                </Button>

                                                {/* Pagination */}
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

                                            {/* Results */}
                                            <ScrollArea className='flex-grow'>
                                                {isPendingResults ? (
                                                    <div className='flex items-center justify-center min-h-[200px]'>
                                                        <Spinner className='size-10' />
                                                    </div>
                                                ) : results.length === 0 ? (
                                                    <div className='flex flex-col items-center justify-center min-h-[200px]'>
                                                        <p className='text-sm text-muted-foreground'>
                                                            No results found.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className='space-y-4 mb-4'>
                                                            {results.map(
                                                                (result, index) => (
                                                                    <div
                                                                        key={
                                                                            result.id ||
                                                                            index
                                                                        }
                                                                        className='p-4 bg-card border border-border'
                                                                    >
                                                                        {/* Entry badges */}
                                                                        {(result.e1 ||
                                                                            result.e2) && (
                                                                            <div className='flex flex-wrap gap-2 mb-3'>
                                                                                {renderEntryBadge(
                                                                                    result.e1,
                                                                                )}
                                                                                {renderEntryBadge(
                                                                                    result.e2,
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Details JSON viewer */}
                                                                        {result.details && (
                                                                            <ReactJson
                                                                                src={
                                                                                    result.details
                                                                                }
                                                                                theme='monokai'
                                                                                collapsed={
                                                                                    1
                                                                                }
                                                                                displayDataTypes={
                                                                                    false
                                                                                }
                                                                                displayObjectSize={
                                                                                    false
                                                                                }
                                                                                enableClipboard={
                                                                                    true
                                                                                }
                                                                                style={{
                                                                                    backgroundColor:
                                                                                        'transparent',
                                                                                    fontSize:
                                                                                        '12px',
                                                                                }}
                                                                            />
                                                                        )}

                                                                        {!result.details && (
                                                                            <p className='text-xs text-muted-foreground italic'>
                                                                                No
                                                                                details
                                                                                available
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </ScrollArea>
                                        </div>
                                    </div>

                                    {/* Artifacts Section */}
                                    <div className='flex-1 overflow-hidden flex flex-col border-t'>
                                        <h3 className='text-sm font-semibold mb-2 px-3 pt-3'>
                                            Artifacts
                                        </h3>
                                        {!enricherDetails?.artifacts ||
                                        enricherDetails.artifacts.length === 0 ? (
                                            <div className='flex flex-col items-center justify-center flex-1'>
                                                <p className='text-sm text-muted-foreground'>
                                                    No artifacts found.
                                                </p>
                                            </div>
                                        ) : (
                                            <ScrollArea className='flex-1 min-h-0 px-3 pb-3'>
                                                <div className='divide-y divide-border'>
                                                    {enricherDetails.artifacts.map(
                                                        (
                                                            artifact: any,
                                                            index: number,
                                                        ) => (
                                                            <div
                                                                key={index}
                                                                className='px-4 py-3 flex items-center gap-3'
                                                            >
                                                                {/* Entry class indicator */}
                                                                {artifact.entry_class && (
                                                                    <Badge variant='secondary'>
                                                                        {
                                                                            artifact.entry_class
                                                                        }
                                                                    </Badge>
                                                                )}

                                                                {/* Name */}
                                                                <span className='flex-1 text-sm text-foreground truncate'>
                                                                    {typeof artifact ===
                                                                    'string'
                                                                        ? artifact
                                                                        : artifact.name ||
                                                                          JSON.stringify(
                                                                              artifact,
                                                                          )}
                                                                </span>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        )}
                                    </div>

                                    {/* Warnings Section - Conditional */}
                                    {hasWarnings && (
                                        <div className='flex-1 overflow-hidden flex flex-col border-t'>
                                            <h3 className='text-sm font-semibold mb-2 px-3 pt-3'>
                                                Warnings
                                            </h3>
                                            <ScrollArea className='flex-1 px-3 pb-3'>
                                                <div className='divide-y divide-border'>
                                                    {enricherDetails!.warnings!.map(
                                                        (
                                                            warning: any,
                                                            index: number,
                                                        ) => (
                                                            <div
                                                                key={index}
                                                                className='px-4 py-3 flex items-center gap-3 border-l-2 border-l-muted-foreground'
                                                            >
                                                                <WarningTriangle
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
                                            </ScrollArea>
                                        </div>
                                    )}

                                    {/* Errors Section - Conditional */}
                                    {hasErrors && (
                                        <div className='flex-1 overflow-hidden flex flex-col border-t'>
                                            <h3 className='text-sm font-semibold mb-2 px-3 pt-3'>
                                                Errors
                                            </h3>
                                            <ScrollArea className='flex-1 px-3 pb-3'>
                                                <div className='divide-y divide-border'>
                                                    {enricherDetails!.errors!.map(
                                                        (error: any, index: number) => (
                                                            <div
                                                                key={index}
                                                                className='px-4 py-3 flex items-center gap-3 border-l-2 border-l-red-500'
                                                            >
                                                                <WarningCircle
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
                                            </ScrollArea>
                                        </div>
                                    )}
                                </div>
                            )
                        ) : (
                            <div className='flex items-center justify-center h-full'>
                                <p className='text-sm text-muted-foreground'>
                                    Select an enrichment technique to view results
                                </p>
                            </div>
                        )}
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}
