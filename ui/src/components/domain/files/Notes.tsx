import PageHeader from '@/components/base/PageHeader';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { DateRangeFilter } from '@components/base/ListView/types';
import DeleteNote from '@components/domain/notes/DeleteNote';
import NotesList from '@components/domain/notes/NotesList';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { FilePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface SearchFilters {
    any_field?: string;
    content: string;
    author__username?: string;
    editor__username?: string;
    created_date_from?: string;
    created_date_to?: string;
    updated_date_from?: string;
    updated_date_to?: string;
}

/**
 * Notes component
 * Allows the user to search through all notes they have access to
 * Provides content search and table header filters for author/editor/dates
 * Fetches notes based on the provided search filters
 *
 * @function Notes
 * @returns {Notes}
 * @constructor
 */
export default function Notes() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/notes' });
    // navigate and navigateLink removed - use router.navigate() or Link component directly
    const { notesApi } = useApi();
    const [isCreatingNote, setIsCreatingNote] = useState(false);

    const createNoteMutation = useMutation({
        mutationFn: async () => {
            return await notesApi.notesCreate({
                fleetingNoteRequest: {
                    content: '',
                },
            });
        },
        meta: {
            errorMessage: 'Failed to create note',
        },
        onSuccess: (response) => {
            router.navigate({ to: `/notes/${response.id}` });
        },
    });

    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        any_field: ('any_field' in search ? search.any_field as string : undefined) || '',
        content: ('content' in search ? search.content as string : undefined) || '',
        author__username:
            ('author__username' in search ? search.author__username as string : undefined) || '',
        editor__username:
            ('editor__username' in search ? search.editor__username as string : undefined) || '',
        created_date_from:
            ('created_date_from' in search ? search.created_date_from as string : undefined) ||
            '',
        created_date_to:
            ('created_date_to' in search ? search.created_date_to as string : undefined) || '',
        updated_date_from:
            ('updated_date_from' in search ? search.updated_date_from as string : undefined) ||
            '',
        updated_date_to:
            ('updated_date_to' in search ? search.updated_date_to as string : undefined) || '',
    });
    const searchFiltersRef = useRef(searchFilters);
    useEffect(() => {
        searchFiltersRef.current = searchFilters;
    }, [searchFilters]);

    const [submittedFilters, setSubmittedFilters] = useState<SearchFilters | null>(
        null,
    );
    const [notesCount, setNotesCount] = useState({ current: 0, total: 0 });

    const updateSearchParams = (filters: SearchFilters) => {
        const newSearch: any = {
            ...search,
            any_field: filters.any_field || undefined,
            content: filters.content || undefined,
            author__username: filters.author__username || undefined,
            editor__username: filters.editor__username || undefined,
            created_date_from: filters.created_date_from || undefined,
            created_date_to: filters.created_date_to || undefined,
            updated_date_from: filters.updated_date_from || undefined,
            updated_date_to: filters.updated_date_to || undefined,
        };

        // Remove undefined values
        Object.keys(newSearch).forEach((key) => {
            if (newSearch[key] === undefined) {
                delete newSearch[key];
            }
        });

        router.navigate({
            to: location.pathname as any,
            search: newSearch,
            replace: true,
        });
        setSubmittedFilters(filters);
    };

    const handleCreateNewNote = () => {
        setIsCreatingNote(true);
        createNoteMutation.mutate(undefined, {
            onSettled: () => {
                setIsCreatingNote(false);
            },
        });
    };

    // Auto-update search when filters change
    useEffect(() => {
        updateSearchParams(searchFilters);
    }, []);

    const handleColumnFilterChange = (
        column: string,
        value: string | DateRangeFilter,
    ) => {
        let updatedFilters = { ...searchFilters };

        // Handle date range columns differently
        if (column === 'createdAt' && typeof value === 'object') {
            updatedFilters.created_date_from = value.from || '';
            updatedFilters.created_date_to = value.to || '';
        } else if (column === 'lastChanged' && typeof value === 'object') {
            updatedFilters.updated_date_from = value.from || '';
            updatedFilters.updated_date_to = value.to || '';
        } else if (typeof value === 'string') {
            // Map column names to filter field names for text filters
            const filterFieldMap: Record<string, keyof SearchFilters> = {
                author: 'author__username',
                editor: 'editor__username',
            };

            const fieldName = filterFieldMap[column];
            if (fieldName) {
                updatedFilters[fieldName] = value;
            }
        }

        setSearchFilters(updatedFilters);

        // Auto-submit the filter after a short delay
        setTimeout(() => {
            updateSearchParams(updatedFilters);
        }, 500);
    };

    useEffect(() => {
        const initialFilters: SearchFilters = {
            any_field: ('any_field' in search ? search.any_field as string : undefined) || '',
            content: ('content' in search ? search.content as string : undefined) || '',
            author__username:
                ('author__username' in search ? search.author__username as string : undefined) ||
                '',
            editor__username:
                ('editor__username' in search ? search.editor__username as string : undefined) ||
                '',
            created_date_from:
                ('created_date_from' in search
                    ? search.created_date_from as string
                    : undefined) || '',
            created_date_to:
                ('created_date_to' in search ? search.created_date_to as string : undefined) ||
                '',
            updated_date_from:
                ('updated_date_from' in search
                    ? search.updated_date_from as string
                    : undefined) || '',
            updated_date_to:
                ('updated_date_to' in search ? search.updated_date_to as string : undefined) ||
                '',
        };

        setSearchFilters(initialFilters);
    }, [search]);

    return (
        <div className='w-full h-full flex flex-col space-y-4'>
            <PageHeader
                title='All Notes'
                description='Search & Manage Your Notes'
                actions={
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={handleCreateNewNote}
                                variant='default'
                                disabled={isCreatingNote}
                            >
                                {isCreatingNote ? (
                                    <>
                                        <Spinner />
                                        New Note
                                    </>
                                ) : (
                                    <>
                                        <FilePlus />
                                        New Note
                                    </>
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Create new note{' '}
                            <KbdGroup>
                                <Kbd>Ctrl</Kbd>
                                <span>+</span>
                                <Kbd>N</Kbd>
                            </KbdGroup>
                        </TooltipContent>
                    </Tooltip>
                }
            />

            {/* Results Section */}
            <div className='px-4'>
                {submittedFilters && (
                    <NotesList
                        query={submittedFilters}
                        noteActions={[{ Component: DeleteNote, props: {} }]}
                        onFilterChange={handleColumnFilterChange}
                        onCreateNote={handleCreateNewNote}
                        onTotalCountChange={setNotesCount}
                        contentSearch={{
                            value: searchFilters.any_field || '',
                            onChange: (value: string) => {
                                const updatedFilters = {
                                    ...searchFilters,
                                    any_field: value,
                                };
                                setSearchFilters(updatedFilters);
                            },
                            onSubmit: (value?: string) => {
                                const next = {
                                    ...searchFiltersRef.current,
                                    any_field: value ?? searchFiltersRef.current.any_field,
                                };
                                updateSearchParams(next);
                            },
                        }}
                    />
                )}
            </div>
        </div>
    );
}
