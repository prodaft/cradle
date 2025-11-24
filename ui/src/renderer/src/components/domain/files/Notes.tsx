import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNotif } from '@/contexts/ui/NotificationContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import DeleteNote from '@components/domain/notes/DeleteNote';
import NotesList from '@components/domain/notes/NotesList';

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
    const { notify } = useNotif();
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

    const [submittedFilters, setSubmittedFilters] = useState<SearchFilters | null>(null);

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
        const defaultContent = profile?.defaultNoteTemplate || '# Untitled\n\nStart writing your note here...';
        execute(() => fleetingNotesApi.fleetingNotesCreate({
            fleetingNoteRequest: {
                content: defaultContent,
                files: []
            }
        }))
            .then((response) => {
                navigate(`/notes/${response.id}`);
            })
            .catch(() => {});
    };

    // Auto-update search when filters change
    useEffect(() => {
        updateSearchParams(searchFilters);
    }, []);

    const handleColumnFilterChange = (column: string, value: string | { from: string; to: string }) => {
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
            {/* Header Section - Minimal Design */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        All Notes
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                        Search & Manage Your Notes
                    </p>
                </div>
                <button
                    className='cradle-btn cradle-btn-primary flex items-center justify-center w-10 h-10 text-white text-xl font-bold'
                    onClick={handleCreateNewNote}
                >
                    +
                </button>
            </div>

            {/* Results Section */}
            <div className='px-4'>
                {submittedFilters && (
                    <NotesList
                        query={submittedFilters}
                        noteActions={[
                            { Component: DeleteNote, props: {} },
                        ]}
                        onFilterChange={handleColumnFilterChange}
                        contentSearch={{
                            value: searchFilters.content,
                            onChange: (value: string) => {
                                const updatedFilters = { ...searchFilters, content: value };
                                setSearchFilters(updatedFilters);
                            },
                            onSubmit: () => {
                                updateSearchParams(searchFilters);
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
}
