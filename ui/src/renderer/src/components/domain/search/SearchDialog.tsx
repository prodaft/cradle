import type { Alert } from '@/types';
import AlertBox from '@components/base/Alert/AlertBox';
import Pagination from '@components/base/Pagination/Pagination';
import SearchResult from '@components/base/SearchResult/SearchResult';
import { useNotif } from '@contexts/ui';
import { useApi, useAPICall, useCradleNavigate } from '@hooks';
import { handleAPIError } from '@utils/api';
import { createDashboardLink } from '@utils/dashboard';
import { Search, Xmark } from 'iconoir-react';
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
        // Escape to close
        if (event.key === 'Escape') {
            onClose();
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

    const hasActiveFilters = entrySubtypeFilters.length > 0;

    return createPortal(
        <div
            className='fixed inset-0 bg-black/70 flex items-start justify-center z-50 pt-[10vh]'
            onClick={() => {
                setAlert({ ...alert, show: false });
                onClose();
            }}
        >
            <div
                className='w-11/12 md:w-3/4 lg:w-[640px] max-h-[75vh] cradle-bg-elevated cradle-border flex flex-col relative overflow-hidden'
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Header */}
                <div className='p-4 cradle-border-b'>
                    <div className='flex items-center gap-3'>
                        <div className='flex-grow flex items-center gap-2 cradle-bg-secondary cradle-border px-3 py-2 rounded'>
                            <textarea
                                ref={inputRef}
                                className='flex-grow bg-transparent text-cradle-text-primary placeholder:text-cradle-text-muted text-base resize-none outline-none max-h-[15vh] overflow-y-auto leading-relaxed'
                                placeholder='Search entries...'
                                value={searchQuery}
                                rows={1}
                                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                                    setSearchQuery(event.target.value);
                                    autoResize(event.target);
                                }}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                onClick={() => {
                                    setPage(1);
                                    performSearch();
                                }}
                                className='cradle-btn cradle-btn-secondary p-1.5 hover:cradle-bg-elevated rounded flex-shrink-0 transition-colors'
                                title='Search'
                            >
                                <Search className='w-4 h-4' />
                            </button>
                        </div>
                        <button
                            onClick={onClose}
                            className='cradle-btn p-2'
                            title='Close (Esc)'
                        >
                            <Xmark width={16} height={16} />
                        </button>
                    </div>

                    {/* Keyboard hint */}
                    <div className='flex items-center gap-4 mt-3 text-xs text-cradle-text-muted'>
                        <span className='flex items-center gap-1.5'>
                            <kbd className='px-1.5 py-0.5 cradle-bg-secondary cradle-border text-[10px] font-mono'>
                                Enter
                            </kbd>
                            <span>search</span>
                        </span>
                        <span className='flex items-center gap-1.5'>
                            <kbd className='px-1.5 py-0.5 cradle-bg-secondary cradle-border text-[10px] font-mono'>
                                Shift+Enter
                            </kbd>
                            <span>new line</span>
                        </span>
                        <span className='flex items-center gap-1.5'>
                            <kbd className='px-1.5 py-0.5 cradle-bg-secondary cradle-border text-[10px] font-mono'>
                                Esc
                            </kbd>
                            <span>close</span>
                        </span>
                    </div>
                </div>

                {/* Filters Section */}
                <SearchFilterSection
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    entrySubtypes={entrySubtypes}
                    entrySubtypeFilters={entrySubtypeFilters}
                    setEntrySubtypeFilters={setEntrySubtypeFilters}
                />

                {/* Active Filters Display */}
                {hasActiveFilters && (
                    <div className='px-4 py-2 cradle-border-b flex items-center gap-2 flex-wrap'>
                        <span className='text-xs text-cradle-text-muted uppercase tracking-wider'>
                            Active:
                        </span>
                        {entrySubtypeFilters.map((filter) => (
                            <button
                                key={filter}
                                onClick={() =>
                                    setEntrySubtypeFilters((prev) =>
                                        prev.filter((f) => f !== filter),
                                    )
                                }
                                className='inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-cradle-accent-primary/10 text-cradle-accent-primary border border-cradle-accent-primary/30 hover:bg-cradle-accent-primary/20 transition-colors'
                            >
                                <span>{filter}</span>
                                <Xmark className='w-3 h-3' />
                            </button>
                        ))}
                        <button
                            onClick={() => setEntrySubtypeFilters([])}
                            className='text-xs text-cradle-text-muted hover:text-cradle-accent-primary transition-colors'
                        >
                            Clear all
                        </button>
                    </div>
                )}

                <AlertBox alert={alert} />

                {/* Results Section */}
                <div className='flex-1 overflow-y-auto min-h-0'>
                    {isLoading ? (
                        <div className='flex items-center justify-center py-12'>
                            <div className='spinner-dot-pulse spinner-xl'>
                                <div className='spinner-pulse-dot'></div>
                            </div>
                        </div>
                    ) : results && results.length > 0 ? (
                        <div className='divide-y divide-cradle-border-primary'>
                            {results.map((result) => {
                                const dashboardLink = createDashboardLink(result);
                                return (
                                    <div
                                        key={result.id}
                                        className='group hover:bg-cradle-bg-secondary transition-colors'
                                    >
                                        <SearchResult
                                            name={result.name}
                                            type={result.type}
                                            subtype={result.subtype}
                                            onClick={handleResultClick(dashboardLink)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className='flex flex-col items-center justify-center py-12 text-cradle-text-muted'>
                            <Search className='w-10 h-10 mb-3 opacity-30' />
                            <span className='text-sm'>No results found</span>
                            {searchQuery && (
                                <span className='text-xs mt-1 opacity-70'>
                                    Try a different search term
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer with Pagination */}
                {results && results.length > 0 && (
                    <div className='px-4 py-3 cradle-border-t cradle-bg-secondary flex items-center justify-between'>
                        <span className='text-xs text-cradle-text-muted whitespace-nowrap'>
                            Page {page} of {totalPages}
                        </span>
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </div>
        </div>,
        dialogRoot,
    );
}
