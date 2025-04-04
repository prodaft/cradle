import { useState, useEffect, useCallback } from 'react';
import { Search } from 'iconoir-react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { useLocation, useParams } from 'react-router-dom';
import { getEventLogs } from '../../services/logService/logService';
import dayjs from 'dayjs';
import Activity from '../Activity/Activity';
import Pagination from '../Pagination/Pagination';

/**
 * ActivityList component
 * Allows an admin to view all activities and search through them
 *
 * @function ActivityList
 * @returns {ActivityList}
 * @constructor
 */
export default function ActivityList() {
    var { username } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const objectId = queryParams.get('object_id');
    const content_type = queryParams.get('content_type');

    const [searchFilters, setSearchFilters] = useState({
        username: username,
        start_date: dayjs(0).format('YYYY-MM-DDTHH:mm'),
        end_date: dayjs().format('YYYY-MM-DDTHH:mm'),
        type: '',
        content_type: content_type,
        object_id: objectId,
    });

    const [submittedFilters, setSubmittedFilters] = useState(searchFilters);

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false); // Existing loading state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    const fetchEvents = useCallback(() => {
        setLoading(true);
        getEventLogs({ page, ...submittedFilters })
            .then((response) => {
                setEvents(response.data.results);
                setTotalPages(response.data.total_pages);
                setLoading(false);
            })
            .catch((error) => {
                setAlert({
                    show: true,
                    message: 'Failed to fetch event logs. Please try again.',
                    color: 'red',
                });
                setLoading(false);
            });
    }, [page, submittedFilters]);

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    useEffect(() => {
        fetchEvents();
    }, [page, submittedFilters]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        setSubmittedFilters({
            ...searchFilters,
        });
    };

    const handleSearchChange = (e) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className='w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-scroll'>
            <div className='w-[95%] h-full flex flex-col p-6 space-y-3'>
                <AlertDismissible alert={alert} setAlert={setAlert} />

                <h1 className='text-5xl font-bold w-full break-all pb-2'>
                    Search Event Logs
                </h1>

                <form
                    onSubmit={handleSearchSubmit}
                    className='flex space-x-4 px-3 pb-2'
                >
                    <input
                        type='text'
                        id='username'
                        name='username'
                        value={searchFilters.username}
                        onChange={handleSearchChange}
                        placeholder='Enter username'
                        className='input !max-w-full w-full'
                    />

                    <input
                        type='datetime-local'
                        id='start_date'
                        name='start_date'
                        value={searchFilters.start_date}
                        onChange={handleSearchChange}
                        className='input !max-w-full w-full'
                    />

                    <input
                        type='datetime-local'
                        id='end_date'
                        name='end_date'
                        value={searchFilters.end_date}
                        onChange={handleSearchChange}
                        className='input !max-w-full w-full'
                    />

                    <select
                        name='type'
                        value={searchFilters.type}
                        onChange={handleSearchChange}
                        className='input !max-w-full w-full'
                    >
                        <option value=''>Any</option>
                        <option value='create'>Create</option>
                        <option value='edit'>Edit</option>
                        <option value='delete'>Delete</option>
                        <option value='fetch'>Fetch</option>
                        <option value='login'>Login</option>
                    </select>

                    <button type='submit' className='btn w-1/2'>
                        <Search /> Search
                    </button>
                </form>

                <div className='flex flex-col space-y-4'>
                    {loading ? (
                        // Loading spinner
                        <div className='flex items-center justify-center min-h-[200px]'>
                            <div className='spinner-dot-pulse spinner-xl'>
                                <div className='spinner-pulse-dot'></div>
                            </div>
                        </div>
                    ) : events.length > 0 ? (
                        <div>
                            <div className='events-list'>
                                {events.map((event, index) => (
                                    <Activity log={event} key={index} />
                                ))}
                            </div>

                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    ) : (
                        <div className='container mx-auto flex flex-col items-center'>
                            <p className='mt-6 !text-sm !font-normal text-zinc-500'>
                                No event logs found!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
