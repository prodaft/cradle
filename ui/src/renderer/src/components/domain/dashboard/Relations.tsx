import { Check, Search } from 'iconoir-react';
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState, MouseEvent } from 'react';
import { useNotif } from '@/contexts/ui/NotificationContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { handleAPIError } from '@/utils/api';
import { createDashboardLink } from '@/utils/dashboard';
import AlertBox from '@components/base/Alert/AlertBox';
import LazyPagination from '@components/base/Pagination/LazyPagination';
import SearchFilterSection from '@components/domain/search/SearchFilterSection';

interface Alert {
    show: boolean;
    message: string;
    color: string;
    button?: {
        text: string;
        onClick: () => void;
    };
}

interface Result {
    id?: number;
    name: string;
    subtype: string;
    depth: number;
    color?: string;
}

interface RelationsProps {
    obj: {
        id?: number;
        type?: string;
        [key: string]: any;
    };
}

export default function Relations({ obj }: RelationsProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [depth, setDepth] = useState(2);
    const inputRef = useRef<HTMLInputElement>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [entrySubtypeFilters, setEntrySubtypeFilters] = useState<string[]>([]);
    const [results, setResults] = useState<Result[] | null>(null);
    const { notify } = useNotif();
    const [alert, setAlert] = useState<Alert>({ show: false, message: '', color: 'red' });
    const [entrySubtypes, setEntrySubtypes] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [inaccessibleEntities, setInaccessibleEntities] = useState<string[]>([]);
    const [isRequestingAccess, setIsRequestingAccess] = useState(false);
    const { profile } = useProfile();
    const { entriesApi, knowledgeGraphApi, accessApi } = useApi();
    const { execute } = useAPICall();

    const dialogRoot = document.getElementById('portal-root');
    const { navigate, navigateLink } = useCradleNavigate();
    const handleError = (err: any) => {
        handleAPIError(err, notify);
    };
    const [isLoading, setIsLoading] = useState(false);

    const populateEntrySubtypes = () => {
        entriesApi
            .entryClassesList({})
            .then((entities) => {
                if (entities) {
                    setEntrySubtypes(entities.map((c) => c.subtype));
                }
            })
            .catch(handleError);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            setPage(1);
            performSearch(depth, 1);
        }
    };

    const performSearch = (depth: number, page: number) => {
        setAlert({ ...alert, show: false });
        setIsLoading(true);
        setInaccessibleEntities([]);

        if (entrySubtypeFilters.length === 0) {
            // Use advanced query method for direct search
            knowledgeGraphApi
                .knowledgeGraphNeighborsRetrieve({
                    src: String(obj.id),
                    depth: depth,
                    pageSize: page,
                    query: searchQuery,
                    wildcard: true,
                })
                .then((response) => {
                    setHasNextPage(response.hasNext);
                    // Cast results to include depth field (missing from generated types but present in API response)
                    const resultsWithDepth = response.results as unknown as Result[];
                    resultsWithDepth.sort((a, b) => a.depth - b.depth);
                    setResults(resultsWithDepth);
                })
                .catch(handleError)
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            // Use standard query with filters - note: API doesn't support subtype filtering in this endpoint
            knowledgeGraphApi
                .knowledgeGraphNeighborsRetrieve({
                    src: String(obj.id),
                    depth: depth,
                    pageSize: page,
                    query: searchQuery,
                })
                .then((response) => {
                    setHasNextPage(response.hasNext);
                    // Cast results to include depth field (missing from generated types but present in API response)
                    const resultsWithDepth = response.results as unknown as Result[];
                    // Filter results client-side if needed
                    const filteredResults =
                        entrySubtypeFilters.length > 0
                            ? resultsWithDepth.filter((r) =>
                                entrySubtypeFilters.includes(r.subtype),
                            )
                            : resultsWithDepth;
                    setResults(filteredResults);
                })
                .catch(handleError)
                .finally(() => {
                    setIsLoading(false);
                });
        }

        setPage(page);

        // Check for inaccessible entities
        knowledgeGraphApi
            .knowledgeGraphInaccessibleRetrieve({
                src: String(obj.id),
                depth: depth,
            })
            .then((response) => {
                if (response.inaccessible && response.inaccessible.length > 0) {
                    setInaccessibleEntities(response.inaccessible);

                    // Use AlertBox to show inaccessible entities warning
                    setAlert({
                        show: true,
                        message: `${response.inaccessible.length} related ${response.inaccessible.length === 1 ? 'entity is' : 'entities are'} not accessible`,
                        color: 'yellow',
                        button: {
                            text: 'Request Access',
                            onClick: handleRequestAccess(response.inaccessible),
                        },
                    });
                }
            })
            .catch((err) =>
                console.error('Error fetching inaccessible entities:', err),
            );
    };

    const handleDepthChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value, 10);
        const newDepth = isNaN(value) ? 0 : Math.max(0, Math.min(value, 5));
        setDepth(newDepth);

        if (page === 1) {
            performSearch(newDepth, 1);
        } else {
            setPage(1);
        }
    };

    const handleRequestAccess = (entities: string[]) => () => {
        setIsRequestingAccess(true);
        execute(
            () => Promise.all(entities.map((entity) =>
                accessApi.accessRequestCreate({
                    entityId: entity,
                    requestAccessRequest: {
                        entityId: entity
                    }
                })
            )),
            { successMessage: 'Access request submitted successfully' }
        )
            .then(() => {
                setInaccessibleEntities([]); // Clear inaccessible entities after request
            })
            .catch(() => {})
            .finally(() => {
                setIsRequestingAccess(false);
            });
    };

    const copyToCSV = () => {
        let csvContent = '"type","name"\n';
        if (results && results.length > 0) {
            results.forEach((result) => {
                // Escape double quotes if necessary
                const type = String(result.subtype).replace(/"/g, '""');
                const name = String(result.name).replace(/"/g, '""');
                csvContent += `"${type}","${name}"\n`;
            });
        }
        navigator.clipboard
            .writeText(csvContent)
            .then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            })
            .catch((err) => {
                console.error('Error copying CSV: ', err);
            });
    };

    const handleResultClick = (link: string) => (e: MouseEvent) => {
        e.preventDefault();
        setAlert({ ...alert, show: false });
        navigate(link, { event: e });
    };

    useEffect(() => {
        performSearch(depth, page);
        populateEntrySubtypes();
    }, [page]);

    return (
        <div className='bg-cradle3 p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col flex-1'>
            <div className='mb-4 flex items-center gap-2'>
                {/* Depth Input with Label */}
                <div className='flex flex-col'>
                    <input
                        id='depth-input'
                        type='number'
                        min='0'
                        max='5'
                        className='form-input input input-block input-ghost-primary focus:ring-0 text-white w-20'
                        placeholder='Depth'
                        value={depth}
                        onChange={handleDepthChange}
                    />
                </div>

                {/* Search Input */}
                <div className='flex-grow relative'>
                    <input
                        ref={inputRef}
                        type='text'
                        className='form-input input input-block input-ghost-primary focus:ring-0 pr-10 text-white'
                        placeholder='Search...'
                        value={searchQuery}
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        onClick={() => {
                            setPage(1);
                            performSearch(depth, page);
                        }}
                        className='absolute right-2 top-1/2 transform -translate-y-1/2 bg-transparent border-none cursor-pointer'
                    >
                        <Search />
                    </button>
                </div>
                <button
                    onClick={copyToCSV}
                    className={`btn flex items-center gap-2  ${isCopied ? 'bg-green-800 text-white' : ''}`}
                >
                    {isCopied ? (
                        <>
                            <Check className='w-5 h-5' />
                            Copied!
                        </>
                    ) : (
                        'Copy CSV'
                    )}
                </button>
            </div>

            <SearchFilterSection
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                entrySubtypes={entrySubtypes}
                entrySubtypeFilters={entrySubtypeFilters}
                setEntrySubtypeFilters={setEntrySubtypeFilters}
            />

            <AlertBox alert={alert} />
            {isLoading ? (
                <div className='flex items-center justify-center h-full'>
                    <div className='spinner-dot-pulse spinner-xl'>
                        <div className='spinner-pulse-dot'></div>
                    </div>
                </div>
            ) : (
                <div className='flex-grow overflow-y-auto no-scrollbar space-y-2'>
                    {results && results.length > 0 ? (
                        <div>
                            <LazyPagination
                                currentPage={page}
                                hasNextPage={hasNextPage}
                                onPageChange={setPage}
                            />

                            <div className='overflow-x-auto w-full'>
                                <table className='table table-zebra'>
                                    <thead>
                                        <tr>
                                            <th className='w-32'>Type</th>
                                            <th className=''>Name</th>
                                            <th className='w-20'>Depth</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((result) => {
                                            const dashboardLink =
                                                createDashboardLink(result);
                                            return (
                                                <tr
                                                    key={result.id}
                                                    className='cursor-pointer hover:bg-zinc-100 hover:dark:bg-zinc-800'
                                                    onClick={navigateLink(
                                                        dashboardLink,
                                                    )}
                                                >
                                                    <td className=''>
                                                        <span
                                                            className='badge text-white'
                                                            style={{
                                                                backgroundColor:
                                                                    result.color ||
                                                                    '#ccc',
                                                            }}
                                                        >
                                                            {result.subtype}
                                                        </span>
                                                    </td>
                                                    <td className=''>
                                                        {result.name}
                                                    </td>
                                                    <td className=''>
                                                        <span className='badge badge-xs'>
                                                            {result.depth}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className='w-full text-center text-zinc-500'>
                            No results found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
