import { toast } from 'sonner';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { DateRangeFilter } from '@components/base/ListView/types';
import DeleteNote from '@components/domain/notes/DeleteNote';
import NotesList from '@components/domain/notes/NotesList';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { FilePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface SearchFilters {
    content: string;
    author__username: string;
    editor__username: string;
    created_date_from: string;
    created_date_to: string;
    updated_date_from: string;
    updated_date_to: string;
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
    const [searchParams, setSearchParams] = useSearchParams();
    const { navigate, navigateLink } = useCradleNavigate();
    const { profile } = useProfile();
    const { fleetingNotesApi } = useApi();
    const { execute } = useAPICall();

    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        content: searchParams.get('content') || '',
        author__username: searchParams.get('author__username') || '',
        editor__username: searchParams.get('editor__username') || '',
        created_date_from: searchParams.get('created_date_from') || '',
        created_date_to: searchParams.get('created_date_to') || '',
        updated_date_from: searchParams.get('updated_date_from') || '',
        updated_date_to: searchParams.get('updated_date_to') || '',
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
        const newParams = new URLSearchParams(searchParams);
        newParams.set('content', filters.content);
        newParams.set('author__username', filters.author__username);
        newParams.set('editor__username', filters.editor__username);

        // Set or delete created_date_from/to filters
        if (filters.created_date_from) {
            newParams.set('created_date_from', filters.created_date_from);
        } else {
            newParams.delete('created_date_from');
        }
        if (filters.created_date_to) {
            newParams.set('created_date_to', filters.created_date_to);
        } else {
            newParams.delete('created_date_to');
        }

        // Set or delete updated_date_from/to filters
        if (filters.updated_date_from) {
            newParams.set('updated_date_from', filters.updated_date_from);
        } else {
            newParams.delete('updated_date_from');
        }
        if (filters.updated_date_to) {
            newParams.set('updated_date_to', filters.updated_date_to);
        } else {
            newParams.delete('updated_date_to');
        }

        setSearchParams(newParams, { replace: true });
        setSubmittedFilters(filters);
    };

    const handleCreateNewNote = async () => {
        const defaultContent =
            profile?.defaultNoteTemplate ||
            '# Untitled\n\nStart writing your note here...';
        execute(() =>
            fleetingNotesApi.fleetingNotesCreate({
                fleetingNoteRequest: {
                    content: defaultContent,
                },
            }),
        )
            .then((response) => {
                navigate(`/notes/${response.id}`);
            })
            .catch(() => {});
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
            content: searchParams.get('content') || '',
            author__username: searchParams.get('author__username') || '',
            editor__username: searchParams.get('editor__username') || '',
            created_date_from: searchParams.get('created_date_from') || '',
            created_date_to: searchParams.get('created_date_to') || '',
            updated_date_from: searchParams.get('updated_date_from') || '',
            updated_date_to: searchParams.get('updated_date_to') || '',
        };

        setSearchFilters(initialFilters);
    }, []);

    return (
        <div className='w-full h-full flex flex-col space-y-4'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>All Notes</h2>
                    <p className='text-muted-foreground'>Search & Manage Your Notes</p>
                </div>
                <div className='flex gap-2'>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={handleCreateNewNote}
                                variant='default'
                                className='space-x-1'
                            >
                                <span>New Note</span>
                                <FilePlus className='size-4' />
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
                </div>
            </div>

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
                            value: searchFilters.content,
                            onChange: (value: string) => {
                                const updatedFilters = {
                                    ...searchFilters,
                                    content: value,
                                };
                                setSearchFilters(updatedFilters);
                            },
                            onSubmit: (value?: string) => {
                                const next = {
                                    ...searchFiltersRef.current,
                                    content: value ?? searchFiltersRef.current.content,
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
