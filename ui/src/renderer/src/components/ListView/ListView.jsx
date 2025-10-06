import { Sort, SortDown, SortUp } from 'iconoir-react';
import PropTypes from 'prop-types';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import Pagination from '../Pagination/Pagination';

/**
 * ListView component - A reusable component for displaying data in table or card view
 * @function ListView
 * @param {Object} props - Component props
 * @param {Array} props.data - Array of items to display
 * @param {Array} props.columns - Column definitions for table view
 * @param {Function} props.renderCard - Function to render card view for each item
 * @param {boolean} props.loading - Loading state
 * @param {number} props.currentPage - Current page number
 * @param {number} props.totalPages - Total number of pages
 * @param {Function} props.onPageChange - Page change handler
 * @param {string} props.sortField - Current sort field
 * @param {string} props.sortDirection - Current sort direction ('asc' or 'desc')
 * @param {Function} props.onSort - Sort handler
 * @param {Object} props.sortFieldMapping - Mapping of column keys to API field names
 * @param {boolean} props.forceCardView - Force card view regardless of profile setting
 * @param {string} props.emptyMessage - Message to display when no data
 * @param {Function} props.renderRow - Custom row renderer for table view
 * @param {string} props.tableClassName - Additional className for table
 * @returns {JSX.Element}
 */
export default function ListView({
    data = [],
    columns = [],
    renderCard = null,
    loading = false,
    currentPage = 1,
    totalPages = 1,
    onPageChange = () => {},
    sortField = '',
    sortDirection = 'desc',
    onSort = null,
    sortFieldMapping = {},
    forceCardView = false,
    emptyMessage = 'No items found!',
    renderRow = null,
    tableClassName = 'table table-hover',
}) {
    const { profile } = useProfile();

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

    const SortableTableHeader = ({ column, children, className = '' }) => {
        const isSortable = sortFieldMapping[column] && onSort;

        return (
            <th
                className={isSortable ? `cursor-pointer select-none ${className}` : className}
                onClick={isSortable ? () => handleSort(column) : undefined}
            >
                {isSortable ? (
                    <div className='flex items-center justify-between !border-b-0 !border-t-0'>
                        <span className='!border-b-0 !border-t-0'>{children}</span>
                        {getSortIcon(
                            column,
                            'w-4 h-4 text-zinc-600 dark:text-zinc-400 !border-b-0 !border-t-0',
                        )}
                    </div>
                ) : (
                    children
                )}
            </th>
        );
    };

    const LoadingSpinner = () => (
        <div className='flex items-center justify-center min-h-[200px]'>
            <div className='spinner-dot-pulse'>
                <div className='spinner-pulse-dot'></div>
            </div>
        </div>
    );

    const EmptyState = () => (
        <div className='container mx-auto flex flex-col items-center'>
            <p className='mt-6 !text-sm !font-normal text-zinc-500'>
                {emptyMessage}
            </p>
        </div>
    );

    if (loading) {
        return <LoadingSpinner />;
    }

    if (data.length === 0) {
        return <EmptyState />;
    }

    const showTableView = !forceCardView && profile?.compact_mode;

    return (
        <>
            <div className='flex flex-col space-y-4'>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                />

                {showTableView ? (
                    <div className='overflow-x-auto w-full'>
                        <table className={tableClassName}>
                            <thead>
                                <tr>
                                    {columns.map((column) => (
                                        <SortableTableHeader
                                            key={column.key}
                                            column={column.key}
                                            className={column.className || ''}
                                        >
                                            {column.label}
                                        </SortableTableHeader>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, index) =>
                                    renderRow ? renderRow(item, index) : null
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    data.map((item, index) =>
                        renderCard ? renderCard(item, index) : null
                    )
                )}

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                />
            </div>
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
    currentPage: PropTypes.number,
    totalPages: PropTypes.number,
    onPageChange: PropTypes.func,
    sortField: PropTypes.string,
    sortDirection: PropTypes.oneOf(['asc', 'desc']),
    onSort: PropTypes.func,
    sortFieldMapping: PropTypes.object,
    forceCardView: PropTypes.bool,
    emptyMessage: PropTypes.string,
    renderRow: PropTypes.func,
    tableClassName: PropTypes.string,
};
