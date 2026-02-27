import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { $api, fetchClient } from '@services/openapi/client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import React, {
    KeyboardEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import SearchFilterSection from './search-filter';

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

interface SearchState {
    query: string;
    filters: string[];
    page: number;
    pageSize: number;
}

/**
 * Dialog to search for entries
 *
 * Features:
 * - Full-screen overlay with search functionality
 * - Filters for entry type and artifact type
 * - Shows paginated search results
 * - Supports Enter to search
 * - Advanced search that bypasses filters
 */
export default function SearchDialog({
    isOpen,
    onClose,
}: SearchDialogProps): React.JSX.Element {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [entrySubtypeFilters, setEntrySubtypeFilters] = useState<string[]>([]);
    const [ready, setReady] = useState(false);
    const [searchState, setSearchState] = useState<SearchState>({
        query: '',
        filters: [],
        page: 1,
        pageSize: 10,
    });

    const router = useRouter();

    const entryClassesQuery = $api.useQuery(
        'get',
        '/entries/entry_classes/',
        {},
        {
            enabled: isOpen,
            staleTime: 5 * 60_000,
        },
    );

    const entrySubtypes = useMemo(
        () => [
            ...new Set((entryClassesQuery.data?.results ?? []).map((c) => c.subtype)),
        ],
        [entryClassesQuery.data],
    );

    const entryClassColors = useMemo(() => {
        const colorMap = new Map<string, string>();
        (entryClassesQuery.data?.results ?? []).forEach((ec) => {
            if (ec.color) {
                colorMap.set(ec.subtype, ec.color);
                const parts = ec.subtype.split('/');
                if (parts.length > 1) {
                    colorMap.set(parts[parts.length - 1], ec.color);
                }
            }
        });
        return colorMap;
    }, [entryClassesQuery.data]);

    const searchResults = useQuery({
        queryKey: ['search', searchState] as const,
        queryFn: async () => {
            const trimmed = searchState.query.trim();
            if (searchState.filters.length === 0) {
                const { data, error, response } = await fetchClient.GET(
                    '/query/advanced/',
                    {
                        params: {
                            query: {
                                page: searchState.page,
                                page_size: searchState.pageSize,
                                query: trimmed || undefined,
                                wildcard: true,
                            } as any,
                        },
                    },
                );
                if (error) throw { response };
                return data;
            }
            const { data, error, response } = await fetchClient.GET('/query/', {
                params: {
                    query: {
                        page: searchState.page,
                        page_size: searchState.pageSize,
                        name: trimmed || undefined,
                        subtype: searchState.filters,
                    } as any,
                },
            });
            if (error) throw { response };
            return data;
        },
        enabled: isOpen && ready,
        meta: { showErrorToast: true },
    });

    const results = (searchResults.data as any)?.results as
        | SearchResultData[]
        | undefined;
    const hasResults = (results?.length ?? 0) > 0;
    const totalPages = Math.max(1, (searchResults.data as any)?.total_pages ?? 1);
    const { page, pageSize } = searchState;

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            setSearchState((prev) => ({
                ...prev,
                query: searchQuery,
                filters: entrySubtypeFilters,
                page: 1,
            }));
        }
    };

    const handleSelectResult = useCallback(
        (result: SearchResultData) => {
            onClose();
            router.navigate({
                to: '/dashboards/$subtype/$name',
                params: {
                    subtype: result.subtype,
                    name: result.name,
                },
            });
        },
        [onClose, router],
    );

    const setPage = (p: number) => setSearchState((prev) => ({ ...prev, page: p }));

    const setPageSize = (size: number) =>
        setSearchState((prev) => ({ ...prev, pageSize: size, page: 1 }));

    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setEntrySubtypeFilters([]);
            setSearchState((prev) => ({
                query: '',
                filters: [],
                page: 1,
                pageSize: prev.pageSize,
            }));
            setReady(true);
            requestAnimationFrame(() => inputRef.current?.focus());
        } else {
            setReady(false);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className='top-[10vh] translate-y-0 max-w-lg p-0 gap-0 max-h-[75vh] overflow-hidden'
                showCloseButton={false}
            >
                <DialogTitle className='sr-only'>Search entries</DialogTitle>
                <Command shouldFilter={false}>
                    <CommandInput
                        ref={inputRef}
                        placeholder='Search entries...'
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                        onKeyDown={handleKeyDown}
                    />

                    <SearchFilterSection
                        entrySubtypes={entrySubtypes}
                        entrySubtypeFilters={entrySubtypeFilters}
                        setEntrySubtypeFilters={setEntrySubtypeFilters}
                        entryClassColors={entryClassColors}
                    />

                    <ScrollArea className='min-h-0 flex-1 max-h-[50vh]'>
                        <CommandList className='max-h-none'>
                            {searchResults.isFetching ? (
                                <div className='flex items-center justify-center py-6'>
                                    <Spinner />
                                </div>
                            ) : hasResults ? (
                                <CommandGroup>
                                    {results!.map((result) => {
                                        const color = entryClassColors.get(
                                            result.subtype,
                                        );
                                        return (
                                            <CommandItem
                                                key={result.id}
                                                value={`${result.subtype}:${result.id}`}
                                                onSelect={() =>
                                                    handleSelectResult(result)
                                                }
                                            >
                                                {color && (
                                                    <span
                                                        className='size-2 rounded-full shrink-0'
                                                        style={{
                                                            backgroundColor: color,
                                                        }}
                                                    />
                                                )}
                                                {result.name}
                                                {result.subtype && (
                                                    <CommandShortcut>
                                                        {result.subtype}
                                                    </CommandShortcut>
                                                )}
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            ) : searchResults.isFetched ? (
                                <CommandEmpty>No results found.</CommandEmpty>
                            ) : null}
                        </CommandList>
                    </ScrollArea>

                    <div className='bg-border -mx-1 h-px shrink-0' role='separator' />
                    <div className='flex shrink-0 items-center justify-between px-3 py-1.5 text-xs text-muted-foreground'>
                        <div className='flex items-center gap-3'>
                            <span>
                                <Kbd>↵</Kbd> search
                            </span>
                            <span>
                                <Kbd>esc</Kbd> close
                            </span>
                        </div>
                        {hasResults && (
                            <div className='flex items-center gap-1'>
                                <Select
                                    value={`${pageSize}`}
                                    onValueChange={(v) => setPageSize(Number(v))}
                                >
                                    <SelectTrigger className='h-4 w-auto gap-0.5 border-0 px-1 text-[10px] shadow-none focus:ring-0'>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent side='top' align='end'>
                                        {[10, 20, 30, 40, 50].map((size) => (
                                            <SelectItem key={size} value={`${size}`}>
                                                {size} / page
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {totalPages > 1 && (
                                    <div className='flex items-center'>
                                        <Button
                                            variant='ghost'
                                            size='icon-xs'
                                            className='size-4'
                                            aria-label='First page'
                                            disabled={page <= 1}
                                            onClick={() => setPage(1)}
                                        >
                                            <ChevronsLeft className='size-2.5' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='icon-xs'
                                            className='size-4'
                                            aria-label='Previous page'
                                            disabled={page <= 1}
                                            onClick={() => setPage(page - 1)}
                                        >
                                            <ChevronLeft className='size-2.5' />
                                        </Button>
                                        <span className='tabular-nums text-[10px] px-0.5'>
                                            {page}/{totalPages}
                                        </span>
                                        <Button
                                            variant='ghost'
                                            size='icon-xs'
                                            className='size-4'
                                            aria-label='Next page'
                                            disabled={page >= totalPages}
                                            onClick={() => setPage(page + 1)}
                                        >
                                            <ChevronRight className='size-2.5' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='icon-xs'
                                            className='size-4'
                                            aria-label='Last page'
                                            disabled={page >= totalPages}
                                            onClick={() => setPage(totalPages)}
                                        >
                                            <ChevronsRight className='size-2.5' />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Command>
            </DialogContent>
        </Dialog>
    );
}
