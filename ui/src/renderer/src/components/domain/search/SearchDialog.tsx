import type { Alert } from '@/types';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { WarningCircle } from 'iconoir-react';
import Pagination from '@components/base/Pagination/Pagination';
import SearchResult from '@components/base/SearchResult/SearchResult';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { useApi, useAPICall, useCradleNavigate } from '@hooks';
import { handleAPIError, parseAPIError } from '@utils/api';
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
            .catch(async (error) => {
                const parsed = await parseAPIError(error);
                handleAPIError(parsed);
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
                className='w-11/12 md:w-3/4 lg:w-[640px] max-h-[75vh] bg-card border flex flex-col relative overflow-hidden rounded-lg'
                onClick={(e) => e.stopPropagation()}
            >
                <Command className='h-full flex flex-col'>
                    {/* Search Input - styled like CommandInput but with textarea for multi-line */}
                    <div className='border-b px-3'>
                        <div className='flex items-center gap-2 py-3'>
                            <Search className='h-4 w-4 shrink-0 opacity-50' />
                            <textarea
                                ref={inputRef}
                                className='flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground resize-none max-h-[15vh] overflow-y-auto leading-relaxed'
                                placeholder='Search entries...'
                                value={searchQuery}
                                rows={1}
                                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                                    setSearchQuery(event.target.value);
                                    autoResize(event.target);
                                }}
                                onKeyDown={handleKeyDown}
                            />
                            {searchQuery && (
                                <Button
                                    variant='ghost'
                                    size='icon-sm'
                                    onClick={() => {
                                        setSearchQuery('');
                                        if (inputRef.current) {
                                            autoResize(inputRef.current);
                                        }
                                        setPage(1);
                                        performSearch();
                                    }}
                                    className='h-4 w-4 p-0'
                                    title='Clear search'
                                >
                                    <svg
                                        width='1em'
                                        height='1em'
                                        strokeWidth='1.5'
                                        viewBox='0 0 24 24'
                                        fill='none'
                                        xmlns='http://www.w3.org/2000/svg'
                                        color='currentColor'
                                        className='h-3 w-3'
                                    >
                                        <path
                                            d='M6.75827 17.2426L12.0009 12M17.2435 6.75736L12.0009 12M12.0009 12L6.75827 6.75736M12.0009 12L17.2435 17.2426'
                                            stroke='currentColor'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        ></path>
                                    </svg>
                                </Button>
                            )}
                        </div>
                        {/* Keyboard hint */}
                        <div className='flex items-center gap-4 pb-3 text-xs text-muted-foreground'>
                            <span className='flex items-center gap-1.5'>
                                <Kbd>Enter</Kbd>
                                <span>search</span>
                            </span>
                            <span className='flex items-center gap-1.5'>
                                <KbdGroup>
                                    <Kbd>Shift</Kbd>
                                    <span>+</span>
                                    <Kbd>Enter</Kbd>
                                </KbdGroup>
                                <span>new line</span>
                            </span>
                            <span className='flex items-center gap-1.5'>
                                <Kbd>Esc</Kbd>
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
                        <div className='px-4 py-2 border-b flex items-center gap-2 flex-wrap'>
                            <span className='text-xs text-muted-foreground uppercase tracking-wider'>
                                Active:
                            </span>
                            {entrySubtypeFilters.map((filter) => (
                                <Button
                                    key={filter}
                                    variant='outline'
                                    size='sm'
                                    onClick={() =>
                                        setEntrySubtypeFilters((prev) =>
                                            prev.filter((f) => f !== filter),
                                        )
                                    }
                                    className='inline-flex items-center gap-1 px-2 py-0.5 text-xs h-auto'
                                >
                                    <span>{filter}</span>
                                    <Xmark className='w-3 h-3' />
                                </Button>
                            ))}
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => setEntrySubtypeFilters([])}
                                className='text-xs h-auto'
                            >
                                Clear all
                            </Button>
                        </div>
                    )}

                    {alert.show && (
                        <AlertComponent variant={alert.color === 'red' || alert.color === 'error' ? 'destructive' : 'default'}>
                            <WarningCircle />
                            <AlertDescription>{alert.message}</AlertDescription>
                        </AlertComponent>
                    )}

                    {/* Results Section */}
                    <div className='flex-1 overflow-hidden min-h-0'>
                        <CommandList className='max-h-none'>
                            {isLoading ? (
                                <div className='flex items-center justify-center py-12'>
                                    <div className='cradle-spinner-dot-pulse cradle-spinner-xl'>
                                        <div className='cradle-spinner-pulse-dot'></div>
                                    </div>
                                </div>
                            ) : results && results.length > 0 ? (
                                <CommandGroup>
                                    {results.map((result) => {
                                        const dashboardLink = createDashboardLink(result);
                                        return (
                                            <CommandItem
                                                key={result.id}
                                                onSelect={() => {
                                                    handleResultClick(dashboardLink)(
                                                        {} as React.MouseEvent,
                                                    );
                                                }}
                                                className='px-4 py-3'
                                            >
                                                {result.subtype && (
                                                    <span className='text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-1.5 py-0.5 bg-muted border border-border min-w-[60px] text-center mr-3'>
                                                        {result.subtype}
                                                    </span>
                                                )}
                                                <span className='flex-1 text-sm truncate'>
                                                    {result.name}
                                                </span>
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            ) : (
                                <CommandEmpty>
                                    <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                                        <Search className='w-10 h-10 mb-3 opacity-30' />
                                        <span className='text-sm'>No results found</span>
                                        {searchQuery && (
                                            <span className='text-xs mt-1 opacity-70'>
                                                Try a different search term
                                            </span>
                                        )}
                                    </div>
                                </CommandEmpty>
                            )}
                        </CommandList>
                    </div>
                </Command>

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
