import { Search } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Datepicker from 'react-tailwindcss-datepicker';
import DeleteNote from '../NoteActions/DeleteNote';
import Publishable from '../NoteActions/Publishable';
import NotesList from '../NotesList/NotesList';

/**
 * Notes component
 * Allows the user to search through all notes they have access to
 * Provides search filters for content and author
 * Fetches notes based on the provided search filters
 *
 * @function Notes
 * @returns {Notes}
 * @constructor
 */
export default function Notes({ setAlert }) {
    const [searchParams, setSearchParams] = useSearchParams();

    const [searchFilters, setSearchFilters] = useState({
        page_size: 50,
        content: searchParams.get('content') || '',
        author__username: searchParams.get('author__username') || '',
    });

    const [submittedFilters, setSubmittedFilters] = useState(null);

    const [dateRange, setDateRange] = useState({
        startDate: searchParams.get('timestamp_gte') || null,
        endDate: searchParams.get('timestamp_lte') || null,
    });

    const updateSearchParams = (filters, dateRangeValue) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('content', filters.content);
        newParams.set('author__username', filters.author__username);

        // Add date range parameters if they exist
        if (dateRangeValue.startDate) {
            newParams.set(
                'timestamp_gte',
                new Date(dateRangeValue.startDate).toISOString(),
            );
        } else {
            newParams.delete('timestamp_gte');
        }

        if (dateRangeValue.endDate) {
            // Set end date to end of day
            const endDate = new Date(dateRangeValue.endDate);
            endDate.setHours(23, 59, 59, 999);
            newParams.set('timestamp_lte', endDate.toISOString());
        } else {
            newParams.delete('timestamp_lte');
        }

        setSearchParams(newParams, { replace: true });

        setSubmittedFilters({
            ...filters,
            timestamp_gte: dateRangeValue.startDate
                ? new Date(dateRangeValue.startDate).toISOString()
                : '',
            timestamp_lte: dateRangeValue.endDate
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
        updateSearchParams(searchFilters, dateRange);
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        updateSearchParams(searchFilters, dateRange);
    };

    const handleSearchChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSearchFilters((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleDateRangeChange = (value) => {
        setDateRange(value);
    };

    useEffect(() => {
        const initialFilters = {
            content: searchParams.get('content') || '',
            author__username: searchParams.get('author__username') || '',
        };

        const initialDateRange = {
            startDate: searchParams.get('timestamp_gte')
                ? new Date(searchParams.get('timestamp_gte'))
                    .toISOString()
                    .split('T')[0]
                : null,
            endDate: searchParams.get('timestamp_lte')
                ? new Date(searchParams.get('timestamp_lte'))
                    .toISOString()
                    .split('T')[0]
                : null,
        };

        setSearchFilters(initialFilters);
        setDateRange(initialDateRange);
    }, []);

    return (
        <div className='w-full h-full flex flex-col space-y-3'>
            <div className='flex justify-between items-center w-full border-b border-gray-700 px-4 pb-3'>
                <h1 className='text-4xl font-bold w-full break-all'>All Notes</h1>
            </div>
            <form onSubmit={handleSearchSubmit} className='flex space-x-4 px-3 pb-2'>
                <Datepicker
                    value={dateRange}
                    onChange={handleDateRangeChange}
                    inputClassName='input input-block py-1 px-2 text-sm flex-grow !max-w-full w-full'
                    containerClassName='w-full text-gray-700'
                    toggleClassName='hidden'
                />

                <input
                    type='text'
                    name='content'
                    value={searchFilters.content}
                    onChange={handleSearchChange}
                    placeholder='Search by content'
                    className='input !max-w-full w-full'
                />
                <input
                    type='text'
                    name='author__username'
                    value={searchFilters.author__username}
                    onChange={handleSearchChange}
                    placeholder='Search by author'
                    className='input !max-w-full w-full'
                />
                <button type='submit' className='btn w-1/2'>
                    <Search /> Search
                </button>
            </form>

            {submittedFilters && (
                <NotesList
                    query={submittedFilters}
                    noteActions={[
                        { Component: Publishable, props: { setAlert } },
                        { Component: DeleteNote, props: { setAlert } },
                    ]}
                />
            )}
        </div>
    );
}
