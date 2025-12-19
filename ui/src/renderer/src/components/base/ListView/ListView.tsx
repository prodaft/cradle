import Datepicker from '@components/base/Datepicker/Datepicker';
import { useProfile } from '@contexts/user/ProfileContext';
import { format } from 'date-fns';
import { Sort, SortDown, SortUp } from 'iconoir-react/regular';
import { ReactNode, useRef, useState } from 'react';

interface Column {
    key: string;
    label: string | React.ReactNode;
    className?: string;
    filterType?: 'text' | 'date';
}

export interface DateRangeFilter {
    from?: string;
    to?: string;
}

interface RenderRowOptions<T> {
    enableMultiSelect: boolean;
    isSelected: boolean;
    onSelect: () => void;
}

export type SortDirection = 'asc' | 'desc';

interface ListViewProps<T extends { id?: string | number }> {
    data?: T[];
    columns?: Column[];
    loading?: boolean;
    sortField?: string;
    sortDirection?: SortDirection;
    onSort?: ((field: string, direction: SortDirection) => void) | null;
    sortFieldMapping?: Record<string, string>;
    emptyMessage?: string;
    renderRow?:
    | ((item: T, index: number, options: RenderRowOptions<T>) => ReactNode)
    | null;
    tableClassName?: string;
    enableMultiSelect?: boolean;
    /**
     * Controlled selection (source of truth lives in the parent).
     * If provided, the checkbox UI will reflect these ids instead of internal state.
     */
    selectedIds?: NonNullable<T['id']>[];
    setSelected?: (ids: NonNullable<T['id']>[]) => void;
    filterableColumns?: Record<string, (value: string | DateRangeFilter) => void>;
    filterValues?: Record<string, string | DateRangeFilter | undefined>;
}

/**
 * ListView component - A reusable component for displaying data in table view
 *
 * NOTE: The data items must have an id property (string or number), but it is optional
 * to allow for compatibility with the auto-generated API responses.
 * Supports both string IDs (UUIDs for Notes, Users, Relations) and number IDs (Entry BigAutoField).
 */
export default function ListView<T extends { id?: string | number }>({
    data = [],
    columns = [],
    loading = false,
    sortField = '',
    sortDirection = 'desc',
    onSort = null,
    sortFieldMapping = {},
    emptyMessage = 'No items found!',
    renderRow = null,
    tableClassName = 'table table-hover',
    enableMultiSelect = false,
    selectedIds: controlledSelectedIds,
    setSelected = () => { },
    filterableColumns = {},
    filterValues = {},
}: ListViewProps<T>) {
    const { profile } = useProfile();
    const [internalSelectedIds, setInternalSelectedIds] = useState<
        NonNullable<T['id']>[]
    >([]);
    const selectedIds = controlledSelectedIds ?? internalSelectedIds;
    const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
    const filterInputRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [draftDateRanges, setDraftDateRanges] = useState<
        Record<string, { start: Date | null; end: Date | null }>
    >({});
    const [draftTextFilters, setDraftTextFilters] = useState<Record<string, string>>(
        {},
    );

    const safeParseDate = (value?: string) => {
        if (!value) return null;
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const clearDraftDateRange = (column: string) => {
        setDraftDateRanges((prev) => {
            if (!prev[column]) return prev;
            const next = { ...prev };
            delete next[column];
            return next;
        });
    };

    const clearDraftTextFilter = (column: string) => {
        setDraftTextFilters((prev) => {
            if (!(column in prev)) return prev;
            const next = { ...prev };
            delete next[column];
            return next;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = data.map((item) => item.id!) as NonNullable<T['id']>[];
            if (controlledSelectedIds == null) {
                setInternalSelectedIds(allIds);
            }
            setSelected(allIds);
        } else {
            if (controlledSelectedIds == null) {
                setInternalSelectedIds([]);
            }
            setSelected([]);
        }
    };

    const handleSelectRow = (id: NonNullable<T['id']>) => {
        const newSelectedIds = selectedIds.includes(id)
            ? selectedIds.filter((selectedId) => selectedId !== id)
            : [...selectedIds, id];

        if (controlledSelectedIds == null) {
            setInternalSelectedIds(newSelectedIds);
        }
        setSelected(newSelectedIds);
    };

    const handleSort = (column: string) => {
        if (!onSort || !sortFieldMapping[column]) return;

        const newSortField = sortFieldMapping[column];

        if (sortField === newSortField) {
            // Toggle direction if same field
            onSort(newSortField, sortDirection === 'desc' ? 'asc' : 'desc');
        } else {
            // New field, default to descending for timestamp fields, ascending for others
            const newDirection =
                newSortField.includes('timestamp') ||
                    newSortField.includes('created_at') ||
                    newSortField.includes('edit_timestamp')
                    ? 'desc'
                    : 'asc';
            onSort(newSortField, newDirection);
        }
    };

    const getSortIcon = (column: string, className: string) => {
        const fieldName = sortFieldMapping[column];
        if (!fieldName || sortField !== fieldName) {
            return <Sort className={className} />;
        }

        return sortDirection === 'desc' ? (
            <SortDown className={className} />
        ) : (
            <SortUp className={className} />
        );
    };


    const handleFilterChange = (column: string, value: string | DateRangeFilter) => {
        if (filterableColumns[column]) {
            filterableColumns[column](value);
        }
    };

    interface SortableTableHeaderProps {
        column: string;
        children: ReactNode;
        className?: string;
        filterType?: 'text' | 'date';
    }

    const SortableTableHeader = ({
        column,
        children,
        className = '',
        filterType = 'text',
    }: SortableTableHeaderProps) => {
        const isSortable = !!sortFieldMapping[column] && !!onSort;
        const isFilterable = !!filterableColumns[column];
        const isFilterActive = activeFilterColumn === column;

        const handleHeaderClick = (e: React.MouseEvent) => {
            // If filterable and clicked on the text, activate filter
            if (isFilterable && (e.target as HTMLElement).closest('.header-text')) {
                e.stopPropagation();
                setActiveFilterColumn(column);

                if (filterType !== 'date') {
                    const existing =
                        typeof filterValues[column] === 'string'
                            ? (filterValues[column] as string)
                            : '';
                    setDraftTextFilters((prev) => ({
                        ...prev,
                        [column]: existing ?? '',
                    }));
                } else {
                    const committed = filterValues[column] as DateRangeFilter | undefined;
                    const committedStart = safeParseDate(committed?.from);
                    const committedEnd = safeParseDate(committed?.to);
                    if (committedStart && committedEnd) {
                        setDraftDateRanges((prev) => ({
                            ...prev,
                            [column]: { start: committedStart, end: committedEnd },
                        }));
                    } else {
                        clearDraftDateRange(column);
                    }
                }

                setTimeout(() => {
                    filterInputRefs.current[column]?.querySelector('input')?.focus();
                }, 0);
            } else if (isSortable && !isFilterActive) {
                // Sort functionality
                handleSort(column);
            }
        };

        const handleDateRangeChange = (dates: [Date | null, Date | null]) => {
            const [start, end] = dates;
            setDraftDateRanges((prev) => ({
                ...prev,
                [column]: { start, end },
            }));

            if (start && end) {
                const newValue: DateRangeFilter = {
                    from: format(start, 'yyyy-MM-dd'),
                    to: format(end, 'yyyy-MM-dd'),
                };
                handleFilterChange(column, newValue);
                clearDraftDateRange(column);
                setActiveFilterColumn(null);
            }
        };

        const hasCompleteDateRangeFilter =
            filterType === 'date' &&
            filterValues[column] &&
            Boolean((filterValues[column] as DateRangeFilter).from) &&
            Boolean((filterValues[column] as DateRangeFilter).to);

        return (
            <th
                className={`${isSortable || isFilterable ? 'select-none' : ''} ${className}`}
                onClick={handleHeaderClick}
            >
                {isFilterActive ? (
                    <div
                        ref={(el) => { filterInputRefs.current[column] = el }}
                        className='p-1'
                    >
                        {filterType === 'date' ? (
                            (() => {
                                const committed = filterValues[column] as DateRangeFilter | undefined;
                                const committedStart = safeParseDate(committed?.from);
                                const committedEnd = safeParseDate(committed?.to);
                                const committedHasCompleteRange = Boolean(committedStart) && Boolean(committedEnd);

                                const draft = draftDateRanges[column];
                                // IMPORTANT: if a draft exists, it must fully override committed values,
                                // even if `draft.end` is null. Otherwise we'd incorrectly fall back to the
                                // committed end date and make range selection feel "stuck".
                                const effectiveStart = draft ? draft.start : (committedHasCompleteRange ? committedStart : null);
                                const effectiveEnd = draft ? draft.end : (committedHasCompleteRange ? committedEnd : null);

                                return (
                                    <Datepicker
                                        startDate={
                                            effectiveStart
                                        }
                                        endDate={
                                            effectiveEnd
                                        }
                                        onChange={handleDateRangeChange}
                                        className='cradle-search cradle-search-with-icon-left text-xs !py-1 w-48'
                                        open={true}
                                        onClickOutside={() => {
                                            // Close the filter UI. If the selection isn't complete, do not apply anything.
                                            const draft = draftDateRanges[column];
                                            if (draft && !(draft.start && draft.end)) {
                                                clearDraftDateRange(column);
                                            }
                                            setActiveFilterColumn(null);
                                        }}
                                    />
                                );
                            })()
                        ) : (
                            <input
                                type='text'
                                value={
                                    draftTextFilters[column] ??
                                    ((filterValues[column] as string) || '')
                                }
                                onChange={(e) => {
                                    const next = e.target.value;
                                    setDraftTextFilters((prev) => ({
                                        ...prev,
                                        [column]: next,
                                    }));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const value = draftTextFilters[column] ?? '';
                                        handleFilterChange(column, value);
                                        clearDraftTextFilter(column);
                                        setActiveFilterColumn(null);
                                    } else if (e.key === 'Escape') {
                                        clearDraftTextFilter(column);
                                        setActiveFilterColumn(null);
                                    }
                                }}
                                className='cradle-search text-xs py-1 px-2 w-full'
                                placeholder={`Filter ${children}...`}
                                autoFocus
                            />
                        )}
                    </div>
                ) : (
                    <div className='flex items-center justify-between'>
                        <span
                            className={`cradle-label ${isFilterable ? 'cursor-text hover:underline decoration-dotted header-text' : ''}`}
                            title={isFilterable ? `Click to filter by ${children}` : ''}
                        >
                            {children}
                            {!!filterValues[column] &&
                                (typeof filterValues[column] === 'string'
                                    ? !!filterValues[column]
                                    : hasCompleteDateRangeFilter) && (
                                    <span className='ml-1 text-xs text-orange-600 dark:text-orange-400'>
                                        ●
                                    </span>
                                )}
                        </span>
                        {isSortable && (
                            <button
                                className='cursor-pointer hover:cradle-bg-tertiary p-1 rounded '
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSort(column);
                                }}
                            >
                                {getSortIcon(column, 'w-4 h-4 cradle-text-tertiary')}
                            </button>
                        )}
                    </div>
                )}
            </th>
        );
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center min-h-[200px]'>
                <div className='spinner-dot-pulse'>
                    <div className='spinner-pulse-dot'></div>
                </div>
            </div>
        );
    }

    return (
        <div className='overflow-x-auto w-full cradle-scrollbar pb-4'>
            <table className='cradle-table'>
                <thead>
                    <tr>
                        {enableMultiSelect && (
                            <th className='w-12'>
                                <div className='flex items-center gap-2'>
                                    <input
                                        type='checkbox'
                                        className='cradle-checkbox'
                                        checked={
                                            data.length > 0 &&
                                            selectedIds.length === data.length
                                        }
                                        onChange={(e) =>
                                            handleSelectAll(e.target.checked)
                                        }
                                        disabled={data.length === 0}
                                    />
                                </div>
                            </th>
                        )}
                        {columns.map((column) => (
                            <SortableTableHeader
                                key={column.key}
                                column={column.key}
                                className={column.className || ''}
                                filterType={column.filterType || 'text'}
                            >
                                {column.label}
                            </SortableTableHeader>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length + (enableMultiSelect ? 1 : 0)}
                                className='text-center py-8'
                            >
                                <span className='text-sm text-zinc-500 cradle-text-tertiary'>
                                    {emptyMessage}
                                </span>
                            </td>
                        </tr>
                    ) : (
                        data.map((item, index) =>
                            renderRow
                                ? renderRow(item, index, {
                                    enableMultiSelect,
                                    isSelected: selectedIds.includes(item.id!),
                                    onSelect: () => handleSelectRow(item.id!),
                                })
                                : null,
                        )
                    )}
                </tbody>
            </table>
        </div>
    );
}
