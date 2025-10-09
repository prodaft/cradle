import { Sort, SortDown, SortUp } from 'iconoir-react';
import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';

/**
 * ListView component - A reusable component for displaying data in table or card view
 * @function ListView
 * @param {Object} props - Component props
 * @param {Array} props.data - Array of items to display
 * @param {Array} props.columns - Column definitions for table view
 * @param {Function} props.renderCard - Function to render card view for each item
 * @param {boolean} props.loading - Loading state
 * @param {string} props.sortField - Current sort field
 * @param {string} props.sortDirection - Current sort direction ('asc' or 'desc')
 * @param {Function} props.onSort - Sort handler
 * @param {Object} props.sortFieldMapping - Mapping of column keys to API field names
 * @param {boolean} props.forceCardView - Force card view regardless of profile setting
 * @param {string} props.emptyMessage - Message to display when no data
 * @param {Function} props.renderRow - Custom row renderer for table view
 * @param {string} props.tableClassName - Additional className for table
 * @param {boolean} props.enableMultiSelect - Enable row selection with checkboxes
 * @param {Function} props.setSelected - Callback with array of selected item IDs
 * @param {Object} props.filterableColumns - Object mapping column keys to filter handlers {columnKey: onFilterChange}
 * @param {Object} props.filterValues - Object with current filter values {columnKey: value}
 * @returns {JSX.Element}
 */
export default function ListView({
    data = [],
    columns = [],
    renderCard = null,
    loading = false,
    sortField = '',
    sortDirection = 'desc',
    onSort = null,
    sortFieldMapping = {},
    forceCardView = false,
    emptyMessage = 'No items found!',
    renderRow = null,
    tableClassName = 'table table-hover',
    enableMultiSelect = false,
    setSelected = () => {},
    filterableColumns = {},
    filterValues = {},
}) {
    const { profile } = useProfile();
    const [selectedIds, setSelectedIds] = useState([]);
    const [activeFilterColumn, setActiveFilterColumn] = useState(null);
    const filterInputRefs = useRef({});

    const handleSelectAll = (checked) => {
        if (checked) {
            const allIds = data.map((item) => item.id);
            setSelectedIds(allIds);
            setSelected(allIds);
        } else {
            setSelectedIds([]);
            setSelected([]);
        }
    };

    const handleSelectRow = (id) => {
        const newSelectedIds = selectedIds.includes(id)
            ? selectedIds.filter((selectedId) => selectedId !== id)
            : [...selectedIds, id];

        setSelectedIds(newSelectedIds);
        setSelected(newSelectedIds);
    };

    const handleSort = (column) => {
        if (!onSort || !sortFieldMapping[column]) return;

        const newSortField = sortFieldMapping[column];

        if (sortField === newSortField) {
            // Toggle direction if same field
            onSort(newSortField, sortDirection === 'desc' ? 'asc' : 'desc');
        } else {
            // New field, default to descending for timestamp fields, ascending for others
            const newDirection = newSortField.includes('timestamp') ||
                                newSortField.includes('created_at') ||
                                newSortField.includes('edit_timestamp')
                                ? 'desc'
                                : 'asc';
            onSort(newSortField, newDirection);
        }
    };

    const getSortIcon = (column, className) => {
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
        const handleClickOutside = (event) => {
            if (activeFilterColumn && filterInputRefs.current[activeFilterColumn]) {
                if (!filterInputRefs.current[activeFilterColumn].contains(event.target)) {
                    setActiveFilterColumn(null);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeFilterColumn]);

    const handleFilterChange = (column, value) => {
        if (filterableColumns[column]) {
            filterableColumns[column](value);
        }
    };

    const handleFilterKeyDown = (e, column) => {
        if (e.key === 'Enter') {
            setActiveFilterColumn(null);
        } else if (e.key === 'Escape') {
            setActiveFilterColumn(null);
        }
    };

    const SortableTableHeader = ({ column, children, className = '', filterType = 'text' }) => {
        const isSortable = sortFieldMapping[column] && onSort;
        const isFilterable = filterableColumns[column];
        const isFilterActive = activeFilterColumn === column;

        const handleHeaderClick = (e) => {
            // If filterable and clicked on the text, activate filter
            if (isFilterable && e.target.closest('.header-text')) {
                e.stopPropagation();
                setActiveFilterColumn(column);
                setTimeout(() => {
                    filterInputRefs.current[column]?.focus();
                }, 0);
            } else if (isSortable && !isFilterActive) {
                // Sort functionality
                handleSort(column);
            }
        };

        const handleDateRangeChange = (field, value) => {
            const currentValue = filterValues[column] || {};
            const newValue = { ...currentValue, [field]: value };
            handleFilterChange(column, newValue);
        };

        const hasDateRangeFilter = filterType === 'date' && filterValues[column] && 
            (filterValues[column].from || filterValues[column].to);

        return (
            <th
                className={`${isSortable || isFilterable ? 'select-none' : ''} ${className}`}
                onClick={handleHeaderClick}
            >
                {isFilterActive ? (
                    <div ref={(el) => (filterInputRefs.current[column] = el)} className='p-1'>
                        {filterType === 'date' ? (
                            <div className='flex flex-col gap-1'>
                                <input
                                    type='date'
                                    value={filterValues[column]?.from || ''}
                                    onChange={(e) => handleDateRangeChange('from', e.target.value)}
                                    onKeyDown={(e) => handleFilterKeyDown(e, column)}
                                    className='cradle-search text-xs py-1 px-2 w-full'
                                    placeholder='From'
                                    autoFocus
                                />
                                <input
                                    type='date'
                                    value={filterValues[column]?.to || ''}
                                    onChange={(e) => handleDateRangeChange('to', e.target.value)}
                                    onKeyDown={(e) => handleFilterKeyDown(e, column)}
                                    className='cradle-search text-xs py-1 px-2 w-full'
                                    placeholder='To'
                                />
                            </div>
                        ) : (
                            <input
                                type='text'
                                value={filterValues[column] || ''}
                                onChange={(e) => handleFilterChange(column, e.target.value)}
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
                            {(filterValues[column] && 
                              (typeof filterValues[column] === 'string' ? filterValues[column] : hasDateRangeFilter)) && (
                                <span className='ml-1 text-xs text-blue-600 dark:text-blue-400'>●</span>
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

    const showTableView = !forceCardView;

    return (
        <>
            {showTableView ? (
                <div className='overflow-x-auto w-full cradle-scrollbar'>
                        <table className='cradle-table'>
                            <thead>
                                <tr>
                                    {enableMultiSelect && (
                                        <th className='w-12'>
                                            <div className='flex items-center gap-2'>
                                                <input
                                                    type='checkbox'
                                                    className='checkbox checkbox-sm'
                                                    checked={
                                                        data.length > 0 &&
                                                        selectedIds.length === data.length
                                                    }
                                                    onChange={(e) =>
                                                        handleSelectAll(e.target.checked)
                                                    }
                                                    disabled={data.length === 0}
                                                />
                                                {selectedIds.length > 0 && (
                                                    <span className='text-xs font-semibold text-blue-600 dark:text-blue-400'>
                                                        {selectedIds.length}
                                                    </span>
                                                )}
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
                                        <td colSpan={columns.length + (enableMultiSelect ? 1 : 0)} className='text-center py-8'>
                                            <span className='text-sm text-zinc-500 cradle-text-tertiary'>
                                                {emptyMessage}
                                            </span>
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((item, index) =>
                                        renderRow ? renderRow(item, index, {
                                            enableMultiSelect,
                                            isSelected: selectedIds.includes(item.id),
                                            onSelect: () => handleSelectRow(item.id),
                                        }) : null
                                    )
                                )}
                            </tbody>
                        </table>
                </div>
            ) : (
                data.length === 0 ? (
                    <div className='container mx-auto flex flex-col items-center'>
                        <p className='mt-6 !text-sm !font-normal text-zinc-500'>
                            {emptyMessage}
                        </p>
                    </div>
                ) : (
                    data.map((item, index) =>
                        renderCard ? renderCard(item, index) : null
                    )
                )
            )}
        </>
    );
}

ListView.propTypes = {
    data: PropTypes.array,
    columns: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            className: PropTypes.string,
        })
    ),
    renderCard: PropTypes.func,
    loading: PropTypes.bool,
    sortField: PropTypes.string,
    sortDirection: PropTypes.oneOf(['asc', 'desc']),
    onSort: PropTypes.func,
    sortFieldMapping: PropTypes.object,
    forceCardView: PropTypes.bool,
    emptyMessage: PropTypes.string,
    renderRow: PropTypes.func,
    tableClassName: PropTypes.string,
    enableMultiSelect: PropTypes.bool,
    setSelected: PropTypes.func,
    filterableColumns: PropTypes.object,
    filterValues: PropTypes.object,
};
