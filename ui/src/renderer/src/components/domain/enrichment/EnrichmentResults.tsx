import { useTabContext } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { formatDate } from '@/utils/dates';
import AlertBox from '@components/base/Alert/AlertBox';
import Pagination from '@components/base/Pagination/Pagination';
import ReactJson from '@microlink/react-json-view';
import {
    EnrichmentRelation,
    EnrichmentRequestDetail,
    EnrichmentRequestDetailStatusEnum,
    EntrySerializerMinimal,
} from '@services/cradle/models';
import {
    Calendar,
    CheckCircle,
    Clock,
    Download,
    InfoCircle,
    User,
    WarningCircle,
    WarningTriangle,
} from 'iconoir-react';
import { useEffect, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Tab, Tabs } from '../../layout/Tabs/Tabs';

/**
 * EnrichmentResults component - displays enrichment results in a split-pane view
 *
 * Left pane shows list of enrichment techniques used in the request.
 * Right pane shows the results for the selected technique with pagination and search.
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
    const [enricherTypes, setEnricherTypes] = useState<string[]>([]);
    const [enrichersDetail, setEnrichersDetail] = useState<
        Array<{ [key: string]: string }>
    >([]);
    const [enricherStatus, setEnricherStatus] = useState<any>(null);
    const [selectedEnricher, setSelectedEnricher] = useState<string | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(true);

    // State for results
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
                setEnricherTypes(details.enricherTypes || []);
                console.log(details);
                setEnrichersDetail(details.enrichersDetail || []);
                setEnricherStatus(details.enricherStatus || null);

                // Select the first enricher by default
                if (details.enricherTypes && details.enricherTypes.length > 0) {
                    setSelectedEnricher(details.enricherTypes[0]);
                }
            } finally {
                setLoadingDetails(false);
            }
        };

        fetchEnrichmentDetails();
    }, [id, intelioApi]);

    // Load results when enricher, page, pageSize, or query changes
    useEffect(() => {
        if (!selectedEnricher) return;

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
    }, [id, selectedEnricher, page, pageSize, searchParams, intelioApi]);

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

    // Get warning message for selected enricher
    const getEnricherWarning = () => {
        if (!selectedEnricher || !enrichmentDetails?.warnings) return null;

        const warnings = enrichmentDetails.warnings;
        if (warnings[selectedEnricher]) {
            return warnings[selectedEnricher];
        }
        return null;
    };

    // Get status icon for enricher
    const getEnricherStatusIcon = (enricherType: string) => {
        if (!enricherStatus || !enricherStatus[enricherType]) return null;

        const status = enricherStatus[enricherType];

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
            <span
                className='badge badge-xs px-1 text-white text-[10px]'
                style={{
                    backgroundColor: entry.color || '#ccc',
                    borderColor: entry.color || '#ccc',
                }}
            >
                {entry.subtype}: {entry.name}
            </span>
        );
    };

    const enricherWarning = getEnricherWarning();

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
                                <div className='flex items-center gap-1.5'>
                                    {getStatusIcon(enrichmentDetails.status)}
                                    <span className='capitalize'>
                                        {enrichmentDetails.status}
                                    </span>
                                </div>
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
                    <Panel defaultSize={30} minSize={20} maxSize={50}>
                        <div className='h-full overflow-y-auto'>
                            <Tabs defaultTab={0} queryParam='enrichmentTab'>
                                {/* Enrichers Tab */}
                                <Tab title='Enrichers'>
                                    <div className='px-3 pt-3 h-full overflow-y-auto'>
                                        {loadingDetails ? (
                                            <div className='flex items-center justify-center min-h-[200px]'>
                                                <div className='spinner-dot-pulse spinner-xl'>
                                                    <div className='spinner-pulse-dot'></div>
                                                </div>
                                            </div>
                                        ) : enricherTypes.length === 0 ? (
                                            <div className='flex flex-col items-center justify-center min-h-[200px]'>
                                                <p className='text-sm cradle-text-tertiary'>
                                                    No enrichment techniques found.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className='space-y-1 pr-2'>
                                                {enrichersDetail.map((enricher) => (
                                                    <div
                                                        key={enricher.enricher_type}
                                                        className={`p-2 hover:border-2 hover:border-cradle-accent-primary cursor-pointer transition-colors ${selectedEnricher ===
                                                                enricher.enricher_type
                                                                ? 'cradle-bg-accent border-2 border-cradle-border-accent'
                                                                : 'cradle-bg-base'
                                                            }`}
                                                        onClick={() => {
                                                            setSelectedEnricher(
                                                                enricher.enricher_type,
                                                            );
                                                            setPage(1);
                                                            setSearchParams({
                                                                query: '',
                                                                details: '',
                                                            });
                                                            setSearchInput({
                                                                query: '',
                                                                details: '',
                                                            });
                                                        }}
                                                    >
                                                        <div className='flex items-center gap-2'>
                                                            {getEnricherStatusIcon(
                                                                enricher.enricher_type,
                                                            )}
                                                            <span className='text-sm font-medium cradle-text-primary truncate'>
                                                                {enricher.display_name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Tab>

                                {/* Warnings Tab */}
                                {enrichmentDetails?.warnings &&
                                    Object.keys(enrichmentDetails.warnings).length > 0 && (
                                        <Tab title='Warnings'>
                                            <div className='px-3 pt-3 h-full overflow-y-auto'>
                                                <div className='space-y-2 pr-2'>
                                                    {Object.entries(enrichmentDetails.warnings).map(
                                                        ([key, value]) => (
                                                            <div
                                                                key={key}
                                                                className='p-3 cradle-bg-base border-l-4 border-amber-500'
                                                            >
                                                                <div className='text-xs font-semibold cradle-text-secondary mb-1'>
                                                                    {key}
                                                                </div>
                                                                <div className='text-sm cradle-text-primary whitespace-pre-wrap'>
                                                                    {typeof value === 'string'
                                                                        ? value
                                                                        : JSON.stringify(
                                                                            value,
                                                                            null,
                                                                            2,
                                                                        )}
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </Tab>
                                    )}

                                {/* Errors Tab */}
                                {enrichmentDetails?.errors &&
                                    Object.keys(enrichmentDetails.errors).length > 0 && (
                                        <Tab title='Errors'>
                                            <div className='px-3 pt-3 h-full overflow-y-auto'>
                                                <div className='space-y-2 pr-2'>
                                                    {Object.entries(enrichmentDetails.errors).map(
                                                        ([key, value]) => (
                                                            <div
                                                                key={key}
                                                                className='p-3 cradle-bg-base border-l-4 border-red-500'
                                                            >
                                                                <div className='text-xs font-semibold cradle-text-secondary mb-1'>
                                                                    {key}
                                                                </div>
                                                                <div className='text-sm cradle-text-primary whitespace-pre-wrap'>
                                                                    {typeof value === 'string'
                                                                        ? value
                                                                        : JSON.stringify(
                                                                            value,
                                                                            null,
                                                                            2,
                                                                        )}
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </Tab>
                                    )}
                            </Tabs>
                        </div>
                    </Panel>

                    <PanelResizeHandle className='w-[2px] cradle-bg-elevated cradle-border-x hover:bg-[#FF8C00] hover:bg-opacity-50 transition-colors' />

                    {/* Right Panel - Results */}
                    <Panel defaultSize={70} minSize={50}>
                        <div className='h-full flex flex-col px-3'>
                            {selectedEnricher ? (
                                <>
                                    {/* Warning AlertBox */}
                                    {enricherWarning && (
                                        <div className='pt-3'>
                                            <AlertBox
                                                alert={{
                                                    show: true,
                                                    message:
                                                        typeof enricherWarning ===
                                                            'string'
                                                            ? enricherWarning
                                                            : JSON.stringify(
                                                                enricherWarning,
                                                            ),
                                                    color: 'warning',
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div className='w-full flex flex-col pt-3 pb-3'>
                                        {/* Search Bars */}
                                        <div className='flex gap-2'>
                                            <input
                                                type='text'
                                                className='input input-md input-block w-full'
                                                placeholder='Search entries...'
                                                value={searchInput.query}
                                                onChange={(e) =>
                                                    setSearchInput({
                                                        ...searchInput,
                                                        query: e.target.value,
                                                    })
                                                }
                                            />
                                            <input
                                                type='text'
                                                className='input input-md input-block w-full'
                                                placeholder='Search details...'
                                                value={searchInput.details}
                                                onChange={(e) =>
                                                    setSearchInput({
                                                        ...searchInput,
                                                        details: e.target.value,
                                                    })
                                                }
                                            />
                                            <button
                                                className='btn btn-primary'
                                                onClick={handleSearch}
                                            >
                                                Search
                                            </button>
                                            <button
                                                className='btn btn-secondary'
                                                onClick={handleDownloadResults}
                                                disabled={!results || results.length === 0}
                                                title='Download results as JSON'
                                            >
                                                <Download width='18' height='18' />
                                            </button>
                                        </div>
                                    </div>

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
                                                                    src={result.details}
                                                                    theme='monokai'
                                                                    collapsed={1}
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
                                                                <p className='text-xs cradle-text-tertiary italic'>
                                                                    No details available
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Pagination */}
                                                {totalPages > 1 && (
                                                    <div className='pb-4'>
                                                        <Pagination
                                                            currentPage={page}
                                                            totalPages={totalPages}
                                                            onPageChange={(newPage) =>
                                                                setPage(newPage)
                                                            }
                                                            pageSize={pageSize}
                                                            onPageSizeChange={(
                                                                newSize,
                                                            ) => {
                                                                setPageSize(newSize);
                                                                setPage(1);
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </>
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
