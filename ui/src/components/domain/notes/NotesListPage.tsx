import PageHeader from '@/components/base/PageHeader';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/use-api';
import { DateRangeFilter } from '@components/base/ListView/types';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { FilePlus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import DeleteNote from './DeleteNote';
import NotesList from './NotesList';

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

function filtersFromSearch(search: Record<string, unknown>): SearchFilters {
    const get = (key: keyof SearchFilters) =>
        typeof search[key as string] === 'string'
            ? (search[key as string] as string)
            : '';

    return {
        any_field: get('any_field'),
        content: get('content'),
        author__username: get('author__username'),
        editor__username: get('editor__username'),
        created_date_from: get('created_date_from'),
        created_date_to: get('created_date_to'),
        updated_date_from: get('updated_date_from'),
        updated_date_to: get('updated_date_to'),
    };
}

/**
 * Notes list page: search, filters, and table of all notes the user can access.
 */
export default function NotesListPage() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false }) as Record<string, unknown>;
    const { notesApi } = useApi();
    const pathname = location.pathname;

    const createNoteMutation = useMutation({
        mutationFn: async () => {
            return notesApi.notesCreate({
                fleetingNoteRequest: {
                    content: '',
                },
            });
        },
        onSuccess: (response) => {
            router.navigate({ to: `/notes/${response.id}` });
        },
    });

    const [searchFilters, setSearchFilters] = useState<SearchFilters>(() =>
        filtersFromSearch(search),
    );
    const [submittedFilters, setSubmittedFilters] = useState<SearchFilters>(() =>
        filtersFromSearch(search),
    );

    const updateSearchParams = useCallback(
        (filters: SearchFilters) => {
            const nextSearch: Record<string, unknown> = { ...search };
            (Object.keys(filters) as (keyof SearchFilters)[]).forEach((key) => {
                const value = filters[key];
                if (value) {
                    nextSearch[key as string] = value;
                } else {
                    delete nextSearch[key as string];
                }
            });

            router.navigate({
                to: pathname as any,
                search: nextSearch as any,
                replace: true,
            });
            setSubmittedFilters(filters);
        },
        [router, pathname, search],
    );

    const handleCreateNewNote = () => {
        createNoteMutation.mutate();
    };

    const columnFilterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        return () => {
            if (columnFilterTimeoutRef.current) {
                clearTimeout(columnFilterTimeoutRef.current);
            }
        };
    }, []);

    const handleColumnFilterChange = (
        column: string,
        value: string | DateRangeFilter,
    ) => {
        const updatedFilters = { ...searchFilters };

        if (column === 'createdAt' && typeof value === 'object') {
            updatedFilters.created_date_from = value.from || '';
            updatedFilters.created_date_to = value.to || '';
        } else if (column === 'lastChanged' && typeof value === 'object') {
            updatedFilters.updated_date_from = value.from || '';
            updatedFilters.updated_date_to = value.to || '';
        } else if (typeof value === 'string') {
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
        if (columnFilterTimeoutRef.current) {
            clearTimeout(columnFilterTimeoutRef.current);
        }
        columnFilterTimeoutRef.current = setTimeout(() => {
            updateSearchParams(updatedFilters);
        }, 500);
    };

    useEffect(() => {
        const initialFilters = filtersFromSearch(search);
        setSearchFilters(initialFilters);
        setSubmittedFilters(initialFilters);
    }, [search]);

    const isCreatingNote = createNoteMutation.isPending;

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

            <div className='px-4'>
                <NotesList
                    query={submittedFilters}
                    noteActions={[{ Component: DeleteNote, props: {} }]}
                    onFilterChange={handleColumnFilterChange}
                    onCreateNote={handleCreateNewNote}
                    contentSearch={{
                        value: searchFilters.any_field || '',
                        onChange: (value: string) => {
                            setSearchFilters((prev) => ({
                                ...prev,
                                any_field: value,
                            }));
                        },
                        onSubmit: (value?: string) => {
                            updateSearchParams({
                                ...searchFilters,
                                any_field: value ?? searchFilters.any_field,
                            });
                        },
                    }}
                />
            </div>
        </div>
    );
}
