import Pagination from '@/components/base/Pagination/Pagination';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import { Spinner } from '@/components/ui/spinner';
import type { Alert } from '@/types';
import { useApi } from '@hooks';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { createDashboardLink } from '@utils/dashboard';
import { Search, WarningCircle } from 'iconoir-react';
import React, { KeyboardEvent, useEffect, useRef, useState } from 'react';
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
 * - Supports Enter to search
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
}: SearchDialogProps): React.JSX.Element | null {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [entrySubtypeFilters, setEntrySubtypeFilters] = useState<string[]>([]);
    const [results, setResults] = useState<SearchResultData[] | null>(null);
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const [entrySubtypes, setEntrySubtypes] = useState<string[]>([]);
    const [entryClassColors, setEntryClassColors] = useState<Map<string, string>>(
        new Map(),
    );
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const dialogRoot = document.getElementById('portal-root');
    const router = useRouter();
    const { queryApi, entriesApi } = useApi();
    const [isLoading, setIsLoading] = useState(false);

    const fetchEntrySubtypesMutation = useMutation({
        mutationFn: async () => {
            const entities = await entriesApi.entryClassesList({});
            return entities;
        },
        meta: {
            errorMessage: 'Failed to load entry subtypes',
        },
        onSuccess: (entryClasses) => {
            setEntrySubtypes(entryClasses.map((c) => c.subtype));
            const colorMap = new Map<string, string>();
            entryClasses.forEach((ec) => {
                if (ec.color) {
                    // Handle full path subtypes (e.g., "username/rocket.chat")
                    colorMap.set(ec.subtype, ec.color);
                    // Also handle just the last part for hierarchy matching
                    const parts = ec.subtype.split('/');
                    if (parts.length > 1) {
                        colorMap.set(parts[parts.length - 1], ec.color);
                    }
                }
            });
            setEntryClassColors(colorMap);
        },
    });

    const searchAdvancedMutation = useMutation({
        mutationFn: async (params: {
            page: number;
            pageSize: number;
            query: string[];
            wildcard: boolean;
        }) => {
            return await queryApi.queryAdvancedRetrieve(params);
        },
        meta: {
            suppressNotification: true,
        },
    });

    const searchListMutation = useMutation({
        mutationFn: async (params: {
            page: number;
            pageSize: number;
            name: string[];
            subtype: string[];
        }) => {
            return await queryApi.queryList(params);
        },
        meta: {
            suppressNotification: true,
        },
    });

    const populateEntrySubtypes = async () => {
        fetchEntrySubtypesMutation.mutate();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        // Enter to search
        if (event.key === 'Enter') {
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
        router.navigate({ to: link as any });
    };

    const performSearch = async () => {
        setAlert({ ...alert, show: false });
        setIsLoading(true);
        const trimmedQuery = searchQuery.trim();

        try {
            let response;
            if (entrySubtypeFilters.length === 0) {
                response = await searchAdvancedMutation.mutateAsync({
                    page: page,
                    pageSize: 10,
                    query: trimmedQuery ? [trimmedQuery] : [],
                    wildcard: true,
                });
            } else {
                response = await searchListMutation.mutateAsync({
                    page: page,
                    pageSize: 10,
                    name: trimmedQuery ? [trimmedQuery] : [],
                    subtype: entrySubtypeFilters,
                });
            }
            setTotalPages(response.totalPages);
            setResults(response.results as SearchResultData[]);
        } catch (error) {
            // Error handled by mutation
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (inputRef.current) {
                inputRef.current.focus();
                performSearch();
            }
            populateEntrySubtypes();
        }
    }, [isOpen, page]);

    useEffect(() => {
        if (isOpen) {
            setPage(1);
        }
    }, [isOpen]);

    if (!isOpen || !dialogRoot) return null;

    return createPortal(
        <div
            className='fixed inset-0 bg-black/70 flex items-start justify-center z-50 pt-[10vh]'
            onClick={() => {
                setAlert({ ...alert, show: false });
                onClose();
            }}
        >
            <div
                className='w-11/12 md:w-3/4 lg:w-[640px] max-h-[75vh] bg-card border flex flex-col relative overflow-hidden rounded-lg shadow-md'
                onClick={(e) => e.stopPropagation()}
            >
                <Command className='h-full flex flex-col' shouldFilter={false}>
                    <div className='relative'>
                        <CommandInput
                            ref={inputRef}
                            placeholder='Search entries...'
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            onKeyDown={handleKeyDown}
                        />
                        {searchQuery && (
                            <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={() => {
                                    setSearchQuery('');
                                    setPage(1);
                                    performSearch();
                                }}
                                className='absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 p-0'
                                title='Clear search'
                            >
                                <Xmark className='h-3 w-3' />
                            </Button>
                        )}
                    </div>

                    {/* Filters Section */}
                    <SearchFilterSection
                        showFilters={showFilters}
                        setShowFilters={setShowFilters}
                        entrySubtypes={entrySubtypes}
                        entrySubtypeFilters={entrySubtypeFilters}
                        setEntrySubtypeFilters={setEntrySubtypeFilters}
                        entryClassColors={entryClassColors}
                    />

                    {alert.show && (
                        <AlertComponent
                            variant={
                                alert.color === 'red' || alert.color === 'error'
                                    ? 'destructive'
                                    : 'default'
                            }
                        >
                            <WarningCircle />
                            <AlertDescription>{alert.message}</AlertDescription>
                        </AlertComponent>
                    )}

                    {/* Results Section */}
                    <CommandList className='flex-1 overflow-auto'>
                        {isLoading ? (
                            <div className='flex items-center justify-center py-12'>
                                <Spinner className='size-10' />
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
                                            className='px-4 py-3 cursor-pointer'
                                            value={result.name}
                                        >
                                            {result.subtype && (
                                                <Badge
                                                    variant='outline'
                                                    className='mr-3'
                                                    style={
                                                        entryClassColors.get(result.subtype)
                                                            ? {
                                                                backgroundColor: entryClassColors.get(result.subtype),
                                                                borderColor: entryClassColors.get(result.subtype),
                                                            }
                                                            : undefined
                                                    }
                                                >
                                                    {result.subtype}
                                                </Badge>
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
                </Command>

                {/* Footer with Pagination */}
                {results && results.length > 0 && (
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        className='flex-shrink-0 py-2 px-4 border-t'
                    />
                )}

                {/* Keyboard hints */}
                <div className='px-4 py-3 border-t flex items-center gap-4 text-xs text-muted-foreground'>
                    <span className='flex items-center gap-1.5'>
                        <Kbd>Enter</Kbd>
                        <span>search</span>
                    </span>
                    <span className='flex items-center gap-1.5'>
                        <Kbd>Esc</Kbd>
                        <span>close</span>
                    </span>
                </div>
            </div>
        </div>,
        dialogRoot,
    );
}
