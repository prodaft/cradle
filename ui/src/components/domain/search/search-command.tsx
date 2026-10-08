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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { useNdjsonQuery } from '@/hooks/query';
import { fetchClient } from '@services/openapi/client';
import type { components, operations } from '@services/openapi/schema';
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

type EntryResult = components['schemas']['EntryResponse'];

/**
 * SearchDialog component props
 */
interface SearchDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Function to close the dialog */
    onClose: () => void;
}

interface AppliedSearch {
    term: string;
    subtypes: string[];
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
    const [draft, setDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [selectedSubtypes, setSelectedSubtypes] = useState<string[]>([]);
    const [isReady, setIsReady] = useState(false);
    const [appliedSearch, setAppliedSearch] = useState<AppliedSearch>({
        term: '',
        subtypes: [],
        page: 1,
        pageSize: 10,
    });

    const router = useRouter();

    const { data: entryClasses = [] } = useNdjsonQuery({
        path: '/entries/entry-classes/stream/',
        queryKey: ['entry_classes', 'search-command'],
        enabled: isOpen,
        staleTime: 5 * 60_000,
    });

    const subtypes = useMemo(
        () => [...new Set(entryClasses.map((c) => c.subtype))],
        [entryClasses],
    );

    const colors = useMemo(() => {
        const map = new Map<string, string>();
        entryClasses.forEach((ec) => {
            if (ec.color) {
                map.set(ec.subtype, ec.color);
                const parts = ec.subtype.split('/');
                if (parts.length > 1) {
                    map.set(parts[parts.length - 1], ec.color);
                }
            }
        });
        return map;
    }, [entryClasses]);

    const {
        data: searchResults,
        isFetching,
        isFetched,
    } = useQuery({
        queryKey: ['search', appliedSearch] as const,
        queryFn: async () => {
            const trimmed = appliedSearch.term.trim();
            if (appliedSearch.subtypes.length === 0) {
                const { data, error, response } = await fetchClient.GET(
                    '/query/advanced/',
                    {
                        params: {
                            query: {
                                page: appliedSearch.page,
                                page_size: appliedSearch.pageSize,
                                ...(trimmed ? { query: [trimmed] } : {}),
                                wildcard: true,
                            },
                        },
                    },
                );
                if (error) throw { response, error };
                return data;
            }
            const listQuery = {
                page: appliedSearch.page,
                page_size: appliedSearch.pageSize,
                ...(trimmed ? { name: trimmed } : {}),
                ...(appliedSearch.subtypes.length > 0
                    ? { subtype: appliedSearch.subtypes }
                    : {}),
            } as NonNullable<operations['query_list']['parameters']['query']>;
            const { data, error, response } = await fetchClient.GET('/query/', {
                params: { query: listQuery },
            });
            if (error) throw { response, error };
            return data;
        },
        enabled: isOpen && isReady,
        meta: { showErrorToast: true },
    });

    const rows = searchResults?.results ?? [];
    const totalPages = Math.max(1, searchResults?.total_pages ?? 1);
    const { page, pageSize } = appliedSearch;

    const applyOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            setAppliedSearch((prev) => ({
                ...prev,
                term: draft,
                subtypes: selectedSubtypes,
                page: 1,
            }));
        }
    };

    const openEntry = useCallback(
        (item: EntryResult) => {
            onClose();
            router.navigate({
                to: '/dashboards/$subtype/$name',
                params: {
                    subtype: item.subtype,
                    name: item.name,
                },
            });
        },
        [onClose, router],
    );

    const goToPage = (p: number) => setAppliedSearch((prev) => ({ ...prev, page: p }));

    const changePageSize = (size: number) =>
        setAppliedSearch((prev) => ({ ...prev, pageSize: size, page: 1 }));

    useEffect(() => {
        if (isOpen) {
            setDraft('');
            setSelectedSubtypes([]);
            setAppliedSearch((prev) => ({
                term: '',
                subtypes: [],
                page: 1,
                pageSize: prev.pageSize,
            }));
            setIsReady(true);
            requestAnimationFrame(() => inputRef.current?.focus());
        } else {
            setIsReady(false);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className='top-[10vh] translate-y-0 sm:max-w-2xl grid-rows-[minmax(0,1fr)] p-0 gap-0 max-h-[85vh] overflow-hidden'
                showCloseButton={false}
            >
                <DialogTitle className='sr-only'>Search entries</DialogTitle>
                <DialogDescription className='sr-only'>
                    Search for entities and entries by name. Use filters to narrow by
                    type. Press Enter to open, Esc to close.
                </DialogDescription>
                <Command shouldFilter={false}>
                    <CommandInput
                        ref={inputRef}
                        placeholder='Search entries...'
                        value={draft}
                        onValueChange={setDraft}
                        onKeyDown={applyOnEnter}
                    />

                    <SearchFilterSection
                        subtypes={subtypes}
                        selectedSubtypes={selectedSubtypes}
                        setSelectedSubtypes={setSelectedSubtypes}
                        colors={colors}
                    />

                    <ScrollArea className='min-h-0 flex-1'>
                        <CommandList className='max-h-none'>
                            {isFetching ? (
                                <div className='flex items-center justify-center py-6'>
                                    <Spinner />
                                </div>
                            ) : rows.length > 0 ? (
                                <CommandGroup>
                                    {rows.map((item) => {
                                        const color = colors.get(item.subtype);
                                        return (
                                            <CommandItem
                                                key={`${item.subtype}:${item.id ?? item.name}`}
                                                value={`${item.subtype}:${item.id ?? item.name}`}
                                                onSelect={() => openEntry(item)}
                                            >
                                                {color && (
                                                    <span
                                                        className='size-2 rounded-full shrink-0'
                                                        style={{
                                                            backgroundColor: color,
                                                        }}
                                                    />
                                                )}
                                                {item.name}
                                                {item.subtype && (
                                                    <CommandShortcut>
                                                        {item.subtype}
                                                    </CommandShortcut>
                                                )}
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            ) : isFetched ? (
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
                        {rows.length > 0 && (
                            <div className='flex items-center gap-1'>
                                <Select
                                    value={`${pageSize}`}
                                    onValueChange={(v) => {
                                        if (v !== null) changePageSize(Number(v));
                                    }}
                                >
                                    <SelectTrigger className='h-4 w-auto gap-0.5 border-0 px-1 text-[10px] shadow-none focus:ring-0 dark:bg-transparent dark:hover:bg-transparent'>
                                        <SelectValue>
                                            {(v: string | null) => `${v} / page`}
                                        </SelectValue>
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
                                            onClick={() => goToPage(1)}
                                        >
                                            <ChevronsLeft className='size-2.5' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='icon-xs'
                                            className='size-4'
                                            aria-label='Previous page'
                                            disabled={page <= 1}
                                            onClick={() => goToPage(page - 1)}
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
                                            onClick={() => goToPage(page + 1)}
                                        >
                                            <ChevronRight className='size-2.5' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='icon-xs'
                                            className='size-4'
                                            aria-label='Last page'
                                            disabled={page >= totalPages}
                                            onClick={() => goToPage(totalPages)}
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
