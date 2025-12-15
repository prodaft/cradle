import { useProfile } from '@contexts/user/ProfileContext';
import { Sort, SortDown, SortUp } from 'iconoir-react/regular';
import { ReactNode, useEffect, useRef, useState } from 'react';

interface Column {
    key: string;
    label: string;
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
    setSelected = () => { },
    filterableColumns = {},
    filterValues = {},
}: ListViewProps<T>) {
    const { profile } = useProfile();
    const [selectedIds, setSelectedIds] = useState<NonNullable<T['id']>[]>([]);
    const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
    const filterInputRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = data.map((item) => item.id!) as NonNullable<T['id']>[];
            setSelectedIds(allIds);
            setSelected(allIds);
        } else {
            setSelectedIds([]);
            setSelected([]);
        }
    };

    const handleSelectRow = (id: NonNullable<T['id']>) => {
        const newSelectedIds = selectedIds.includes(id)
            ? selectedIds.filter((selectedId) => selectedId !== id)
            : [...selectedIds, id];

        setSelectedIds(newSelectedIds);
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

    // Handle clicks outside filter inputs to close them
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeFilterColumn && filterInputRefs.current[activeFilterColumn]) {
                if (
                    !filterInputRefs.current[activeFilterColumn]?.contains(
                        event.target as Node,
                    )
                ) {
                    setActiveFilterColumn(null);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeFilterColumn]);

    const handleFilterChange = (column: string, value: string | DateRangeFilter) => {
        if (filterableColumns[column]) {
            filterableColumns[column](value);
        }
    };

    const handleFilterKeyDown = (e: React.KeyboardEvent, column: string) => {
        if (e.key === 'Enter') {
            setActiveFilterColumn(null);
        } else if (e.key === 'Escape') {
            setActiveFilterColumn(null);
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
                setTimeout(() => {
                    filterInputRefs.current[column]?.querySelector('input')?.focus();
                }, 0);
            } else if (isSortable && !isFilterActive) {
                // Sort functionality
                handleSort(column);
            }
        };

        const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
            const currentValue = (filterValues[column] as DateRangeFilter) || {};
            const newValue = { ...currentValue, [field]: value };
            handleFilterChange(column, newValue);
        };

        const hasDateRangeFilter =
            filterType === 'date' &&
            filterValues[column] &&
            ((filterValues[column] as DateRangeFilter).from ||
                (filterValues[column] as DateRangeFilter).to);

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
                            <div className='flex flex-col gap-1'>
                                <input
                                    type='date'
                                    value={
                                        (filterValues[column] as DateRangeFilter)
                                            ?.from || ''
                                    }
                                    onChange={(e) =>
                                        handleDateRangeChange('from', e.target.value)
                                    }
                                    onKeyDown={(e) => handleFilterKeyDown(e, column)}
                                    className='cradle-search text-xs py-1 px-2 w-full'
                                    placeholder='From'
                                    autoFocus
                                />
                                <input
                                    type='date'
                                    value={
                                        (filterValues[column] as DateRangeFilter)?.to ||
                                        ''
                                    }
                                    onChange={(e) =>
                                        handleDateRangeChange('to', e.target.value)
                                    }
                                    onKeyDown={(e) => handleFilterKeyDown(e, column)}
                                    className='cradle-search text-xs py-1 px-2 w-full'
                                    placeholder='To'
                                />
                            </div>
                        ) : (
                            <input
                                type='text'
                                value={(filterValues[column] as string) || ''}
                                onChange={(e) =>
                                    handleFilterChange(column, e.target.value)
                                }
                                onKeyDown={(e) => handleFilterKeyDown(e, column)}
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
                                    : hasDateRangeFilter) && (
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
