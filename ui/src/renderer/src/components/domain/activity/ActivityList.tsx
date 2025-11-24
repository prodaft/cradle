import { format, parseISO } from 'date-fns';
import dayjs from 'dayjs';
import { Search } from 'iconoir-react';
import { useCallback, useEffect, useState } from 'react';
import Datepicker from 'react-tailwindcss-datepicker';
import { useTabContext } from '@/hooks/tabs/useTabContext';
import { useNotif } from '@/contexts/ui/NotificationContext';
import useApi from '@/hooks/api/useApi';
import type { EventLog } from '@/services/cradle/models';
import Activity from './Activity';
import Pagination from '@components/base/Pagination/Pagination';

// Use EventLog from generated models as ActivityLog
type ActivityLog = EventLog;

interface SearchFilters {
    username: string;
    start_date: string;
    end_date: string;
    type: string;
    content_type?: string;
    object_id?: string;
}

interface ActivityListProps {
    name?: string;
    objectId?: string;
    content_type?: string;
    username?: string;
}

export default function ActivityList({ name, objectId, content_type, username }: ActivityListProps) {
    const { logsApi } = useApi();
    const { params } = useTabContext();
    const effectiveUsername = username || params.username || '';

    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        username: effectiveUsername,
        start_date: dayjs(0).format('YYYY-MM-DDTHH:mm'),
        end_date: dayjs().format('YYYY-MM-DDTHH:mm'),
        type: '',
        content_type: content_type,
        object_id: objectId,
    });

    const [submittedFilters, setSubmittedFilters] = useState<SearchFilters>(searchFilters);

    const [events, setEvents] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const { notify } = useNotif();

    const fetchEvents = useCallback(() => {
        setLoading(true);
        logsApi.logsList({
            page,
            username: submittedFilters.username || undefined,
            startDate: submittedFilters.start_date ? new Date(submittedFilters.start_date) : undefined,
            endDate: submittedFilters.end_date ? new Date(submittedFilters.end_date) : undefined,
            type: submittedFilters.type || undefined,
            contentType: submittedFilters.content_type || undefined,
            objectId: submittedFilters.object_id || undefined,
        })
            .then((response) => {
                setEvents(response.results);
                setTotalPages(response.totalPages);
                setLoading(false);
            })
            .catch((error: any) => {
                notify({
                    type: 'error',
                    text: error.response?.data?.detail || 'Failed to fetch event logs. Please try again.',
                });
                setLoading(false);
            });
    }, [page, submittedFilters, logsApi]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    useEffect(() => {
        fetchEvents();
    }, [page, submittedFilters]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSubmittedFilters({ ...searchFilters });
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className='w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-scroll'>
            <div className='w-[95%] h-full flex flex-col p-6 space-y-3'>

                <form
                    onSubmit={handleSearchSubmit}
                    className='flex flex-wrap gap-4 items-end pb-2'
                >
                    <h1 className='text-xl font-bold w-full break-all text-'>
                        Event Logs: <span className='text-zinc-500'>{name}</span>
                    </h1>

                    {/* Username input */}
                    <div className='flex-1 min-w-[180px]'>
                        <input
                            type='text'
                            id='username'
                            name='username'
                            value={searchFilters.username}
                            onChange={handleSearchChange}
                            placeholder='Enter username'
                            className='input w-full max-w-full'
                        />
                    </div>

                    {/* Date range picker */}
                    <div className='flex-1 min-w-[260px]'>
                        <Datepicker
                            value={{
                                startDate: searchFilters.start_date || null,
                                endDate: searchFilters.end_date || null,
                            }}
                            onChange={(value) => {
                                if (value?.startDate && value?.endDate) {
                                    const startDate = value.startDate instanceof Date
                                        ? value.startDate
                                        : new Date(value.startDate as unknown as string);
                                    const endDate = value.endDate instanceof Date
                                        ? value.endDate
                                        : new Date(value.endDate as unknown as string);
                                    setSearchFilters((prev) => ({
                                        ...prev,
                                        start_date: format(startDate, "yyyy-MM-dd'T'HH:mm"),
                                        end_date: format(endDate, "yyyy-MM-dd'T'HH:mm"),
                                    }));
                                }
                            }}
                            inputClassName='input py-1 px-2 text-sm w-full max-w-full'
                            toggleClassName='hidden'
                            showShortcuts={true}
                            showFooter={true}
                            displayFormat='YYYY-MM-DD HH:mm'
                        />
                    </div>

                    {/* Type selector */}
                    <div className='flex-1 min-w-[140px]'>
                        <select
                            name='type'
                            value={searchFilters.type}
                            onChange={handleSearchChange}
                            className='input w-full max-w-full'
                        >
                            <option value=''>Any</option>
                            <option value='create'>Create</option>
                            <option value='edit'>Edit</option>
                            <option value='delete'>Delete</option>
                            <option value='fetch'>Fetch</option>
                            <option value='login'>Login</option>
                        </select>
                    </div>

                    {/* Search button */}
                    <div className='flex-shrink-0'>
                        <button type='submit' className='btn flex items-center w-fit'>
                            <Search className='mr-2 text-cradle2' /> Search
                        </button>
                    </div>
                </form>

                <div className='flex flex-col space-y-4'>
                    {loading ? (
                        <div className='flex items-center justify-center min-h-[200px]'>
                            <div className='spinner-dot-pulse spinner-xl'>
                                <div className='spinner-pulse-dot'></div>
                            </div>
                        </div>
                    ) : events.length > 0 ? (
                        <div>
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />

                            <div className='events-list'>
                                {events.map((event, index) => (
                                    <Activity log={event} key={index} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className='container mx-auto flex flex-col items-center'>
                            <p className='mt-6 text-sm font-normal text-zinc-500'>
                                No event logs found!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
