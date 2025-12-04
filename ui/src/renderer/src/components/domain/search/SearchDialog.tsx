import type { Alert } from '@/types';
import AlertBox from '@components/base/Alert/AlertBox';
import Pagination from '@components/base/Pagination/Pagination';
import SearchResult from '@components/base/SearchResult/SearchResult';
import { useNotif } from '@contexts/ui';
import { useApi, useAPICall, useCradleNavigate } from '@hooks';
import { handleAPIError } from '@utils/api';
import { createDashboardLink } from '@utils/dashboard';
import { Search } from 'iconoir-react';
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SearchFilterSection from './SearchFilterSection';

/**
 * Search result from API
 * Note: Entry IDs are numbers (BigAutoField in backend)
 */
interface SearchResultData {
    id: number;
    name: string;
    type: string;
    subtype: string;
}

/**
 * SearchDialog component props
 */
export interface SearchDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Function to close the dialog */
    onClose: () => void;
}

/**
 * Dialog to search for entries
 *
 * Features:
 * - Full-screen overlay with search functionality
 * - Filters for entry type and artifact type
 * - Shows paginated search results
 * - Supports Enter to search, Shift+Enter for newline
 * - Advanced search that bypasses filters
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <SearchDialog
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 * />
 * ```
 */
export default function SearchDialog({
    isOpen,
    onClose,
}: SearchDialogProps): JSX.Element | null {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [entrySubtypeFilters, setEntrySubtypeFilters] = useState<string[]>([]);
    const [results, setResults] = useState<SearchResultData[] | null>(null);
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const [entrySubtypes, setEntrySubtypes] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const dialogRoot = document.getElementById('portal-root');
    const { navigate, navigateLink } = useCradleNavigate();
    const { queryApi, entriesApi } = useApi();
    const { notify } = useNotif();
    const [isLoading, setIsLoading] = useState(false);
    const { execute } = useAPICall();

    const autoResize = (el: HTMLTextAreaElement | null) => {
        if (!el) return;
        el.style.height = 'auto';
        const maxH = parseInt(getComputedStyle(el).maxHeight || '0', 10);
        const newHeight = el.scrollHeight;
        if (maxH && newHeight > maxH) {
            el.style.height = `${maxH}px`;
        } else {
            el.style.height = `${newHeight}px`;
        }
    };

    const populateEntrySubtypes = () => {
        entriesApi
            .entryClassesList({})
            .then((entities) => {
                setEntrySubtypes(entities.map((c) => c.subtype));
            })
            .catch((error) => {
                handleAPIError(error, notify);
            });
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter to search; Shift+Enter to insert a newline
        if (event.key === 'Enter') {
            if (event.shiftKey) {
                return; // allow newline
            }
            event.preventDefault();
            setPage(1);
            performSearch();
        }
    };

    const handleResultClick = (link: string) => (e: React.MouseEvent) => {
        setAlert({ ...alert, show: false });
        onClose();
        navigate(link, { event: e });
    };

    const performSearch = async () => {
        setAlert({ ...alert, show: false });
        setIsLoading(true);
        let searchQueries = searchQuery
            .split('\n')
            .map((q) => q.trim())
            .filter((q) => q !== '');

        if (entrySubtypeFilters.length === 0) {
            try {
                let response = await execute(() =>
                    queryApi.queryAdvancedRetrieve({
                        page: page,
                        pageSize: 10,
                        query: searchQueries,
                        wildcard: true,
                    }),
                );
                setTotalPages(response.totalPages);
                setResults(response.results as SearchResultData[]);
            } finally {
                setIsLoading(false);
            }
        } else {
            try {
                let response = await execute(() =>
                    queryApi.queryList({
                        page: page,
                        pageSize: 10,
                        name: searchQueries,
                        subtype: entrySubtypeFilters,
                    }),
                );

                setTotalPages(response.totalPages);
                setResults(response.results as SearchResultData[]);
            } finally {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            autoResize(inputRef.current);
            performSearch();
        }
        populateEntrySubtypes();
    }, [isOpen, page]);

    useEffect(() => {
        // Keep textarea sized correctly if value changes programmatically
        if (inputRef.current) {
            autoResize(inputRef.current);
        }
    }, [searchQuery]);

    useEffect(() => {
        if (isOpen) {
            setPage(1);
        }
    }, [isOpen]);

    if (!isOpen || !dialogRoot) return null;

    return createPortal(
        <div
            className='fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50'
            onClick={() => {
                setAlert({ ...alert, show: false });
                onClose();
            }}
        >
            <div
                className='w-11/12 md:w-3/4 lg:w-1/2 h-4/5 bg-cradle3 p-8 bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col relative'
                onClick={(e) => e.stopPropagation()}
            >
                <div className='mb-4 flex items-center gap-2'>
                    <div className='flex-grow relative'>
                        <textarea
                            ref={inputRef}
                            className='form-input input input-block input-ghost-primary focus:ring-0 pr-10 text-white resize-none max-h-[20vh] overflow-auto overflow-y-hidden'
                            placeholder='Search...'
                            value={searchQuery}
                            rows={1}
                            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                                setSearchQuery(event.target.value);
                                autoResize(event.target);
                            }}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            onClick={() => performSearch()}
                            className='absolute right-2 top-1/2 transform -translate-y-1/2 bg-transparent border-none cursor-pointer'
                        >
                            <Search />
                        </button>
                    </div>
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
                                {results.map((result) => {
                                    const dashboardLink = createDashboardLink(result);
                                    return (
                                        <div className='mb-3' key={result.id}>
                                            <SearchResult
                                                name={result.name}
                                                type={result.type}
                                                subtype={result.subtype}
                                                onClick={handleResultClick(
                                                    dashboardLink,
                                                )}
                                            />
                                        </div>
                                    );
                                })}

                                <Pagination
                                    currentPage={page}
                                    totalPages={totalPages}
                                    onPageChange={setPage}
                                />
                            </div>
                        ) : (
                            <div className='w-full text-center text-zinc-400 dark:text-zinc-300'>
                                No results found!
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>,
        dialogRoot,
    );
}
