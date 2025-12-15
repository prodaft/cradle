import Tooltip from '@/components/base/Tooltip/Tooltip';
import { useNotif } from '@/contexts/ui/NotificationContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { handleAPIError } from '@/utils/api';
import { createDashboardLink } from '@/utils/dashboard';
import AlertBox from '@components/base/Alert/AlertBox';
import TableCard from '@components/base/Card/TableCard';
import ListView from '@components/base/ListView/ListView';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import SearchFilterSection from '@components/domain/search/SearchFilterSection';
import { Check, Copy, Search, Xmark } from 'iconoir-react';
import {
    ChangeEvent,
    KeyboardEvent,
    MouseEvent,
    useEffect,
    useRef,
    useState,
} from 'react';

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
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const [entrySubtypes, setEntrySubtypes] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [inaccessibleEntities, setInaccessibleEntities] = useState<string[]>([]);
    const [isRequestingAccess, setIsRequestingAccess] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [pageSize, setPageSize] = useState(10); // Default page size

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
        } else if (event.key === 'Escape') {
            if (!searchQuery) {
                setIsSearchExpanded(false);
            }
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
                    page: page,
                    pageSize: pageSize,
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
            () =>
                Promise.all(
                    entities.map((entity) =>
                        accessApi.accessRequestCreate({
                            entityId: entity,
                            requestAccessRequest: {
                                entityId: entity,
                            },
                        }),
                    ),
                ),
            { successMessage: 'Access request submitted successfully' },
        )
            .then(() => {
                setInaccessibleEntities([]); // Clear inaccessible entities after request
            })
            .catch(() => { })
            .finally(() => {
                setIsRequestingAccess(false);
            });
    };

    const copyToCSV = () => {
        if (!results || results.length === 0) return;

        let csvContent = '"type","name"\n';

        // Filter results based on selection if any are selected
        const itemsToCopy = selectedIds.length > 0
            ? results.filter(r => r.id !== undefined && selectedIds.includes(r.id))
            : results;

        if (itemsToCopy.length > 0) {
            itemsToCopy.forEach((result) => {
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
                // Optional: clear selection after copy
                // setSelectedIds([]); 
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

    useEffect(() => {
        if (isSearchExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchExpanded]);

    const columns = [
        { key: 'subtype', label: 'Type', className: 'w-32' },
        { key: 'name', label: 'Name' },
        { key: 'depth', label: 'Depth', className: 'w-20' },
    ];

    const renderRow = (result: Result, index: number, selectProps: any = {}) => {
        const { enableMultiSelect, isSelected, onSelect } = selectProps;
        const dashboardLink = createDashboardLink(result);

        return (
            <tr
                key={result.id}
                className='cursor-pointer hover:bg-cradle-bg-elevated transition-colors'
                onClick={navigateLink(dashboardLink)}
            >
                {enableMultiSelect && (
                    <td className='w-12' onClick={(e) => e.stopPropagation()}>
                        <div className='flex items-center'>
                            <input
                                type='checkbox'
                                className='cradle-checkbox'
                                checked={isSelected}
                                onChange={onSelect}
                            />
                        </div>
                    </td>
                )}
                <td className='py-3 px-4'>
                    <span
                        className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white shadow-sm'
                        style={{
                            backgroundColor: result.color || '#71717a',
                        }}
                    >
                        {result.subtype}
                    </span>
                </td>
                <td className='py-3 px-4'>{result.name}</td>
                <td className='py-3 px-4'>
                    <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-cradle-bg-secondary text-cradle-text-secondary border border-cradle-border-accent'>
                        {result.depth}
                    </span>
                </td>
            </tr>
        );
    };

    const calculatedTotalPages = hasNextPage ? page + 1 : page;

    return (
        <div className='flex flex-col h-full gap-4'>
            <TableCard>
                <div className='flex flex-wrap items-center justify-between gap-4'>
                    <div className='flex items-center gap-2 flex-shrink-0'>
                        {/* Copy CSV Action */}
                        <Tooltip content='Copy to CSV'>
                            <button
                                onClick={copyToCSV}
                                disabled={selectedIds.length === 0}
                                className='flex items-center justify-center w-10 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full'
                                title={selectedIds.length > 0 ? `Copy ${selectedIds.length} selected to CSV` : 'Select items to copy'}
                            >
                                {isCopied ? (
                                    <Check className='w-4 h-4 text-green-500' />
                                ) : (
                                    <Copy
                                        className={selectedIds.length > 0 ? 'text-[#FF8C00]' : 'text-cradle-text-secondary'}
                                        width={18}
                                        height={18}
                                    />
                                )}
                            </button>
                        </Tooltip>
                        <div className='h-8 w-px bg-cradle-border-accent' />

                        {/* Depth Control */}
                        <div className='flex items-center gap-2 px-3 h-10 border border-cradle-border-accent rounded-full bg-transparent'>
                            <Tooltip content='Depth'>
                                <input
                                    id='depth-input'
                                    type='number'
                                    min='0'
                                    max='5'
                                    className='bg-transparent text-cradle-text-primary h-full w-8 outline-none text-center font-mono text-sm'
                                    value={depth}
                                    onChange={handleDepthChange}
                                />
                            </Tooltip>
                        </div>

                        <div className='h-8 w-px bg-cradle-border-accent' />

                        {/* Search */}
                        {!isSearchExpanded ? (
                            <button
                                onClick={() => setIsSearchExpanded(true)}
                                className='flex items-center justify-center w-10 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary rounded-full'
                                title='Search'
                            >
                                <Search className='w-4 h-4' />
                            </button>
                        ) : (
                            <div className='flex items-center gap-2 min-w-[280px] bg-cradle-bg-elevated border border-cradle-border-accent h-10 px-2 rounded-full'>
                                <button
                                    onClick={() => {
                                        setPage(1);
                                        performSearch(depth, 1);
                                    }}
                                    className='p-1 flex-shrink-0 transition-colors text-cradle-text-muted hover:text-cradle-text-primary'
                                    title='Search'
                                >
                                    <Search className='w-4 h-4' />
                                </button>
                                <input
                                    ref={inputRef}
                                    type='text'
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={() => {
                                        if (!searchQuery) {
                                            setIsSearchExpanded(false);
                                        }
                                    }}
                                    placeholder='Search relations...'
                                    className='flex-grow bg-transparent text-sm outline-none text-cradle-text-primary placeholder:text-cradle-text-muted rounded-none font-mono'
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setPage(1);
                                            performSearch(depth, 1);
                                        }}
                                        className='p-1 flex-shrink-0 text-cradle-text-muted hover:text-cradle-text-primary transition-colors'
                                        title='Clear search'
                                    >
                                        <Xmark className='w-4 h-4' />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className='flex items-center gap-2'>
                        {/* Pagination */}
                        <PaginationWrapper
                            currentPage={page}
                            totalPages={calculatedTotalPages}
                            onPageChange={setPage}
                            pageSize={pageSize}
                            onPageSizeChange={setPageSize}
                            disabled={!results || results.length === 0}
                        />
                    </div>
                </div>
            </TableCard>

            <SearchFilterSection
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                entrySubtypes={entrySubtypes}
                entrySubtypeFilters={entrySubtypeFilters}
                setEntrySubtypeFilters={setEntrySubtypeFilters}
            />

            <AlertBox alert={alert} />

            <div className='flex-grow overflow-hidden flex flex-col'>
                <div className='flex-grow overflow-auto'>
                    <ListView
                        data={results || []}
                        columns={columns}
                        renderRow={renderRow}
                        loading={isLoading}
                        emptyMessage='No relations found'
                        tableClassName='table w-full'
                        enableMultiSelect={true}
                        setSelected={(ids) => setSelectedIds(ids as number[])}
                    />
                </div>
            </div>
        </div>
    );
}
