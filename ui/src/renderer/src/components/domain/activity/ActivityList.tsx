import { useNotif } from '@/contexts/ui/NotificationContext';
import useApi from '@/hooks/api/useApi';
import { useTabContext } from '@/hooks/tabs/useTabContext';
import Datepicker from '@components/base/Datepicker/Datepicker';
import Pagination from '@components/base/Pagination/Pagination';
import type { EventLog } from '@services/cradle/models';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import { Search } from 'iconoir-react';
import { useCallback, useEffect, useState } from 'react';
import Activity from './Activity';

// Local ActivityLog interface to match Activity component expectations
interface ActivityLog {
    timestamp: string;
    type: string;
    user: {
        username: string;
    };
    objectRepr: string;
    details?: string;
    srcLog?: ActivityLog;
    src_log?: ActivityLog;
}

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

export default function ActivityList({
    name,
    objectId,
    content_type,
    username,
}: ActivityListProps) {
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

    const [submittedFilters, setSubmittedFilters] =
        useState<SearchFilters>(searchFilters);

    const [events, setEvents] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const { notify } = useNotif();

    // Convert EventLog to ActivityLog format
    const convertEventLogToActivityLog = (eventLog: EventLog): ActivityLog => {
        return {
            timestamp: eventLog.timestamp?.toISOString() || new Date().toISOString(),
            type: eventLog.type,
            user: {
                username: eventLog.user.username || 'unknown',
            },
            objectRepr: eventLog.objectRepr || '',
            details: eventLog.details || undefined,
            srcLog: eventLog.srcLog
                ? convertEventLogToActivityLog(eventLog.srcLog as any)
                : undefined,
            src_log: eventLog.srcLog
                ? convertEventLogToActivityLog(eventLog.srcLog as any)
                : undefined,
        };
    };

    const fetchEvents = useCallback(() => {
        setLoading(true);
        logsApi
            .logsList({
                page,
                username: submittedFilters.username || undefined,
                startDate: submittedFilters.start_date
                    ? new Date(submittedFilters.start_date)
                    : undefined,
                endDate: submittedFilters.end_date
                    ? new Date(submittedFilters.end_date)
                    : undefined,
                type: submittedFilters.type || undefined,
                contentType: submittedFilters.content_type || undefined,
                objectId: submittedFilters.object_id || undefined,
            })
            .then((response) => {
                const convertedEvents = response.results.map(
                    convertEventLogToActivityLog,
                );
                setEvents(convertedEvents);
                setTotalPages(response.totalPages);
                setLoading(false);
            })
            .catch((error: any) => {
                notify({
                    type: 'error',
                    text:
                        error.response?.data?.detail ||
                        'Failed to fetch event logs. Please try again.',
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

    const handleSearchChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className='w-full h-full overflow-auto'>
            {/* Page Header */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        Event Logs
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                        {name ? `Activity for ${name}` : 'System Activity'}
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full flex flex-col space-y-3'>
                    <form
                        onSubmit={handleSearchSubmit}
                        className='flex flex-wrap gap-4 items-end pb-4'
                    >
                        {/* Username input - Search Bar Style */}
                        <div className='flex-1 min-w-[200px]'>
                            <div className='flex items-center gap-2 w-full bg-cradle-bg-elevated border border-cradle-border-accent h-10 px-2 rounded-full focus-within:border-cradle-accent-primary transition-colors'>
                                <Search className='w-4 h-4 text-cradle-text-muted flex-shrink-0' />
                                <input
                                    type='text'
                                    id='username'
                                    name='username'
                                    value={searchFilters.username}
                                    onChange={handleSearchChange}
                                    placeholder='Search by username...'
                                    className='flex-grow bg-transparent text-sm outline-none text-cradle-text-primary placeholder:text-cradle-text-muted rounded-none font-mono min-w-0'
                                />
                            </div>
                        </div>

                        {/* Date range picker */}
                        <div className='flex-1 min-w-[320px]'>
                            <Datepicker
                                startDate={
                                    searchFilters.start_date
                                        ? new Date(searchFilters.start_date)
                                        : null
                                }
                                endDate={
                                    searchFilters.end_date
                                        ? new Date(searchFilters.end_date)
                                        : null
                                }
                                onChange={([start, end]) => {
                                    setSearchFilters((prev) => ({
                                        ...prev,
                                        start_date: start
                                            ? format(start, "yyyy-MM-dd'T'HH:mm")
                                            : '',
                                        end_date: end
                                            ? format(end, "yyyy-MM-dd'T'HH:mm")
                                            : '',
                                    }));
                                }}
                                className='cradle-input h-10 rounded-full py-1 px-4 text-sm w-full max-w-full font-mono'
                            />
                        </div>

                        {/* Type selector */}
                        <div className='flex-1 min-w-[140px]'>
                            <select
                                name='type'
                                value={searchFilters.type}
                                onChange={handleSearchChange}
                                className='cradle-input h-10 rounded-full w-full max-w-full px-4 text-sm font-mono'
                            >
                                <option value=''>Any Type</option>
                                <option value='create'>Create</option>
                                <option value='edit'>Edit</option>
                                <option value='delete'>Delete</option>
                                <option value='fetch'>Fetch</option>
                                <option value='login'>Login</option>
                            </select>
                        </div>

                        {/* Search button */}
                        <div className='flex-shrink-0'>
                            <button
                                type='submit'
                                className='cradle-btn cradle-btn-primary h-10 rounded-full flex items-center px-6'
                            >
                                <Search className='mr-2 w-4 h-4' /> Search
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

                                <div className='events-list space-y-3 mt-4'>
                                    {events.map((event, index) => (
                                        <Activity log={event} key={index} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className='container mx-auto flex flex-col items-center py-10'>
                                <p className='text-sm font-normal text-cradle-text-muted'>
                                    No event logs found!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
