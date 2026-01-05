import PaginationWrapper from '@/components/base/Pagination/PaginationWrapper';
import Tooltip from '@/components/base/Tooltip/Tooltip';
import { useTabContext } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { formatDate } from '@/utils/dates';
import Badge from '@components/base/Badge/Badge';
import ReactJson from '@microlink/react-json-view';
import {
    EnrichmentRelation,
    EnrichmentRequestDetail,
    EnrichmentRequestDetailStatusEnum,
    EnrichmentRequestEnricher,
    EntrySerializerMinimal
} from '@services/cradle/models';
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
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Tab, Tabs } from '../../layout/Tabs/Tabs';

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
export default function EnrichmentResults(): JSX.Element {
    const { intelioApi } = useApi();
    const { params } = useTabContext();
    const id = Number(params.id);

    if (isNaN(id)) {
        return (
            <div className='flex items-center justify-center h-full'>
                <p className='cradle-text-tertiary'>Invalid enrichment ID</p>
            </div>
        );
    }

    const { execute } = useAPICall();

    // State for enrichment details
    const [enrichmentDetails, setEnrichmentDetails] =
        useState<EnrichmentRequestDetail | null>(null);
    const [selectedEnricher, setSelectedEnricher] = useState<string | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(true);

    // State for selected enricher details
    const [enricherDetails, setEnricherDetails] =
        useState<EnrichmentRequestEnricher | null>(null);
    const [loadingEnricher, setLoadingEnricher] = useState(false);

    // State for showing ignored artifacts
    const [showIgnored, setShowIgnored] = useState(false);

    // State for results (relations)
    const [results, setResults] = useState<EnrichmentRelation[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [searchParams, setSearchParams] = useState({ query: '', details: '' });
    const [searchInput, setSearchInput] = useState({ query: '', details: '' });
    const [loadingResults, setLoadingResults] = useState(false);

    // Load enrichment details on mount
    useEffect(() => {
        const fetchEnrichmentDetails = async () => {
            setLoadingDetails(true);
            try {
                const details = await execute(
                    () =>
                        intelioApi.enrichmentDetailRetrieve({
                            id,
                        }),
                    {
                        errorMessage: 'Failed to fetch enrichment details',
                    },
                );

                setEnrichmentDetails(details);

                // Select the first enricher by default
                if (details.enrichers && details.enrichers.length > 0) {
                    setSelectedEnricher(details.enrichers[0].enricherType!);
                }
            } finally {
                setLoadingDetails(false);
            }
        };

        fetchEnrichmentDetails();
    }, [id, intelioApi]);

    // Load enricher details when selectedEnricher changes
    useEffect(() => {
        if (!selectedEnricher || showIgnored) {
            setEnricherDetails(null);
            return;
        }

        const fetchEnricherDetails = async () => {
            setLoadingEnricher(true);
            try {
                const details = await execute(
                    () =>
                        intelioApi.enrichmentRequestEnricherRetrieve({
                            id,
                            enricherType: selectedEnricher,
                        }),
                    {
                        errorMessage: 'Failed to fetch enricher details',
                    },
                );

                setEnricherDetails(details);
            } finally {
                setLoadingEnricher(false);
            }
        };

        fetchEnricherDetails();
    }, [id, selectedEnricher, showIgnored, intelioApi]);

    // Load results when enricher, page, pageSize, or query changes
    useEffect(() => {
        if (!selectedEnricher || showIgnored) return;

        const fetchResults = async () => {
            setLoadingResults(true);
            try {
                const response = await execute(
                    () =>
                        intelioApi.enrichmentRelationsRetrieve({
                            id,
                            enricherType: selectedEnricher,
                            page,
                            pageSize,
                            query: searchParams.query || undefined,
                            details: searchParams.details || undefined,
                        }),
                    {
                        errorMessage: 'Failed to fetch enrichment results',
                    },
                );

                setResults(response.results || []);
                setTotalPages(response.totalPages || 1);
            } finally {
                setLoadingResults(false);
            }
        };

        fetchResults();
    }, [id, selectedEnricher, page, pageSize, searchParams, showIgnored, intelioApi]);

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
                return (
                    <CheckCircle className='text-green-500' width='18' height='18' />
                );
            case 'working':
            case 'waiting':
                return <InfoCircle className='text-blue-500' width='18' height='18' />;
            case 'warning':
                return (
                    <WarningTriangle
                        className='text-amber-500'
                        width='18'
                        height='18'
                    />
                );
            case 'error':
                return (
                    <WarningCircle className='text-red-500' width='18' height='18' />
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
                        className='text-green-500 flex-shrink-0'
                        width='16'
                        height='16'
                    />
                );
            case 'working':
            case 'waiting':
                return (
                    <InfoCircle
                        className='text-blue-500 flex-shrink-0'
                        width='16'
                        height='16'
                    />
                );
            case 'warning':
                return (
                    <WarningTriangle
                        className='text-amber-500 flex-shrink-0'
                        width='16'
                        height='16'
                    />
                );
            case 'error':
                return (
                    <WarningCircle
                        className='text-red-500 flex-shrink-0'
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
            <Badge color={entry.color || '#ccc'} shape='pill'>
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
        setEnricherDetails(null);
    };

    const errorMsg = () => {
        let msgs: string[] = [];
        if (enrichmentDetails?.ignored && enrichmentDetails.ignored.length > 0) {
            msgs.push(`Ignored ${enrichmentDetails.ignored.length} artifact${enrichmentDetails.ignored.length > 1 ? 's' : ''}`);
        }
        let warn_count = enrichmentDetails?.enrichers?.filter((enricher) => enricher.status === 'warning').length || 0;
        if (warn_count > 0) {
            msgs.push(`Warnings in ${warn_count} enricher${warn_count > 1 ? 's' : ''}`);
        }
        let error_count = enrichmentDetails?.enrichers?.filter((enricher) => enricher.status === 'error').length || 0;
        if (error_count > 0) {
            msgs.push(`Errors in ${error_count} enricher${error_count > 1 ? 's' : ''}`);
        }

        return msgs.join(', ');
    };

    // Check if enricher has warnings or errors
    const hasWarnings = enricherDetails?.warnings && enricherDetails.warnings.length > 0;
    const hasErrors = enricherDetails?.errors && enricherDetails.errors.length > 0;

    // Get ignored artifacts from enrichmentDetails (assuming it comes from 'ignored' field)
    const ignoredArtifacts = (enrichmentDetails as any)?.ignored || [];

    return (
        <div className='w-full h-full flex flex-col overflow-hidden'>
            {/* Title Section */}
            {enrichmentDetails && (
                <div className='w-full cradle-border-b px-4 py-4'>
                    <div>
                        <h1 className='text-2xl font-medium break-all cradle-text-primary mb-2'>
                            {enrichmentDetails.title || `Enrichment Request #${id}`}
                        </h1>
                        <div className='h-px cradle-bg-elevated mb-2' />
                        <div className='flex items-center gap-4 text-xs cradle-text-tertiary'>
                            {enrichmentDetails.status && (
                                <Tooltip content={errorMsg()}>
                                    <div className='flex items-center gap-1.5'>
                                        {getStatusIcon(enrichmentDetails.status)}
                                        <span className='capitalize'>
                                            {enrichmentDetails.status}
                                        </span>
                                    </div>
                                </Tooltip>
                            )}
                            {enrichmentDetails.createdAt && (
                                <div className='flex items-center gap-1.5'>
                                    <Calendar width='14' height='14' />
                                    <span>
                                        {formatDate(enrichmentDetails.createdAt)}
                                    </span>
                                </div>
                            )}
                            {enrichmentDetails.completedAt && (
                                <div className='flex items-center gap-1.5'>
                                    <Clock width='14' height='14' />
                                    <span>
                                        {formatDate(enrichmentDetails.completedAt)}
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
                </div>
            )}

            {/* Main Content */}
            <div className='flex-1 overflow-hidden'>
                <PanelGroup direction='horizontal' className='h-full'>
                    {/* Left Panel - Enrichment Techniques */}
                    <Panel defaultSize={25} minSize={15} maxSize={40}>
                        <div className='h-full overflow-y-auto px-3 pt-3'>
                            {loadingDetails ? (
                                <div className='flex items-center justify-center min-h-[200px]'>
                                    <div className='spinner-dot-pulse spinner-xl'>
                                        <div className='spinner-pulse-dot'></div>
                                    </div>
                                </div>
                            ) : (
                                <div className='space-y-1 pr-2'>
                                    {/* Ignored Artifacts - only show if there are any */}
                                    {ignoredArtifacts.length > 0 && (
                                        <>
                                            {/* Separator */}
                                            {enrichmentDetails?.enrichers && enrichmentDetails.enrichers.length > 0 && (
                                                <div className='h-px cradle-bg-elevated my-2' />
                                            )}

                                            <div
                                                className={`px-3 py-2 flex items-center gap-2 cursor-pointer transition-all rounded-md border ${showIgnored
                                                    ? 'bg-cradle-bg-secondary border-cradle-accent-primary shadow-sm'
                                                    : 'bg-cradle-bg-elevated border-transparent hover:bg-cradle-bg-secondary hover:border-cradle-border-primary'
                                                    }`}
                                                onClick={handleIgnoredSelect}
                                            >
                                                <EyeClosed
                                                    className='text-gray-500 flex-shrink-0'
                                                    width='16'
                                                    height='16'
                                                />
                                                <span className='text-sm font-medium truncate text-cradle-text-primary'>
                                                    Ignored Artifacts
                                                </span>
                                                <span className='ml-auto text-xs text-cradle-text-muted'>
                                                    ({ignoredArtifacts.length})
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {/* Enricher list */}
                                    {enrichmentDetails?.enrichers?.map((enricher) => (
                                        <div
                                            key={enricher.enricherType}
                                            className={`px-3 py-2 flex items-center gap-2 cursor-pointer transition-all rounded-md border ${selectedEnricher === enricher.enricherType && !showIgnored
                                                ? 'bg-cradle-bg-secondary border-cradle-accent-primary shadow-sm'
                                                : 'bg-cradle-bg-elevated border-transparent hover:bg-cradle-bg-secondary hover:border-cradle-border-primary'
                                                }`}
                                            onClick={() => handleEnricherSelect(enricher.enricherType!)}
                                        >
                                            {getEnricherStatusIcon(enricher.status!)}
                                            <span className='text-sm font-medium truncate text-cradle-text-primary'>
                                                {enricher.displayName!}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Panel>

                    <PanelResizeHandle className='w-[2px] cradle-bg-elevated cradle-border-x hover:bg-[#FF8C00] hover:bg-opacity-50 transition-colors' />

                    {/* Right Panel - Tabs */}
                    <Panel defaultSize={75} minSize={60}>
                        <div className='h-full flex flex-col'>
                            {showIgnored ? (
                                /* Ignored Artifacts View */
                                <div className='h-full flex flex-col overflow-hidden'>
                                    <div className='p-4 cradle-border-b'>
                                        <h2 className='text-lg font-medium text-cradle-text-primary'>
                                            Ignored Artifacts
                                        </h2>
                                        <p className='text-xs text-cradle-text-muted mt-1'>
                                            These artifacts were ignored because they could not be matched with any enrichment technique.
                                        </p>
                                    </div>
                                    <div className='flex-1 overflow-y-auto min-h-0'>
                                        <div className='divide-y divide-cradle-border-primary'>
                                            {ignoredArtifacts.map((artifact: any, index: number) => (
                                                <div
                                                    key={index}
                                                    className='px-4 py-3 flex items-center gap-3'
                                                >
                                                    {/* Entry class indicator */}
                                                    {artifact.entry_class && (
                                                        <span className='text-[10px] font-mono uppercase tracking-wider text-cradle-text-muted px-1.5 py-0.5 bg-cradle-bg-secondary border border-cradle-border-primary min-w-[60px] text-center'>
                                                            {artifact.entry_class}
                                                        </span>
                                                    )}

                                                    {/* Name */}
                                                    <span className='flex-1 text-sm text-cradle-text-primary truncate'>
                                                        {typeof artifact === 'string'
                                                            ? artifact
                                                            : artifact.name || JSON.stringify(artifact)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : selectedEnricher ? (
                                /* Enricher Tabs View */
                                loadingEnricher ? (
                                    <div className='flex items-center justify-center h-full'>
                                        <div className='spinner-dot-pulse spinner-xl'>
                                            <div className='spinner-pulse-dot'></div>
                                        </div>
                                    </div>
                                ) : (
                                    <Tabs defaultTab={0} queryParam='enricherTab'>
                                        {/* Relations Tab */}
                                        <Tab title='Relations'>
                                            <div className='px-3 pt-3 h-full flex flex-col overflow-hidden'>
                                                {/* Search Bars */}
                                                <div className='flex gap-2 items-center pb-3'>
                                                    {/* Search Entries */}
                                                    <div className='flex items-center gap-2 flex-grow bg-cradle-bg-elevated border border-cradle-border-accent h-10 px-2 rounded-full focus-within:border-cradle-accent-primary focus-within:shadow-[0_0_0_1px_var(--cradle-accent-primary)] transition-all'>
                                                        <button
                                                            className='p-1 flex-shrink-0 transition-colors text-cradle-text-muted hover:text-cradle-text-primary'
                                                            title='Search'
                                                            onClick={handleSearch}
                                                        >
                                                            <Search className='w-4 h-4' />
                                                        </button>
                                                        <input
                                                            type='text'
                                                            className='flex-grow bg-transparent text-sm outline-none text-cradle-text-primary placeholder:text-cradle-text-muted rounded-none font-mono'
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
                                                            <button
                                                                onClick={() => {
                                                                    setSearchInput({
                                                                        ...searchInput,
                                                                        query: '',
                                                                    });
                                                                }}
                                                                className='p-1 flex-shrink-0 text-cradle-text-muted hover:text-cradle-text-primary transition-colors'
                                                                title='Clear'
                                                            >
                                                                <Xmark className='w-4 h-4' />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Search Details */}
                                                    <div className='flex items-center gap-2 flex-grow bg-cradle-bg-elevated border border-cradle-border-accent h-10 px-2 rounded-full focus-within:border-cradle-accent-primary focus-within:shadow-[0_0_0_1px_var(--cradle-accent-primary)] transition-all'>
                                                        <button
                                                            className='p-1 flex-shrink-0 transition-colors text-cradle-text-muted hover:text-cradle-text-primary'
                                                            title='Search Details'
                                                            onClick={handleSearch}
                                                        >
                                                            <Search className='w-4 h-4' />
                                                        </button>
                                                        <input
                                                            type='text'
                                                            className='flex-grow bg-transparent text-sm outline-none text-cradle-text-primary placeholder:text-cradle-text-muted rounded-none font-mono'
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
                                                            <button
                                                                onClick={() => {
                                                                    setSearchInput({
                                                                        ...searchInput,
                                                                        details: '',
                                                                    });
                                                                }}
                                                                className='p-1 flex-shrink-0 text-cradle-text-muted hover:text-cradle-text-primary transition-colors'
                                                                title='Clear'
                                                            >
                                                                <Xmark className='w-4 h-4' />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <button
                                                        className='h-10 px-6 border border-cradle-border-accent bg-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors rounded-lg text-cradle-text-secondary'
                                                        onClick={handleSearch}
                                                    >
                                                        Search
                                                    </button>
                                                    <button
                                                        className='flex items-center justify-center w-10 h-10 border border-cradle-border-accent bg-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors rounded-lg text-cradle-accent-primary'
                                                        onClick={handleDownloadResults}
                                                        disabled={!results || results.length === 0}
                                                        title='Download results as JSON'
                                                    >
                                                        <Download width='18' height='18' />
                                                    </button>


                                                    {/* Pagination */}
                                                    <PaginationWrapper
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
                                                <div className='flex-grow overflow-y-auto'>
                                                    {loadingResults ? (
                                                        <div className='flex items-center justify-center min-h-[200px]'>
                                                            <div className='spinner-dot-pulse spinner-xl'>
                                                                <div className='spinner-pulse-dot'></div>
                                                            </div>
                                                        </div>
                                                    ) : results.length === 0 ? (
                                                        <div className='flex flex-col items-center justify-center min-h-[200px]'>
                                                            <p className='text-sm cradle-text-tertiary'>
                                                                No results found.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className='space-y-4 mb-4'>
                                                                {results.map((result, index) => (
                                                                    <div
                                                                        key={result.id || index}
                                                                        className='p-4 cradle-bg-elevated border cradle-border'
                                                                    >
                                                                        {/* Entry badges */}
                                                                        {(result.e1 || result.e2) && (
                                                                            <div className='flex flex-wrap gap-2 mb-3'>
                                                                                {renderEntryBadge(result.e1)}
                                                                                {renderEntryBadge(result.e2)}
                                                                            </div>
                                                                        )}

                                                                        {/* Details JSON viewer */}
                                                                        {result.details && (
                                                                            <ReactJson
                                                                                src={result.details}
                                                                                theme='monokai'
                                                                                collapsed={1}
                                                                                displayDataTypes={false}
                                                                                displayObjectSize={false}
                                                                                enableClipboard={true}
                                                                                style={{
                                                                                    backgroundColor:
                                                                                        'transparent',
                                                                                    fontSize: '12px',
                                                                                }}
                                                                            />
                                                                        )}

                                                                        {!result.details && (
                                                                            <p className='text-xs cradle-text-tertiary italic'>
                                                                                No details available
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </Tab>

                                        {/* Artifacts Tab */}
                                        <Tab title='Artifacts'>
                                            <div className='h-full flex flex-col overflow-hidden'>
                                                {!enricherDetails?.artifacts ||
                                                    enricherDetails.artifacts.length === 0 ? (
                                                    <div className='flex flex-col items-center justify-center h-full'>
                                                        <p className='text-sm cradle-text-tertiary'>
                                                            No artifacts found.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className='flex-1 overflow-y-auto min-h-0'>
                                                        <div className='divide-y divide-cradle-border-primary'>
                                                            {enricherDetails.artifacts.map(
                                                                (artifact: any, index: number) => (
                                                                    <div
                                                                        key={index}
                                                                        className='px-4 py-3 flex items-center gap-3'
                                                                    >
                                                                        {/* Entry class indicator */}
                                                                        {artifact.entry_class && (
                                                                            <span className='text-[10px] font-mono uppercase tracking-wider text-cradle-text-muted px-1.5 py-0.5 bg-cradle-bg-secondary border border-cradle-border-primary min-w-[60px] text-center'>
                                                                                {artifact.entry_class}
                                                                            </span>
                                                                        )}

                                                                        {/* Name */}
                                                                        <span className='flex-1 text-sm text-cradle-text-primary truncate'>
                                                                            {typeof artifact === 'string'
                                                                                ? artifact
                                                                                : artifact.name || JSON.stringify(artifact)}
                                                                        </span>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </Tab>

                                        {/* Warnings Tab - Conditional */}
                                        {hasWarnings && (
                                            <Tab title='Warnings'>
                                                <div className='h-full overflow-y-auto'>
                                                    <div className='divide-y divide-cradle-border-primary'>
                                                        {enricherDetails!.warnings!.map(
                                                            (warning: any, index: number) => (
                                                                <div
                                                                    key={index}
                                                                    className='px-4 py-3 flex items-center gap-3 border-l-2 border-l-amber-500'
                                                                >
                                                                    <WarningTriangle
                                                                        className='text-amber-500 flex-shrink-0'
                                                                        width='16'
                                                                        height='16'
                                                                    />
                                                                    <span className='flex-1 text-sm text-cradle-text-primary'>
                                                                        {typeof warning === 'string'
                                                                            ? warning
                                                                            : JSON.stringify(warning)}
                                                                    </span>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            </Tab>
                                        )}

                                        {/* Errors Tab - Conditional */}
                                        {hasErrors && (
                                            <Tab title='Errors'>
                                                <div className='h-full overflow-y-auto'>
                                                    <div className='divide-y divide-cradle-border-primary'>
                                                        {enricherDetails!.errors!.map(
                                                            (error: any, index: number) => (
                                                                <div
                                                                    key={index}
                                                                    className='px-4 py-3 flex items-center gap-3 border-l-2 border-l-red-500'
                                                                >
                                                                    <WarningCircle
                                                                        className='text-red-500 flex-shrink-0'
                                                                        width='16'
                                                                        height='16'
                                                                    />
                                                                    <span className='flex-1 text-sm text-cradle-text-primary'>
                                                                        {typeof error === 'string'
                                                                            ? error
                                                                            : JSON.stringify(error)}
                                                                    </span>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            </Tab>
                                        )}
                                    </Tabs>
                                )
                            ) : (
                                <div className='flex items-center justify-center h-full'>
                                    <p className='text-sm cradle-text-tertiary'>
                                        Select an enrichment technique to view results
                                    </p>
                                </div>
                            )}
                        </div>
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
}
