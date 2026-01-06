import { useModal } from '@/contexts/ui/ModalContext';
import { useNotif } from '@/contexts/ui/NotificationContext';
import useApi from '@/hooks/api/useApi';
import useAPICall from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { capitalizeString, truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { parseMarkdownInline } from '@/utils/parser';
import type { NoteRetrieve, NoteRetrieveStatusEnum } from '@services/cradle/models';
import {
    DesignNib,
    InfoCircleSolid,
    PlusCircle,
    RefreshCircle,
    Sparks,
    StatsReport,
    Trash,
    WarningCircleSolid,
    WarningTriangleSolid,
} from 'iconoir-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ActionBar, ActionBarButton, ActionBarDivider, ActionBarSearch, CollapsibleActionGroup } from '../../base/ActionBar/ActionBar';
import ListView, { DateRangeFilter, SortDirection } from '../../base/ListView/ListView';
import PaginationWrapper from '../../base/Pagination/PaginationWrapper';
import PreviewTip, { PreviewTipProvider } from '../../base/Preview/PreviewTip';
import StatusHeaderDropdown from '../../base/StatusHeaderDropdown/StatusHeaderDropdown';
import TableActionsButton from '../../base/TableActionsButton';
import Tooltip from '../../base/Tooltip/Tooltip';
import ConfirmDeletionModal from '../../modals/base/ConfirmDeletionModal';
import EnrichmentRequestModal from '../../modals/enrichment/EnrichmentRequestModal';
import ReportGenerationModal from '../../modals/reports/ReportGenerationModal';
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
    status: string;
    author: string;
    editor: string;
    createdAt: DateRangeFilter;
    lastChanged: DateRangeFilter;
}

interface ContentSearch {
    value: string;
    onChange?: (value: string) => void;
    onSubmit?: (value?: string) => void;
}

interface NotesListProps {
    query: Query | null;
    filteredNotes?: NoteRetrieve[];
    hideFleetingNotes?: boolean;
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
    hideFleetingNotes = false,
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
    const { notify } = useNotif();
    const { fleetingNotesApi, notesApi, managementApi } = useApi();
    const { execute } = useAPICall();
    const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('notes_pagesize')) || 10,
    );
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        status: 'all',
        author: query?.author__username || '',
        editor: query?.editor__username || '',
        createdAt: {
            // Only treat date filters as active when the range is complete.
            from:
                query?.created_date_from && query?.created_date_to
                    ? query.created_date_from
                    : '',
            to:
                query?.created_date_from && query?.created_date_to
                    ? query.created_date_to
                    : '',
        },
        lastChanged: {
            from:
                query?.updated_date_from && query?.updated_date_to
                    ? query.updated_date_from
                    : '',
            to:
                query?.updated_date_from && query?.updated_date_to
                    ? query.updated_date_to
                    : '',
        },
    });
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

    const handleStatusChange = (status: string) => {
        console.log('handleStatusChange', status);
        setColumnFilters((prev) => ({
            ...prev,
            status,
        }));
    };

    useEffect(() => {
        setColumnFilters({
            author: query?.author__username || '',
            editor: query?.editor__username || '',
            createdAt: {
                from:
                    query?.created_date_from && query?.created_date_to
                        ? query.created_date_from
                        : '',
                to:
                    query?.created_date_from && query?.created_date_to
                        ? query.created_date_to
                        : '',
            },
            lastChanged: {
                from:
                    query?.updated_date_from && query?.updated_date_to
                        ? query.updated_date_from
                        : '',
                to:
                    query?.updated_date_from && query?.updated_date_to
                        ? query.updated_date_to
                        : '',
            },
            status: 'all',
        });
    }, [
        query?.author__username,
        query?.editor__username,
        query?.created_date_from,
        query?.created_date_to,
        query?.updated_date_from,
        query?.updated_date_to,
    ]);

    const handleRetrySelected = useCallback(async (selectedIds: string[]) => {
        if (selectedIds.length === 0) return;

        const promises = selectedIds.map((id) =>
            execute(() => managementApi.managementActionsCreate({
                actionName: 'relinkNotes',
                requestBody: {
                    note_id: id,
                },
            }))
        );

        await Promise.all(promises);

        notify({
            type: 'success',
            text: `Retrying ${selectedIds.length} note${selectedIds.length > 1 ? 's' : ''}...`,
        });
        setSelectedNotes([]);
    }, [managementApi, execute, notify]);

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


    const fetchNotes = useCallback(async () => {
        if (query == null) return;
        setLoading(true);

        try {
            const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;

            const hasCompleteCreatedRange =
                Boolean(columnFilters.createdAt?.from) && Boolean(columnFilters.createdAt?.to);

            const params = {
                page,
                pageSize: pageSize,
                orderBy: orderBy,
                status: columnFilters.status === 'all' ? (hideFleetingNotes ? 'finalized' : null) : columnFilters.status,
                content: query.content,
                authorUsername: query.author__username,
                date: query.date,
                references: query.references,
                // Only apply timestamp filters when the range is complete.
                // This prevents "stuck" start dates when loading with only a `*_from` param.
                timestampGte: hasCompleteCreatedRange ? columnFilters.createdAt.from : undefined,
                timestampLte: hasCompleteCreatedRange ? columnFilters.createdAt.to : undefined,
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
    }, [page, pageSize, sortField, sortDirection, query, notesApi, columnFilters.status]);

    // Sync URL params to page state
    useEffect(() => {
        const pageFromParams = Number(searchParams.get('notes_page')) || 1;
        if (pageFromParams !== page) {
            setPage(pageFromParams);
        }
    }, [searchParams.get('notes_page'), page]);

    // Fetch notes when dependencies change
    useEffect(() => {
        fetchNotes();
    }, [page, pageSize, sortField, sortDirection, query?.content, query?.author__username, query?.date, query?.references, query?.created_date_from, query?.created_date_to, query?.timestamp_gte, query?.timestamp_lte, query?.truncate, columnFilters.status]);

    const handlePageChange = (newPage: number) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('notes_page', String(newPage));
        setSearchParams(newParams);
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

    const columns: Array<{
        key: string;
        label: string | React.ReactNode;
        filterType?: 'text' | 'date'
    }> = [
            {
                key: 'title',
                label: (
                    <div className='flex items-center gap-2'>
                        <StatusHeaderDropdown
                            onStatusChange={handleStatusChange}
                            status={columnFilters.status}
                            statusOptions={['all', 'fleeting', 'healthy', 'warning', 'invalid', 'processing']}
                        />
                        <span>Title</span>
                    </div>
                ),
            },
            { key: 'description', label: 'Description' },
            { key: 'author', label: 'Author', filterType: 'text' as const },
            { key: 'editor', label: 'Editor', filterType: 'text' as const },
            { key: 'createdAt', label: 'Created At', filterType: 'date' as const },
            { key: 'lastChanged', label: 'Updated At', filterType: 'date' as const },
            { key: 'actions', label: '' },
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
                    <td className='truncate w-64'>
                        <div className='flex items-center gap-2 min-w-0'>
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
                    <td className='w-12 text-right' onClick={(e) => e.stopPropagation()}>
                        <div className='flex justify-end'>
                            <RowActionsButton note={note} />
                        </div>
                    </td>
                </tr>
            </PreviewTip>
        );
    };

    // Row Actions Button Component
    const RowActionsButton = ({ note }: { note: NoteRetrieve }) => {
        const menuButtonClasses = 'w-full text-left px-4 py-2 text-sm cradle-text-secondary border border-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors rounded-lg flex items-center gap-2';

        const handleDelete = () => {
            actions[0].handler([note.id!]);
        };

        const handleRetry = () => {
            handleRetrySelected([note.id!]);
        };

        const handleReport = () => {
            const noteObject = {
                id: note.id!,
                title: note.metadata?.title || note.title || 'Untitled',
            };
            setModal(ReportGenerationModal, {
                selectedNotes: [noteObject],
            });
        };

        const handleEnrich = () => {
            const noteObject = {
                id: note.id!,
                title: note.metadata?.title || note.title || 'Untitled',
                entities: note.entities || [],
            };
            setModal(EnrichmentRequestModal, {
                notesList: [noteObject],
            });
        };

        return (
            <TableActionsButton>
                <button
                    onClick={handleRetry}
                    className={menuButtonClasses}
                >
                    <RefreshCircle width='18' height='18' />
                    Retry
                </button>
                <button
                    onClick={handleReport}
                    className={menuButtonClasses}
                >
                    <StatsReport width='18' height='18' />
                    Generate Report
                </button>
                <button
                    onClick={handleEnrich}
                    className={menuButtonClasses}
                >
                    <Sparks width='18' height='18' />
                    Enrich
                </button>
                <div className='border-t border-gray-600/40 dark:border-gray-500/40 my-1 -mx-1' />
                <button
                    onClick={handleDelete}
                    className='w-full text-left px-4 py-2 text-sm text-red-500 border border-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors rounded-lg flex items-center gap-2'
                >
                    <Trash width='18' height='18' className='text-red-500' />
                    Delete
                </button>
            </TableActionsButton>
        );
    };

    return (
        <PreviewTipProvider delayDuration={800}>
            <div ref={containerRef} className='flex flex-col space-y-4'>
                <ActionBar
                    left={
                        <>
                            {!hideActionBar && (
                                <>
                                    <CollapsibleActionGroup
                                        selectedCount={selectedNotes.length}
                                        itemLabel='note'
                                        actions={[
                                            {
                                                id: 'delete',
                                                tooltip: selectedNotes.length > 0
                                                    ? `Delete ${selectedNotes.length} note${selectedNotes.length > 1 ? 's' : ''} (Del)`
                                                    : 'Select notes to delete',
                                                icon: <Trash width={18} height={18} />,
                                                onClick: () => {
                                                    if (selectedNotes.length > 0) actions[0].handler(selectedNotes);
                                                },
                                                disabled: loading || selectedNotes.length === 0 || notes.length === 0,
                                                iconActive: selectedNotes.length > 0,

                                            },
                                            {
                                                id: 'retry',
                                                tooltip: selectedNotes.length > 0
                                                    ? `Retry ${selectedNotes.length} note${selectedNotes.length > 1 ? 's' : ''}`
                                                    : 'Select notes to retry',
                                                icon: <RefreshCircle width={18} height={18} />,
                                                onClick: () => handleRetrySelected(selectedNotes),
                                                disabled: loading || selectedNotes.length === 0 || notes.length === 0,
                                                iconActive: selectedNotes.length > 0,

                                            },
                                            {
                                                id: 'report',
                                                tooltip: selectedNotes.length > 0
                                                    ? `Generate report for ${selectedNotes.length} note${selectedNotes.length > 1 ? 's' : ''}`
                                                    : 'Select notes to generate report',
                                                icon: <StatsReport width={18} height={18} />,
                                                onClick: () => {
                                                    if (selectedNotes.length === 0) return;
                                                    const selectedNoteObjects = notes
                                                        .filter((n) => n.id && selectedNotes.includes(n.id))
                                                        .map((n) => ({
                                                            id: n.id!,
                                                            title: n.metadata?.title || n.title || 'Untitled',
                                                        }));
                                                    setModal(ReportGenerationModal, {
                                                        selectedNotes: selectedNoteObjects,
                                                    });
                                                },
                                                disabled: loading || selectedNotes.length === 0 || notes.length === 0,
                                                iconActive: selectedNotes.length > 0,
                                            },
                                            {
                                                id: 'enrich',
                                                tooltip: selectedNotes.length > 0
                                                    ? `Enrich ${selectedNotes.length} note${selectedNotes.length > 1 ? 's' : ''}`
                                                    : 'Select notes to enrich',
                                                icon: <Sparks width={18} height={18} />,
                                                onClick: () => {
                                                    if (selectedNotes.length === 0) return;
                                                    const selectedNoteObjects = notes
                                                        .filter((n) => n.id && selectedNotes.includes(n.id))
                                                        .map((n) => ({
                                                            id: n.id!,
                                                            title: n.metadata?.title || n.title || 'Untitled',
                                                            entities: n.entities || [],
                                                        }));
                                                    setModal(EnrichmentRequestModal, {
                                                        notesList: selectedNoteObjects,
                                                    });
                                                },
                                                disabled: loading || selectedNotes.length === 0 || notes.length === 0,
                                                iconActive: selectedNotes.length > 0,
                                            },
                                        ]}
                                    />

                                    <ActionBarDivider />
                                </>
                            )}

                            {onCreateNote && hideActionBar && (
                                <ActionBarButton
                                    tooltip='Create new note (Ctrl+N)'
                                    variant='circle'
                                    icon={<PlusCircle width={18} height={18} />}
                                    iconActive={true}
                                    onClick={onCreateNote}
                                    disabled={loading}
                                />
                            )}

                            {contentSearch && (
                                <ActionBarSearch
                                    placeholder='Search content...'
                                    value={contentSearch.value || ''}
                                    defaultExpanded={Boolean(contentSearch.value)}
                                    debounceMs={300}
                                    onDebouncedChange={(v) => {
                                        contentSearch.onChange?.(v);
                                        // Many parents execute the search on submit; provide the value so they don't rely on potentially-stale state.
                                        contentSearch.onSubmit?.(v);
                                    }}
                                    onSubmit={(v) => contentSearch.onSubmit?.(v)}
                                />
                            )}
                        </>
                    }
                    right={
                        <>
                            {onCreateNote && (
                                <Tooltip content='Create new note (Ctrl+N)'>
                                    <button
                                        type='button'
                                        onClick={onCreateNote}
                                        disabled={loading}
                                        className='flex items-center gap-1.5 px-4 h-9 text-sm rounded-full border border-[#FF8C00]/30 bg-[#FF8C00]/10 text-[#FF8C00] hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                    >
                                        New
                                    </button>
                                </Tooltip>
                            )}
                        </>
                    }
                />

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
                    selectedIds={selectedNotes}
                    setSelected={setSelectedNotes}
                    filterableColumns={filterableColumns}
                    filterValues={columnFilters}
                />

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
                    selectedCount={selectedNotes.length}
                    totalRows={totalCount}
                />
            </div>
        </PreviewTipProvider>
    );
}
