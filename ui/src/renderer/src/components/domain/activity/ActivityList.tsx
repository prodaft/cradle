import { Button } from '@/components/ui/button';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import Datepicker from '@components/base/Datepicker/Datepicker';
import Pagination from '@/components/base/Pagination/Pagination';
import type { EventLog } from '@services/cradle/models';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import { Search } from 'iconoir-react';
import { useMemo, useState } from 'react';
import OfflineIndicator from '../../feedback/OfflineIndicator';
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
    const params = useParams({ strict: false });
    const usernameParam = (params as any).username;
    const effectiveUsername = username || usernameParam || '';

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

    const [page, setPage] = useState(1);

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

    // Prepare query parameters
    const queryParams = useMemo(
        () => ({
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
        }),
        [page, submittedFilters],
    );

    // Query for activity logs
    const {
        data: logsData,
        isPending,
        isPaused,
    } = useQuery({
        queryKey: queryKeys.activity.list({
            name: submittedFilters.username,
            objectId: submittedFilters.object_id,
            contentType: submittedFilters.content_type,
            username: submittedFilters.username,
        }),
        queryFn: () => logsApi.logsList(queryParams),
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch event logs. Please try again.',
        },
    });

    // Convert EventLog to ActivityLog format
    const events = useMemo(() => {
        if (!logsData?.results) return [];
        return logsData.results.map(convertEventLogToActivityLog);
    }, [logsData?.results]);

    const totalPages = logsData?.totalPages || 1;
    const loading = isPending && !isPaused;

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

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
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>Event Logs</h2>
                    <p className='text-muted-foreground'>
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
                            <InputGroup>
                                <InputGroupAddon align='inline-start'>
                                    <Search />
                                </InputGroupAddon>
                                <InputGroupInput
                                    type='text'
                                    id='username'
                                    name='username'
                                    value={searchFilters.username}
                                    onChange={handleSearchChange}
                                    placeholder='Search by username...'
                                />
                            </InputGroup>
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
                                className='h-10 rounded-full py-1 px-4 text-sm w-full max-w-full font-mono'
                            />
                        </div>

                        {/* Type selector */}
                        <div className='flex-1 min-w-[140px]'>
                            <Select
                                value={searchFilters.type || 'any'}
                                onValueChange={(value) => {
                                    setSearchFilters((prev) => ({
                                        ...prev,
                                        type: value === 'any' ? '' : value,
                                    }));
                                }}
                            >
                                <SelectTrigger className='w-full font-mono'>
                                    <SelectValue placeholder='Any Type' />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='any'>Any Type</SelectItem>
                                    <SelectItem value='create'>Create</SelectItem>
                                    <SelectItem value='edit'>Edit</SelectItem>
                                    <SelectItem value='delete'>Delete</SelectItem>
                                    <SelectItem value='fetch'>Fetch</SelectItem>
                                    <SelectItem value='login'>Login</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search button */}
                        <div className='flex-shrink-0'>
                            <Button type='submit' variant='outline' size='sm'>
                                <Search /> Search
                            </Button>
                        </div>
                    </form>

                    <div className='flex flex-col space-y-4'>
                        {isPaused && <OfflineIndicator />}

                        {loading ? (
                            <div className='flex items-center justify-center min-h-[200px]'>
                                <Spinner className='size-10' />
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
                                <p className='text-sm font-normal text-muted-foreground'>
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
