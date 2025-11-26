import { useModal } from '@/contexts/ui/ModalContext';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import {
    capitalizeString,
    truncateText,
} from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { parseMarkdownInline } from '@/utils/parser';
import type { NoteRetrieve, NoteRetrieveStatusEnum } from '@services/cradle/models';
import {
    DesignNib,
    InfoCircleSolid,
    Search,
    WarningCircleSolid,
    WarningTriangleSolid,
    Xmark,
} from 'iconoir-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TableCard from '../../base/Card/TableCard';
import ListView, { DateRangeFilter, SortDirection } from '../../base/ListView/ListView';
import PaginationWrapper from '../../base/Pagination/PaginationWrapper';
import PreviewTip, { PreviewTipProvider } from '../../base/Preview/PreviewTip';
import Tooltip from '../../base/Tooltip/Tooltip';
import ConfirmDeletionModal from '../../modals/base/ConfirmDeletionModal';
import ActionsTable from '../activity/ActionsTable';
import { NotePreviewContent } from './NotePreviewContent';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface Query {
    content?: string;
    author__username?: string;
    editor__username?: string;
    date?: string;
    references?: string[];
    created_date_from?: string;
    created_date_to?: string;
    updated_date_from?: string;
    updated_date_to?: string;
    timestamp_gte?: string;
    timestamp_lte?: string;
    truncate?: number;
}

interface ColumnFilters {
    [key: string]: string | DateRangeFilter | undefined;
    author: string;
    editor: string;
    createdAt: DateRangeFilter;
    lastChanged: DateRangeFilter;
}

interface ContentSearch {
    value: string;
    onChange?: (value: string) => void;
    onSubmit?: () => void;
}

interface NotesListProps {
    query: Query | null;
    filteredNotes?: NoteRetrieve[];
    noteActions?: unknown[];
    hideActionBar?: boolean;
    references?: unknown;
    onFilterChange?: ((column: string, value: string | DateRangeFilter) => void) | null;
    contentSearch?: ContentSearch | null;
}

export default function NotesList({
    query,
    filteredNotes = [],
    noteActions = [],
    hideActionBar = false,
    references = null,
    onFilterChange = null,
    contentSearch = null,
}: NotesListProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [notes, setNotes] = useState<NoteRetrieve[]>([]);
    const [alert, setAlert] = useState<Alert>({ show: false, message: '', color: 'red' });
    const [loading, setLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(Number(searchParams.get('notes_page')) || 1);
    const [sortField, setSortField] = useState(searchParams.get('notes_sort_field') || 'timestamp');
    const [sortDirection, setSortDirection] = useState<SortDirection>(searchParams.get('notes_sort_direction') as SortDirection || 'desc');
    const { navigateLink } = useCradleNavigate();
    const { setModal } = useModal();
    const { fleetingNotesApi, notesApi } = useApi();
    const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('notes_pagesize')) ||
        10
    );
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        author: query?.author__username || '',
        editor: query?.editor__username || '',
        createdAt: {
            from: query?.created_date_from || '',
            to: query?.created_date_to || ''
        },
        lastChanged: {
            from: query?.updated_date_from || '',
            to: query?.updated_date_to || ''
        },
    });
    const [searchInputValue, setSearchInputValue] = useState(contentSearch?.value || '');

    // Mapping of table columns to API field names
    const sortFieldMapping: Record<string, string> = {
        title: 'title',
        description: 'timestamp',
        author: 'author__username',
        editor: 'editor__username',
        createdAt: 'timestamp',
        lastChanged: 'edit_timestamp',
    };

    const getStatusIcon = (status?: NoteRetrieveStatusEnum) => {
        if (!status) return null;

        switch (status) {
            case 'healthy':
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500">
                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                );
            case 'processing':
                return (
                    <InfoCircleSolid className='text-blue-500' width='18' height='18' />
                );
            case 'warning':
                return (
                    <WarningTriangleSolid
                        className='text-amber-500'
                        width='18'
                        height='18'
                    />
                );
            case 'invalid':
                return (
                    <WarningCircleSolid
                        className='text-red-500'
                        width='18'
                        height='18'
                    />
                );
            default:
                return null;
        }
    };

    const handleSort = (field: string, direction: SortDirection) => {
        setSortField(field);
        setSortDirection(direction);

        setPage(1);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('notes_page', '1');
        newParams.set('notes_sort_field', field);
        newParams.set('notes_sort_direction', direction);
        setSearchParams(newParams, { replace: true });
    };

    const handleColumnFilter = (column: string, value: string | DateRangeFilter) => {
        setColumnFilters(prev => ({
            ...prev,
            [column]: value,
        }));

        if (onFilterChange) {
            onFilterChange(column, value);
        }
    };

    const filterableColumns: Record<string, (value: string | DateRangeFilter) => void> = {
        author: (value) => handleColumnFilter('author', value),
        editor: (value) => handleColumnFilter('editor', value),
        createdAt: (value) => handleColumnFilter('createdAt', value),
        lastChanged: (value) => handleColumnFilter('lastChanged', value),
    };

    useEffect(() => {
        setColumnFilters({
            author: query?.author__username || '',
            editor: query?.editor__username || '',
            createdAt: {
                from: query?.created_date_from || '',
                to: query?.created_date_to || ''
            },
            lastChanged: {
                from: query?.updated_date_from || '',
                to: query?.updated_date_to || ''
            },
        });
    }, [query?.author__username, query?.editor__username, query?.created_date_from, query?.created_date_to, query?.updated_date_from, query?.updated_date_to]);

    useEffect(() => {
        if (contentSearch?.value !== undefined) {
            setSearchInputValue(contentSearch.value);
        }
    }, [contentSearch]);

    const fetchNotes = useCallback(async () => {
        if (query == null) return;
        setLoading(true);

        try {
            const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;

            const params: Record<string, unknown> = {
                page,
                pageSize: pageSize,
                orderBy: orderBy,
                content: query.content,
                authorUsername: query.author__username,
                date: query.date,
                references: query.references,
                timestampGte: query.created_date_from || query.timestamp_gte,
                timestampLte: query.created_date_to || query.timestamp_lte,
                truncate: query.truncate,
            };

            Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

            const response = await notesApi.notesList(params as any);
            setNotes(response.results as NoteRetrieve[]);
            setTotalPages(response.totalPages || 1);
            setLoading(false);
        } catch (error) {
            setAlert({
                show: true,
                message: 'Failed to fetch notes. Please try again.',
                color: 'red',
            });
            setLoading(false);
        }
    }, [page, pageSize, sortField, sortDirection, query, notesApi]);

    useEffect(() => {
        setPage(Number(searchParams.get('notes_page')) || 1);
        fetchNotes();
    }, [fetchNotes, pageSize]);

    const handlePageChange = (newPage: number) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('notes_page', String(newPage));
        setSearchParams(newParams);

        setPage(newPage);
    };

    const actions = [
        {
            value: 'delete',
            label: 'Delete',
            handler: async (selectedIds: string[]) => {
                setModal(ConfirmDeletionModal, {
                    onConfirm: async () => {
                        try {
                            const deletePromises = selectedIds.map(id => {
                                const note = notes.find(n => n.id === id);
                                if (note && note.fleeting) {
                                    return fleetingNotesApi.fleetingNotesDestroy({ id });
                                } else {
                                    return notesApi.notesDelete({ noteId: id });
                                }
                            });
                            const results = await Promise.allSettled(deletePromises);

                            const successes = results.filter(r => r.status === 'fulfilled').length;
                            const failures = results.filter(r => r.status === 'rejected').length;

                            if (failures === 0) {
                                setAlert({
                                    show: true,
                                    color: 'green',
                                    message: `Successfully deleted ${successes} note${successes > 1 ? 's' : ''}`,
                                });
                            } else if (successes === 0) {
                                setAlert({
                                    show: true,
                                    color: 'red',
                                    message: `Failed to delete ${failures} note${failures > 1 ? 's' : ''}`,
                                });
                            } else {
                                setAlert({
                                    show: true,
                                    color: 'amber',
                                    message: `Deleted ${successes} note${successes > 1 ? 's' : ''}, ${failures} failed`,
                                });
                            }

                            setSelectedNotes([]);
                            fetchNotes();
                        } catch (error) {
                            setAlert({
                                show: true,
                                color: 'red',
                                message: 'An unexpected error occurred while deleting notes',
                            });
                        }
                    },
                    text: `Are you sure you want to delete ${selectedIds.length} note${selectedIds.length > 1 ? 's' : ''}? This action is irreversible.`,
                });
            },
        },
    ];

    const columns: Array<{ key: string; label: string; filterType?: 'text' | 'date' }> = [
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description' },
        { key: 'author', label: 'Author', filterType: 'text' as const },
        { key: 'editor', label: 'Editor', filterType: 'text' as const },
        { key: 'createdAt', label: 'Created At', filterType: 'date' as const },
        { key: 'lastChanged', label: 'Updated At', filterType: 'date' as const },
    ];

    const renderNotePreview = (note: NoteRetrieve) => {
        return <NotePreviewContent note={note} />;
    };

    const renderRow = (note: NoteRetrieve, index: number, selectProps: any = {}) => {
        for (const n of filteredNotes) {
            if (n.id === note.id) return null;
        }

        const { enableMultiSelect, isSelected, onSelect } = selectProps;

        return (
            <PreviewTip
                content={renderNotePreview(note)}
                side="top"
                align="start"
                sideOffset={32}
                size="lg"
                key={note.id}
            >
                <tr
                    className='cursor-pointer'
                    onClick={navigateLink(`/notes/${note.id}`)}
                >
                    {enableMultiSelect && (
                        <td className='w-12' onClick={(e) => e.stopPropagation()}>
                            <div className='flex items-center'>
                                <input
                                    type='checkbox'
                                    className='cradle-checkbox'
                                    checked={isSelected}
                                    onChange={onSelect}
                                />
                            </div>
                        </td>
                    )}
                    <td className={`truncate w-64`}>
                        <Tooltip content={note.metadata?.title}>
                            <div className='flex items-center gap-2'>
                                {note.fleeting ? (
                                    <Tooltip content='Fleeting Note'>
                                        <span
                                            className='inline-flex items-center align-middle flex-shrink-0'
                                        >
                                            <DesignNib className='text-[#FF8C00]' width='18' height='18' />
                                        </span>
                                    </Tooltip>
                                ) : (
                                    note.status && (
                                        <Tooltip content={note.statusMessage || capitalizeString(note.status)}>
                                            <span
                                                className='inline-flex items-center align-middle flex-shrink-0'
                                            >
                                                {getStatusIcon(note.status)}
                                            </span>
                                        </Tooltip>
                                    )
                                )}
                                <span className='truncate'>
                                    {truncateText(
                                        parseMarkdownInline(note.metadata?.title || ''),
                                        64,
                                    )}
                                </span>
                            </div>
                        </Tooltip>
                    </td>
                    <td className='truncate max-w-xs'>
                        {note.metadata?.description
                            ? parseMarkdownInline(note.metadata?.description)
                            : '-'}
                    </td>
                    <td className='truncate w-32'>
                        {truncateText(note.author?.username || '', 16)}
                    </td>
                    <td className='truncate w-32'>
                        {truncateText(note.editor?.username || '', 16)}
                    </td>
                    <td className='w-36'>
                        {note.timestamp && formatDate(new Date(note.timestamp))}
                    </td>
                    <td className='w-36'>
                        {note.editTimestamp
                            ? formatDate(new Date(note.editTimestamp))
                            : '-'}
                    </td>
                </tr>
            </PreviewTip>
        );
    };

    return (
        <PreviewTipProvider delayDuration={800}>
            <div className='flex flex-col space-y-4'>
                {!loading && (
                    <TableCard>
                        <div className='flex flex-wrap items-center justify-between gap-4'>
                            <div className='flex items-center gap-4 flex-shrink-0'>
                                {!hideActionBar && (
                                    <ActionsTable
                                        actions={actions}
                                        selectedItems={selectedNotes}
                                        itemLabel='note'
                                        disabled={notes.length === 0}
                                    />
                                )}

                                {contentSearch && (
                                    <div className='flex items-stretch gap-2 min-w-[280px]'>
                                        <div className='relative flex-1'>
                                            <input
                                                type='text'
                                                value={searchInputValue}
                                                onChange={(e) => {
                                                    setSearchInputValue(e.target.value);
                                                    if (contentSearch?.onChange) {
                                                        contentSearch.onChange(e.target.value);
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && contentSearch?.onSubmit) {
                                                        contentSearch.onSubmit();
                                                    }
                                                }}
                                                placeholder='Search content...'
                                                className='cradle-search text-sm py-2 px-3 w-full pr-8 h-full'
                                            />
                                            {searchInputValue && (
                                                <button
                                                    onClick={() => {
                                                        setSearchInputValue('');
                                                        if (contentSearch?.onChange) {
                                                            contentSearch.onChange('');
                                                        }
                                                        if (contentSearch?.onSubmit) {
                                                            contentSearch.onSubmit();
                                                        }
                                                    }}
                                                    className='absolute right-2 top-1/2 -translate-y-1/2 p-1 cradle-btn cradle-btn-secondary rounded '
                                                    title='Clear search'
                                                >
                                                    <Xmark className='w-4 h-4 cradle-text-tertiary' />
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (contentSearch?.onSubmit) {
                                                    contentSearch.onSubmit();
                                                }
                                            }}
                                            className='cradle-btn cradle-btn-secondary px-3 py-2 hover:cradle-bg-secondary rounded  flex items-center justify-center'
                                            title='Search'
                                        >
                                            <Search className='w-4 h-4' />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <PaginationWrapper
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                pageSize={pageSize}
                                onPageSizeChange={(newSize) => {
                                    setPageSize(newSize);
                                    setPage(1);
                                    const newParams = new URLSearchParams(searchParams);
                                    newParams.set('notes_page', '1');
                                    newParams.set('notes_pagesize', String(newSize));
                                    setSearchParams(newParams, { replace: true });
                                }}
                                disabled={notes.length === 0}
                            />
                        </div>
                    </TableCard>
                )}

                <ListView
                    data={notes}
                    columns={columns}
                    renderRow={renderRow}
                    loading={loading}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sortFieldMapping={sortFieldMapping}
                    emptyMessage="No notes found!"
                    tableClassName="table table-hover"
                    enableMultiSelect={true}
                    setSelected={setSelectedNotes}
                    filterableColumns={filterableColumns}
                    filterValues={columnFilters}
                />
            </div>
        </PreviewTipProvider>
    );
}
