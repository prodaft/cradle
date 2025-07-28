import { NavArrowDown, NavArrowUp, Search } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Datepicker from 'react-tailwindcss-datepicker';
import { useProfile } from '../../hooks/useProfile/useProfile';
import {
    getDigests,
    getDigestTypes,
} from '../../services/intelioService/intelioService';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import DigestList from './DigestList';
import UploadForm from './UploadForm';

export default function UploadExternal({ setAlert }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [dataTypeOptions, setDataTypeOptions] = useState([]);
    const [alert, setLocalAlert] = useState({ show: false, message: '', color: '' });
    const { profile } = useProfile();
    const [isUploadFormVisible, setIsUploadFormVisible] = useState(false);

    // Digest list state
    const [digests, setDigests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');

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

    const toggleUploadForm = () => {
        setIsUploadFormVisible(!isUploadFormVisible);
    };

    useEffect(() => {
        getDigestTypes()
            .then((response) => {
                if (response.status === 200) {
                    const dataTypes = response.data.map((type) => ({
                        value: type.class_name,
                        label: type.name,
                        inferEntities: type.infer_entities,
                    }));
                    setDataTypeOptions(dataTypes);
                } else {
                    (setAlert || setLocalAlert)({
                        color: 'red',
                        message: 'Failed to load data types',
                        show: true,
                    });
                }
            })
            .catch((error) => {
                (setAlert || setLocalAlert)({
                    color: 'red',
                    message: `Error fetching data types: ${error.message}`,
                    show: true,
                });
            });

        // Initial fetch of digests with search params
        fetchDigests();
    }, [page, submittedFilters, sortField, sortDirection]);

    // Add an effect to initialize filters and date range from URL parameters
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

        // Set initial submitted filters if URL has parameters
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

        // Add date range parameters if they exist
        if (dateRangeValue.startDate) {
            newParams.set(
                'created_at_gte',
                new Date(dateRangeValue.startDate).toISOString(),
            );
        } else {
            newParams.delete('created_at_gte');
        }

        if (dateRangeValue.endDate) {
            // Set end date to end of day
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

    // Auto-update search when filters or date range change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            updateSearchParams(searchFilters, dateRange);
        }, 500); // Debounce for 500ms

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
            // Add search filters to the API call
            const searchQueryParams = {
                page,
                page_size: profile?.compact_mode ? 25 : 10,
                ...submittedFilters,
            };

            // Add sorting
            const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
            searchQueryParams.order_by = orderBy;

            const response = await getDigests(searchQueryParams);

            setDigests(response.data.results);
            setTotalPages(response.data.total_pages);
        } catch (error) {
            console.error('Failed to fetch digests', error);
            (setAlert || setLocalAlert)({
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
        // Reset to first page when sorting changes
        setPage(1);
    };

    // Use the provided setAlert or the local one
    const alertHandler = setAlert || setLocalAlert;

    return (
        <>
            <AlertDismissible alert={alert} setAlert={alertHandler} />
            <div className=''>
                <div className='flex items-center mb-4'>
                    <h2 className='text-xl font-semibold flex items-center gap-2 ml-4'>
                        Upload External Data
                        <button
                            className='btn btn-sm btn-ghost p-1'
                            onClick={toggleUploadForm}
                            aria-expanded={isUploadFormVisible}
                            aria-controls='upload-form-section'
                        >
                            {isUploadFormVisible ? (
                                <NavArrowUp size={16} />
                            ) : (
                                <NavArrowDown size={16} />
                            )}
                        </button>
                    </h2>
                </div>

                <div
                    id='upload-form-section'
                    className={`ease-in-out ${
                        isUploadFormVisible
                            ? 'max-h-[1000px] opacity-100 mb-4'
                            : 'max-h-0 opacity-0'
                    }`}
                >
                    <UploadForm
                        dataTypeOptions={dataTypeOptions}
                        onUpload={fetchDigests}
                    />
                </div>

                {/* Search Section */}
                <div>
                    <form
                        onSubmit={handleSearchSubmit}
                        className='flex space-x-4 px-3 pb-2'
                    >
                        <Datepicker
                            value={dateRange}
                            onChange={handleDateRangeChange}
                            inputClassName='input input-block py-1 px-2 text-sm flex-grow !max-w-full w-full'
                            toggleClassName='hidden'
                            placeholder='Select date range'
                        />
                        <input
                            type='text'
                            name='title'
                            value={searchFilters.title}
                            onChange={handleSearchChange}
                            placeholder='Search by title'
                            className='input !max-w-full w-full'
                        />
                        <input
                            type='text'
                            name='author'
                            value={searchFilters.author}
                            onChange={handleSearchChange}
                            placeholder='Search by user'
                            className='input !max-w-full w-full'
                        />
                        <button type='submit' className='btn'>
                            <Search /> Search
                        </button>
                    </form>
                </div>

                {/* Digest List Section */}
                <div className='mt-4'>
                    <DigestList
                        digests={digests}
                        loading={loading}
                        page={page}
                        totalPages={totalPages}
                        handlePageChange={handlePageChange}
                        setAlert={alertHandler}
                        onDigestDelete={fetchDigests}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                    />
                </div>
            </div>
        </>
    );
}
