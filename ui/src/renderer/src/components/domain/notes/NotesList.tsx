import { useModal } from '@/contexts/ui/ModalContext';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { capitalizeString, truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { parseMarkdownInline } from '@/utils/parser';
import type { NoteRetrieve, NoteRetrieveStatusEnum } from '@services/cradle/models';
import {
    Copy,
    DesignNib,
    Download,
    InfoCircleSolid,
    PlusCircle,
    Refresh,
    Search,
    Trash,
    WarningCircleSolid,
    WarningTriangleSolid,
    Xmark,
} from 'iconoir-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TableCard from '../../base/Card/TableCard';
import ListView, { DateRangeFilter, SortDirection } from '../../base/ListView/ListView';
import PaginationWrapper from '../../base/Pagination/PaginationWrapper';
import PreviewTip, { PreviewTipProvider } from '../../base/Preview/PreviewTip';
import Tooltip from '../../base/Tooltip/Tooltip';
import ConfirmDeletionModal from '../../modals/base/ConfirmDeletionModal';
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
    onCreateNote?: (() => void) | null;
    onTotalCountChange?: ((count: { current: number; total: number }) => void) | null;
}

export default function NotesList({
    query,
    filteredNotes = [],
    noteActions = [],
    hideActionBar = false,
    references = null,
    onFilterChange = null,
    contentSearch = null,
    onCreateNote = null,
    onTotalCountChange = null,
}: NotesListProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [notes, setNotes] = useState<NoteRetrieve[]>([]);
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const [loading, setLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(Number(searchParams.get('notes_page')) || 1);
    const [sortField, setSortField] = useState(
        searchParams.get('notes_sort_field') || 'timestamp',
    );
    const [sortDirection, setSortDirection] = useState<SortDirection>(
        (searchParams.get('notes_sort_direction') as SortDirection) || 'desc',
    );
    const { navigateLink } = useCradleNavigate();
    const { setModal } = useModal();
    const { fleetingNotesApi, notesApi } = useApi();
    const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('notes_pagesize')) || 10,
    );
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        author: query?.author__username || '',
        editor: query?.editor__username || '',
        createdAt: {
            from: query?.created_date_from || '',
            to: query?.created_date_to || '',
        },
        lastChanged: {
            from: query?.updated_date_from || '',
            to: query?.updated_date_to || '',
        },
    });
    const [searchInputValue, setSearchInputValue] = useState(
        contentSearch?.value || '',
    );
    const [isSearchExpanded, setIsSearchExpanded] = useState(
        !!contentSearch?.value,
    );
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [totalCount, setTotalCount] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

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
                    <svg
                        width='18'
                        height='18'
                        viewBox='0 0 24 24'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                        className='text-green-500'
                    >
                        <path
                            d='M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        />
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
        setColumnFilters((prev) => ({
            ...prev,
            [column]: value,
        }));

        if (onFilterChange) {
            onFilterChange(column, value);
        }
    };

    const filterableColumns: Record<string, (value: string | DateRangeFilter) => void> =
    {
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
                to: query?.created_date_to || '',
            },
            lastChanged: {
                from: query?.updated_date_from || '',
                to: query?.updated_date_to || '',
            },
        });
    }, [
        query?.author__username,
        query?.editor__username,
        query?.created_date_from,
        query?.created_date_to,
        query?.updated_date_from,
        query?.updated_date_to,
    ]);

    useEffect(() => {
        if (contentSearch?.value !== undefined) {
            setSearchInputValue(contentSearch.value);
            setIsSearchExpanded(!!contentSearch.value);
        }
    }, [contentSearch]);

    useEffect(() => {
        if (isSearchExpanded && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchExpanded]);

    // Notes to display (same as fetched notes since filters were removed)
    const displayedNotes = notes;

    // Notify parent of count changes
    useEffect(() => {
        if (onTotalCountChange) {
            onTotalCountChange({
                current: notes.length,
                total: totalCount,
            });
        }
    }, [notes.length, totalCount, onTotalCountChange]);

    // Select all visible notes
    const handleSelectAll = () => {
        if (selectedNotes.length === displayedNotes.length) {
            setSelectedNotes([]);
        } else {
            setSelectedNotes(displayedNotes.map((n) => n.id!));
        }
    };

    // Duplicate selected note
    const handleDuplicate = async () => {
        if (selectedNotes.length !== 1) return;
        const note = notes.find((n) => n.id === selectedNotes[0]);
        if (!note) return;
        
        try {
            const newNote = await fleetingNotesApi.fleetingNotesCreate({
                fleetingNoteRequest: {
                    content: note.content || '',
                    files: [],
                },
            });
            fetchNotes();
            setAlert({
                show: true,
                color: 'green',
                message: 'Note duplicated successfully',
            });
        } catch {
            setAlert({
                show: true,
                color: 'red',
                message: 'Failed to duplicate note',
            });
        }
    };

    // Export selected notes as markdown
    const handleExport = () => {
        const notesToExport = notes.filter((n) => selectedNotes.includes(n.id!));
        if (notesToExport.length === 0) return;
        
        notesToExport.forEach((note) => {
            const content = note.content || `# ${note.metadata?.title || 'Untitled'}\n\n${note.metadata?.description || ''}`;
            const blob = new Blob([content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${note.metadata?.title || note.id || 'note'}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle if focus is in this component
            if (!containerRef.current?.contains(document.activeElement) && 
                document.activeElement !== document.body) return;
            
            // Ctrl+A / Cmd+A - Select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !hideActionBar) {
                e.preventDefault();
                handleSelectAll();
            }
            
            // Delete key - Delete selected
            if (e.key === 'Delete' && selectedNotes.length > 0 && !hideActionBar) {
                e.preventDefault();
                actions[0].handler(selectedNotes);
            }
            
            // Ctrl+D / Cmd+D - Duplicate
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedNotes.length === 1) {
                e.preventDefault();
                handleDuplicate();
            }
            
            // Ctrl+E / Cmd+E - Export
            if ((e.ctrlKey || e.metaKey) && e.key === 'e' && selectedNotes.length > 0) {
                e.preventDefault();
                handleExport();
            }
            
            // Ctrl+F / Cmd+F - Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f' && contentSearch) {
                e.preventDefault();
                setIsSearchExpanded(true);
            }
            
            // R - Refresh
            if (e.key === 'r' && !e.ctrlKey && !e.metaKey && 
                document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                fetchNotes();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNotes, displayedNotes, hideActionBar, contentSearch]);

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

            Object.keys(params).forEach(
                (key) => params[key] === undefined && delete params[key],
            );

            const response = await notesApi.notesList(params as any);
            setNotes(response.results as NoteRetrieve[]);
            setTotalPages(response.totalPages || 1);
            setTotalCount(response.count || 0);
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
                            const deletePromises = selectedIds.map((id) => {
                                const note = notes.find((n) => n.id === id);
                                if (note && note.fleeting) {
                                    return fleetingNotesApi.fleetingNotesDestroy({
                                        id,
                                    });
                                } else {
                                    return notesApi.notesDelete({ noteId: id });
                                }
                            });
                            const results = await Promise.allSettled(deletePromises);

                            const successes = results.filter(
                                (r) => r.status === 'fulfilled',
                            ).length;
                            const failures = results.filter(
                                (r) => r.status === 'rejected',
                            ).length;

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
                                message:
                                    'An unexpected error occurred while deleting notes',
                            });
                        }
                    },
                    text: `Are you sure you want to delete ${selectedIds.length} note${selectedIds.length > 1 ? 's' : ''}? This action is irreversible.`,
                });
            },
        },
    ];

    const columns: Array<{ key: string; label: string; filterType?: 'text' | 'date' }> =
        [
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
                side='top'
                align='start'
                sideOffset={32}
                size='lg'
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
                                        <span className='inline-flex items-center align-middle flex-shrink-0'>
                                            <DesignNib
                                                className='text-[#FF8C00]'
                                                width='18'
                                                height='18'
                                            />
                                        </span>
                                    </Tooltip>
                                ) : (
                                    note.status && (
                                        <Tooltip
                                            content={
                                                note.statusMessage ||
                                                capitalizeString(note.status)
                                            }
                                        >
                                            <span className='inline-flex items-center align-middle flex-shrink-0'>
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
            <div ref={containerRef} className='flex flex-col space-y-4'>
                {!loading && (
                    <TableCard>
                        <div className='flex flex-wrap items-center justify-between gap-4'>
                            <div className='flex items-center gap-2 flex-shrink-0'>
                                {/* Create Note */}
                                {onCreateNote && (
                                    <Tooltip content='Create new note (Ctrl+N)'>
                                        <button
                                            className='flex items-center justify-center w-10 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors'
                                            onClick={onCreateNote}
                                        >
                                            <PlusCircle 
                                                className='text-[#FF8C00]'
                                                width={18} 
                                                height={18} 
                                            />
                                        </button>
                                    </Tooltip>
                                )}

                                {!hideActionBar && (
                                    <>
                                        <div className='h-8 w-px bg-cradle-border-accent' />

                                        {/* Delete */}
                                        <Tooltip content={selectedNotes.length > 0 ? `Delete ${selectedNotes.length} note${selectedNotes.length > 1 ? 's' : ''} (Del)` : 'Select notes to delete'}>
                                            <button
                                                className='flex items-center gap-2 px-3 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                                onClick={() => {
                                                    if (selectedNotes.length > 0) {
                                                        actions[0].handler(selectedNotes);
                                                    }
                                                }}
                                                disabled={selectedNotes.length === 0 || notes.length === 0}
                                            >
                                                <Trash 
                                                    className='text-cradle-text-secondary'
                                                    width={18} 
                                                    height={18} 
                                                />
                                                {selectedNotes.length > 0 && (
                                                    <span className='text-sm text-cradle-text-secondary font-mono'>
                                                        {selectedNotes.length}
                                                    </span>
                                                )}
                                            </button>
                                        </Tooltip>

                                        {/* Duplicate */}
                                        <Tooltip content='Duplicate selected note (Ctrl+D)'>
                                            <button
                                                className='flex items-center justify-center w-10 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                                onClick={handleDuplicate}
                                                disabled={selectedNotes.length !== 1}
                                            >
                                                <Copy 
                                                    className='text-cradle-text-secondary'
                                                    width={18} 
                                                    height={18} 
                                                />
                                            </button>
                                        </Tooltip>

                                        {/* Export */}
                                        <Tooltip content={`Export ${selectedNotes.length} note${selectedNotes.length !== 1 ? 's' : ''} as markdown (Ctrl+E)`}>
                                            <button
                                                className='flex items-center justify-center w-10 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                                onClick={handleExport}
                                                disabled={selectedNotes.length === 0}
                                            >
                                                <Download 
                                                    className='text-cradle-text-secondary'
                                                    width={18} 
                                                    height={18} 
                                                />
                                            </button>
                                        </Tooltip>

                                        <div className='h-8 w-px bg-cradle-border-accent' />
                                    </>
                                )}

                                {contentSearch && (
                                    <>
                                        {!isSearchExpanded ? (
                                            <button
                                                onClick={() => setIsSearchExpanded(true)}
                                                className='flex items-center justify-center w-10 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary'
                                                title='Search'
                                            >
                                                <Search className='w-4 h-4' />
                                            </button>
                                        ) : (
                                    <div className='flex items-center gap-2 min-w-[280px] bg-cradle-bg-elevated border border-cradle-border-accent h-10 px-2 rounded-md'>
                                        <button
                                            onClick={() => {
                                                if (contentSearch?.onSubmit) {
                                                    contentSearch.onSubmit();
                                                }
                                            }}
                                            className='p-1 flex-shrink-0 transition-colors text-cradle-text-muted hover:text-cradle-text-primary'
                                            title='Search'
                                        >
                                            <Search className='w-4 h-4' />
                                        </button>
                                            <input
                                                    ref={searchInputRef}
                                                type='text'
                                                value={searchInputValue}
                                                onChange={(e) => {
                                                    setSearchInputValue(e.target.value);
                                                    if (contentSearch?.onChange) {
                                                    contentSearch.onChange(e.target.value);
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === 'Enter' &&
                                                        contentSearch?.onSubmit
                                                    ) {
                                                        contentSearch.onSubmit();
                                                    }
                                                        if (e.key === 'Escape') {
                                                            if (!searchInputValue) {
                                                                setIsSearchExpanded(false);
                                                            }
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        if (!searchInputValue) {
                                                            setIsSearchExpanded(false);
                                                        }
                                                }}
                                                placeholder='Search content...'
                                            className='flex-grow bg-transparent text-sm outline-none text-cradle-text-primary placeholder:text-cradle-text-muted rounded-none font-mono'
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
                                                className='p-1 flex-shrink-0 text-cradle-text-muted hover:text-cradle-text-primary transition-colors'
                                                    title='Clear search'
                                                >
                                                <Xmark className='w-4 h-4' />
                                                </button>
                                            )}
                                    </div>
                                )}
                                    </>
                                )}
                            </div>

                            {/* Right side controls */}
                            <div className='flex items-center gap-2'>

                                {/* View mode toggle */}
                                <Tooltip content={viewMode === 'table' ? 'Switch to card view' : 'Switch to table view'}>
                                    <button
                                        className='flex items-center justify-center w-8 h-8 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary font-mono text-xs'
                                        onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                                    >
                                        {viewMode === 'table' ? (
                                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                                <rect x="14" y="14" width="7" height="7" rx="1" />
                                            </svg>
                                        ) : (
                                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="3" y1="6" x2="21" y2="6" />
                                                <line x1="3" y1="12" x2="21" y2="12" />
                                                <line x1="3" y1="18" x2="21" y2="18" />
                                            </svg>
                                        )}
                                    </button>
                                </Tooltip>

                                {/* Refresh */}
                                <Tooltip content='Refresh (R)'>
                                    <button
                                        className='flex items-center justify-center w-8 h-8 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary'
                                        onClick={() => fetchNotes()}
                                    >
                                        <Refresh width={16} height={16} />
                                    </button>
                                </Tooltip>

                                <div className='h-8 w-px bg-cradle-border-accent' />

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
                        </div>
                    </TableCard>
                )}

                {viewMode === 'table' ? (
                <ListView
                        data={displayedNotes}
                    columns={columns}
                    renderRow={renderRow}
                    loading={loading}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sortFieldMapping={sortFieldMapping}
                    emptyMessage='No notes found!'
                    tableClassName='table table-hover'
                    enableMultiSelect={true}
                    setSelected={setSelectedNotes}
                    filterableColumns={filterableColumns}
                    filterValues={columnFilters}
                />
                ) : (
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4'>
                        {loading ? (
                            <div className='col-span-full text-center text-cradle-text-muted py-8'>
                                Loading...
                            </div>
                        ) : displayedNotes.length === 0 ? (
                            <div className='col-span-full text-center text-cradle-text-muted py-8'>
                                No notes found!
                            </div>
                        ) : (
                            displayedNotes.map((note) => (
                                <div
                                    key={note.id}
                                    className={`p-4 border cursor-pointer transition-all hover:border-cradle-accent-primary ${
                                        selectedNotes.includes(note.id!) 
                                            ? 'border-cradle-accent-primary bg-cradle-accent-primary/10' 
                                            : 'border-cradle-border-accent'
                                    }`}
                                    onClick={(e) => {
                                        if (e.ctrlKey || e.metaKey) {
                                            // Toggle selection
                                            setSelectedNotes((prev) =>
                                                prev.includes(note.id!)
                                                    ? prev.filter((id) => id !== note.id)
                                                    : [...prev, note.id!]
                                            );
                                        } else {
                                            navigateLink(`/notes/${note.id}`)(e);
                                        }
                                    }}
                                >
                                    <div className='flex items-start justify-between gap-2 mb-2'>
                                        <div className='flex items-center gap-2'>
                                            {note.fleeting ? (
                                                <DesignNib className='text-[#FF8C00] flex-shrink-0' width={16} height={16} />
                                            ) : note.status && (
                                                <span className='flex-shrink-0'>{getStatusIcon(note.status)}</span>
                                            )}
                                            <h3 className='font-medium text-cradle-text-primary truncate'>
                                                {parseMarkdownInline(note.metadata?.title || 'Untitled')}
                                            </h3>
                                        </div>
                                        <input
                                            type='checkbox'
                                            className='cradle-checkbox flex-shrink-0'
                                            checked={selectedNotes.includes(note.id!)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                setSelectedNotes((prev) =>
                                                    prev.includes(note.id!)
                                                        ? prev.filter((id) => id !== note.id)
                                                        : [...prev, note.id!]
                                                );
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    <p className='text-sm text-cradle-text-secondary line-clamp-2 mb-3'>
                                        {note.metadata?.description || 'No description'}
                                    </p>
                                    <div className='flex items-center justify-between text-xs text-cradle-text-muted font-mono'>
                                        <span>{note.author?.username}</span>
                                        <span>{note.timestamp && formatDate(new Date(note.timestamp))}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </PreviewTipProvider>
    );
}
