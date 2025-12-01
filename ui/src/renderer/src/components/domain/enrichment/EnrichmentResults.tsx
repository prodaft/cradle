import { useTabContext } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import Pagination from '@components/base/Pagination/Pagination';
import { EnrichmentRelation } from '@services/cradle/models';
import { useEffect, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

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
    return <div className='flex items-center justify-center h-full'>
      <p className='cradle-text-tertiary'>
        Invalid enrichment ID
      </p>
    </div>;
  }

  const { execute } = useAPICall();

  // State for enrichment details
  const [enricherTypes, setEnricherTypes] = useState<string[]>([]);
  const [enrichersDetail, setEnrichersDetail] = useState<
    Array<{ [key: string]: string }>
  >([]);
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

        setEnricherTypes(details.enricherTypes || []);
        setEnrichersDetail(details.enrichersDetail || []);

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

  // Get enricher display name from enrichersDetail
  const getEnricherName = (enricherType: string): string => {
    const detail = enrichersDetail.find((d) => d.className === enricherType);
    return detail?.name || enricherType;
  };

  return (
    <div className='w-full h-full'>
      <PanelGroup direction='horizontal' className='h-full'>
        {/* Left Panel - Enrichment Techniques */}
        <Panel defaultSize={30} minSize={20} maxSize={50}>
          <div className='h-full flex flex-col px-3'>
            <div className='pt-3 pb-3'>
              <h3 className='text-lg font-semibold cradle-text-secondary'>
                Enrichment Techniques
              </h3>
            </div>
            <div className='flex-grow overflow-y-auto'>
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
                <div className='space-y-2 pr-2'>
                  {enricherTypes.map((enricherType) => (
                    <div
                      key={enricherType}
                      className={`p-3 rounded cursor-pointer transition-colors ${selectedEnricher === enricherType
                        ? 'cradle-bg-elevated border-2 border-primary'
                        : 'cradle-bg-base hover:cradle-bg-elevated'
                        }`}
                      onClick={() => {
                        setSelectedEnricher(enricherType);
                        setPage(1);
                        setSearchParams({ query: '', details: '' });
                        setSearchInput({ query: '', details: '' });
                      }}
                    >
                      <div className='font-medium cradle-text-primary'>
                        {getEnricherName(enricherType)}
                      </div>
                      <div className='text-xs cradle-text-tertiary mt-1'>
                        {enricherType}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className='w-[2px] cradle-bg-elevated cradle-border-x hover:bg-[#FF8C00] hover:bg-opacity-50 transition-colors' />

        {/* Right Panel - Results */}
        <Panel defaultSize={70} minSize={50}>
          <div className='h-full flex flex-col px-3'>
            {selectedEnricher ? (
              <>
                <div className='w-full flex flex-col pt-3 pb-3'>
                  {/* Search Bars */}
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      className='input input-md input-block w-full'
                      placeholder='Search entries...'
                      value={searchInput.query}
                      onChange={(e) => setSearchInput({ ...searchInput, query: e.target.value })}
                      onKeyPress={handleSearchKeyPress}
                    />
                    <input
                      type='text'
                      className='input input-md input-block w-full'
                      placeholder='Search details...'
                      value={searchInput.details}
                      onChange={(e) => setSearchInput({ ...searchInput, details: e.target.value })}
                      onKeyPress={handleSearchKeyPress}
                    />
                    <button
                      className='btn btn-primary'
                      onClick={handleSearch}
                    >
                      Search
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
                            className='p-4 cradle-bg-elevated rounded border cradle-border'
                          >
                            <pre className='text-xs overflow-x-auto whitespace-pre-wrap break-words cradle-text-primary'>
                              {JSON.stringify(result, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className='pb-4'>
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
  );
}