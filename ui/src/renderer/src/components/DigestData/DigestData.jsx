import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Datepicker from 'react-tailwindcss-datepicker';
import { Search } from 'iconoir-react';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import { getDigests } from '../../services/intelioService/intelioService';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import DigestList from '../UploadExternal/DigestList';

export default function DigestData() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [alert, setAlert] = useState({ show: false, message: '', color: '' });
    const { profile } = useProfile();

    // Digest list state
    const [digests, setDigests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState(searchParams.get('digests_sort_field') || 'created_at');
    const [sortDirection, setSortDirection] = useState(searchParams.get('digests_sort_direction') || 'desc');
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('digests_pagesize')) ||
        25
    );

    // Search state
    const [searchFilters, setSearchFilters] = useState({
        title: searchParams.get('title') || '',
        author: searchParams.get('author') || '',
    });

    const [submittedFilters, setSubmittedFilters] = useState({
        title: searchParams.get('title') || '',
        author: searchParams.get('author') || '',
    });

    // Date range state
    const [dateRange, setDateRange] = useState({
        startDate: searchParams.get('created_at_gte') || null,
        endDate: searchParams.get('created_at_lte') || null,
    });

    useEffect(() => {
        fetchDigests();
    }, [page, submittedFilters, sortField, sortDirection, pageSize]);

    // Initialize filters from URL parameters
    useEffect(() => {
        const initialFilters = {
            title: searchParams.get('title') || '',
            author: searchParams.get('author') || '',
        };

        const initialDateRange = {
            startDate: searchParams.get('created_at_gte')
                ? new Date(searchParams.get('created_at_gte'))
                    .toISOString()
                    .split('T')[0]
                : null,
            endDate: searchParams.get('created_at_lte')
                ? new Date(searchParams.get('created_at_lte'))
                    .toISOString()
                    .split('T')[0]
                : null,
        };

        setSearchFilters(initialFilters);
        setDateRange(initialDateRange);

        if (
            searchParams.has('title') ||
            searchParams.has('author') ||
            searchParams.has('created_at_gte') ||
            searchParams.has('created_at_lte')
        ) {
            setSubmittedFilters({
                ...initialFilters,
                created_at_gte: searchParams.get('created_at_gte') || '',
                created_at_lte: searchParams.get('created_at_lte') || '',
            });
        }
    }, []);

    const updateSearchParams = (filters, dateRangeValue) => {
        const newParams = new URLSearchParams(searchParams);

        if (filters.title) {
            newParams.set('title', filters.title);
        } else {
            newParams.delete('title');
        }

        if (filters.author) {
            newParams.set('author', filters.author);
        } else {
            newParams.delete('author');
        }

        if (dateRangeValue.startDate) {
            newParams.set(
                'created_at_gte',
                new Date(dateRangeValue.startDate).toISOString(),
            );
        } else {
            newParams.delete('created_at_gte');
        }

        if (dateRangeValue.endDate) {
            const endDate = new Date(dateRangeValue.endDate);
            endDate.setHours(23, 59, 59, 999);
            newParams.set('created_at_lte', endDate.toISOString());
        } else {
            newParams.delete('created_at_lte');
        }

        setSearchParams(newParams, { replace: true });

        setSubmittedFilters({
            ...filters,
            created_at_gte: dateRangeValue.startDate
                ? new Date(dateRangeValue.startDate).toISOString()
                : '',
            created_at_lte: dateRangeValue.endDate
                ? (() => {
                    const endDate = new Date(dateRangeValue.endDate);
                    endDate.setHours(23, 59, 59, 999);
                    return endDate.toISOString();
                })()
                : '',
        });
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            updateSearchParams(searchFilters, dateRange);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchFilters, dateRange]);

    const handleSearchChange = (e) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleDateRangeChange = (value) => {
        setDateRange(value);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        updateSearchParams(searchFilters, dateRange);
    };

    const fetchDigests = async () => {
        setLoading(true);
        try {
            const searchQueryParams = {
                page,
                page_size: pageSize,
                ...submittedFilters,
            };

            const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
            searchQueryParams.order_by = orderBy;

            const response = await getDigests(searchQueryParams);

            setDigests(response.data.results);
            setTotalPages(response.data.total_pages);
        } catch (error) {
            console.error('Failed to fetch digests', error);
            setAlert({
                color: 'red',
                message: `Error fetching digests: ${error.message}`,
                show: true,
            });
            setDigests([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const handleSort = (newSortField, newSortDirection) => {
        setSortField(newSortField);
        setSortDirection(newSortDirection);
        setPage(1);

        const newParams = new URLSearchParams(searchParams);
        newParams.set('digests_sort_field', newSortField);
        newParams.set('digests_sort_direction', newSortDirection);
        setSearchParams(newParams, { replace: true });
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setPage(1);

        const newParams = new URLSearchParams(searchParams);
        newParams.set('digests_pagesize', String(newSize));
        setSearchParams(newParams, { replace: true });
    };

    return (
        <div className='w-full h-full'>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            
            {/* Page Header */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        Digest Data
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                        Browse & Manage Imported Data
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className='flex flex-col space-y-4 p-4'>
                {/* Search Section */}
                <div className='cradle-card cradle-card-compact'>
                    <div className='cradle-card-body p-3'>
                        <form
                            onSubmit={handleSearchSubmit}
                            className='flex flex-wrap items-center gap-3'
                        >
                            <div className='flex-1 min-w-[200px]'>
                                <Datepicker
                                    value={dateRange}
                                    onChange={handleDateRangeChange}
                                    inputClassName='cradle-search text-sm py-2 px-3 w-full'
                                    toggleClassName='hidden'
                                    placeholder='Select date range'
                                />
                            </div>
                            <input
                                type='text'
                                name='title'
                                value={searchFilters.title}
                                onChange={handleSearchChange}
                                placeholder='Search by title'
                                className='cradle-search text-sm py-2 px-3 flex-1 min-w-[150px]'
                            />
                            <input
                                type='text'
                                name='author'
                                value={searchFilters.author}
                                onChange={handleSearchChange}
                                placeholder='Search by user'
                                className='cradle-search text-sm py-2 px-3 flex-1 min-w-[150px]'
                            />
                            <button type='submit' className='cradle-btn cradle-btn-secondary px-4 py-2 flex items-center gap-2'>
                                <Search className='w-4 h-4' /> Search
                            </button>
                        </form>
                    </div>
                </div>

                {/* Digest List */}
                <DigestList
                    digests={digests}
                    loading={loading}
                    page={page}
                    totalPages={totalPages}
                    handlePageChange={handlePageChange}
                    setAlert={setAlert}
                    onDigestDelete={fetchDigests}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    pageSize={pageSize}
                    setPageSize={handlePageSizeChange}
                />
            </div>
        </div>
    );
}

