import PageHeader from '@/components/base/page-header';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryKeys } from '@/hooks/query/query-keys';
import type { SearchState } from '@/lib/search-query/search-schema';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { FilePlus } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import DeleteNote from './delete-note';
import { searchStateFromUrl, urlFromSearchState } from './notes-list-search-schema';
import NotesTable, { type NotesTableQueryInput } from './notes-table';

export interface NotesListProps {
    /** Hide title/description/actions (e.g. dashboard entry tabs). */
    hidePageHeader?: boolean;
    /** Scope list to notes linked to this entry (dashboard). */
    linkedToEntryId?: number;
    /** Scope list to notes holding this file or a copy of it (file dashboard). */
    fileId?: string;
}

/**
 * Notes list route: search, filters, and table of notes (full-page or dashboard tab).
 */
export default function NotesList({
    hidePageHeader = false,
    linkedToEntryId,
    fileId,
}: NotesListProps = {}) {
    useDockPanelTab({ title: 'Notes', icon: 'notes' }, !hidePageHeader);
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false }) as Record<string, unknown>;
    const pathname = location.pathname;

    const hideFleetingNotes = linkedToEntryId != null;
    const searchState = useMemo(
        () => searchStateFromUrl(search, !hideFleetingNotes),
        [search, hideFleetingNotes],
    );

    const createNote = useMutation({
        mutationFn: async () => {
            const { data, error, response } = await fetchClient.POST('/notes/', {
                body: { content: '' },
            });
            if (error) throw { response, error };
            return data;
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.notes.apiList() }],
        },
        onSuccess: (response) => {
            router.navigate({ to: `/notes/${response.id}` });
        },
    });

    const scope = useMemo((): NotesTableQueryInput => {
        const {
            notes_sort_field: _sortField,
            notes_sort_direction: _sortDirection,
            notes_search,
            ...filters
        } = urlFromSearchState(searchState);
        return {
            ...filters,
            search: notes_search,
            ...(linkedToEntryId != null
                ? {
                      linked_to: linkedToEntryId,
                      linked_to_exact_match: true as const,
                  }
                : {}),
            ...(fileId != null ? { file: fileId } : {}),
        };
    }, [searchState, linkedToEntryId, fileId]);

    const applySearch = useCallback(
        (state: SearchState) => {
            router.navigate({
                to: pathname as any,
                search: ((prev: Record<string, unknown>) => ({
                    ...prev,
                    ...urlFromSearchState(state),
                    notes_page: 1,
                })) as any,
                replace: true,
            });
        },
        [router, pathname],
    );

    const isCreating = createNote.isPending;

    return (
        <div className='w-full h-full flex flex-col space-y-4'>
            {!hidePageHeader && (
                <PageHeader
                    title='All Notes'
                    description='Search & Manage Your Notes'
                    actions={
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        onClick={() => createNote.mutate()}
                                        variant='default'
                                        disabled={isCreating}
                                    />
                                }
                            >
                                {isCreating ? (
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
            )}

            <div className={hidePageHeader ? undefined : 'px-4'}>
                <NotesTable
                    scope={scope}
                    noteActions={[{ Component: DeleteNote, props: {} }]}
                    onCreateNote={hidePageHeader ? null : () => createNote.mutate()}
                    hideFleetingNotes={hideFleetingNotes}
                    search={{ value: searchState, onApply: applySearch }}
                />
            </div>
        </div>
    );
}
