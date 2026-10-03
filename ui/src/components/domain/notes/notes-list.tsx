import PageHeader from '@/components/base/page-header';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryKeys } from '@/hooks/query/query-keys';
import { DateRangeFilter } from '@/types/list-view';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { FilePlus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DeleteNote from './delete-note';
import type { StatusSlug } from './note-list-status';
import NotesTable, { type NotesTableQueryInput } from './notes-table';

/** `/notes` route and dashboard notes tab: header + URL state + `NotesTable`. */
interface Draft {
    any_field?: string;
    content: string;
    author__username?: string;
    editor__username?: string;
    created_date_from?: string;
    created_date_to?: string;
    updated_date_from?: string;
    updated_date_to?: string;
}

function draftFromSearch(search: Record<string, unknown>): Draft {
    const get = (key: keyof Draft) =>
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

export interface NotesListProps {
    /** Hide title/description/actions (e.g. dashboard entry tabs). */
    hidePageHeader?: boolean;
    /** Scope list to notes linked to this entry (dashboard). */
    linkedToEntryId?: number;
}

/**
 * Notes list route: search, filters, and table of notes (full-page or dashboard tab).
 */
export default function NotesList({
    hidePageHeader = false,
    linkedToEntryId,
}: NotesListProps = {}) {
    useDockPanelTab({ title: 'Notes', icon: 'notes' }, !hidePageHeader);
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false }) as Record<string, unknown>;
    const pathname = location.pathname;

    const applied = useMemo(() => draftFromSearch(search), [search]);

    const [draft, setDraft] = useState<Draft>(() => ({
        ...applied,
    }));

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
        const statuses =
            Array.isArray(search.status) && search.status.length > 0
                ? (search.status as StatusSlug[])
                : undefined;

        return {
            ...applied,
            ...(statuses ? { status: statuses } : {}),
            ...(linkedToEntryId != null
                ? {
                      linked_to: linkedToEntryId,
                      linked_to_exact_match: true as const,
                  }
                : {}),
        };
    }, [applied, search.status, linkedToEntryId]);

    const applyFilters = useCallback(
        (filters: Partial<Draft>) => {
            router.navigate({
                to: pathname as any,
                search: ((prev: Record<string, unknown>) => {
                    const next: Record<string, unknown> = { ...prev };
                    (Object.keys(filters) as (keyof Draft)[]).forEach((key) => {
                        const value = filters[key];
                        if (value) {
                            next[key as string] = value;
                        } else {
                            delete next[key as string];
                        }
                    });
                    next.notes_page = 1;
                    return next;
                }) as any,
                replace: true,
            });
        },
        [router, pathname],
    );

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const pendingFiltersRef = useRef<Partial<Draft>>({});

    const updateColumnFilter = (column: string, value: string | DateRangeFilter) => {
        const changes: Partial<Draft> = {};

        if (column === 'timestamp' && typeof value === 'object') {
            changes.created_date_from = value.from || '';
            changes.created_date_to = value.to || '';
        } else if (column === 'edit_timestamp' && typeof value === 'object') {
            changes.updated_date_from = value.from || '';
            changes.updated_date_to = value.to || '';
        } else if (typeof value === 'string') {
            if (column === 'author') {
                changes.author__username = value;
            } else if (column === 'editor') {
                changes.editor__username = value;
            }
        }

        setDraft((prev) => ({ ...prev, ...changes }));
        pendingFiltersRef.current = { ...pendingFiltersRef.current, ...changes };
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            const pending = pendingFiltersRef.current;
            pendingFiltersRef.current = {};
            applyFilters(pending);
        }, 500);
    };

    useEffect(() => {
        setDraft({ ...applied });
    }, [applied]);

    const isCreating = createNote.isPending;

    return (
        <div className='w-full h-full flex flex-col space-y-4'>
            {!hidePageHeader && (
                <PageHeader
                    title='All Notes'
                    description='Search & Manage Your Notes'
                    actions={
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => createNote.mutate()}
                                    variant='default'
                                    disabled={isCreating}
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
            )}

            <div className={hidePageHeader ? undefined : 'px-4'}>
                <NotesTable
                    scope={scope}
                    noteActions={[{ Component: DeleteNote, props: {} }]}
                    onFilterChange={updateColumnFilter}
                    onCreateNote={hidePageHeader ? null : () => createNote.mutate()}
                    hideFleetingNotes={linkedToEntryId != null}
                    contentSearch={{
                        value: draft.any_field || '',
                        onChange: (value: string) => {
                            setDraft((prev) => ({
                                ...prev,
                                any_field: value,
                            }));
                        },
                        onSubmit: (value?: string) => {
                            if (timeoutRef.current) clearTimeout(timeoutRef.current);
                            const pending = pendingFiltersRef.current;
                            pendingFiltersRef.current = {};
                            applyFilters({
                                ...draft,
                                ...pending,
                                any_field: value ?? draft.any_field,
                            });
                        },
                    }}
                />
            </div>
        </div>
    );
}
