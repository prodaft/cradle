import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    getDashboardData,
    getSecondHopData,
    requestEntityAccess,
} from '../../services/dashboardService/dashboardService';
import useAuth from '../../hooks/useAuth/useAuth';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import NavbarButton from '../NavbarButton/NavbarButton';
import { TaskList, Trash } from 'iconoir-react/regular';
import { Graph } from '@phosphor-icons/react';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import { deleteEntry } from '../../services/adminService/adminService';
import NotFound from '../NotFound/NotFound';
import pluralize from 'pluralize';
import {
    createDashboardLink,
    renderDashboardSection,
    renderDashboardSectionWithInaccessibleEntries,
    SubtypeHierarchy,
} from '../../utils/dashboardUtils/dashboardUtils';
import { Search } from 'iconoir-react';
import NotesList from '../NotesList/NotesList';
import { queryEntries } from '../../services/queryService/queryService';
import Publishable from '../NoteActions/Publishable';
import { Tabs, Tab } from '../Tabs/Tabs';
import DeleteNote from '../NoteActions/DeleteNote';
import Datepicker from 'react-tailwindcss-datepicker';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';

export default function Notes({ setAlert, obj }) {
    const [searchFilters, setSearchFilters] = useState({
        content: '',
        author__username: '',
    });
    const [linked_to_exact_match, setLinkedToExactMatch] = useState(false);
    const [submittedFilters, setSubmittedFilters] = useState(null);
    const [dateRange, setDateRange] = useState({
        startDate: null,
        endDate: null,
    });

    // On load, fetch the dashboard data for the entry
    useEffect(() => {
        if (!obj) return;
        setSearchFilters((prev) => ({
            ...prev,
            ['linked_to']: obj.id,
            linked_to_exact_match,
        }));

        setSubmittedFilters({
            ...searchFilters,
            ['linked_to']: obj.id,
            linked_to_exact_match,
            timestamp_gte: '',
            timestamp_lte: '',
        });
    }, [setAlert, obj, linked_to_exact_match]);

    // Auto-submit when date range changes
    useEffect(() => {
        if (searchFilters.linked_to) {
            setSubmittedFilters(searchFilters);
        }
    }, [searchFilters.timestamp_gte, searchFilters.timestamp_lte]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setSubmittedFilters(searchFilters);
    };

    const handleSearchChange = (e) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleDateRangeChange = (value) => {
        setSearchFilters((prev) => ({
            ...prev,
            timestamp_gte: value.startDate
                ? new Date(value.startDate).toISOString()
                : '',
            timestamp_lte: value.endDate
                ? (() => {
                      const endDate = new Date(value.endDate);
                      endDate.setHours(23, 59, 59, 999);
                      return endDate.toISOString();
                  })()
                : '',
        }));
        setDateRange(value);
    };

    return (
        <>
            <div className='bg-cradle3 p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col flex-1'>
                <div className='flex flex-col space-y-4'>
                    <form
                        onSubmit={handleSearchSubmit}
                        className='flex space-x-4 px-3 pb-2'
                    >
                        <Datepicker
                            value={dateRange}
                            onChange={handleDateRangeChange}
                            inputClassName='input input-block py-1 px-2 text-sm flex-grow !max-w-full w-full'
                            toggleClassName='hidden'
                        />
                        <input
                            type='text'
                            name='content'
                            value={searchFilters.content}
                            onChange={handleSearchChange}
                            placeholder='Search by content'
                            className='input input-block'
                        />
                        <input
                            type='text'
                            name='author__username'
                            value={searchFilters.author__username}
                            onChange={handleSearchChange}
                            placeholder='Search by author'
                            className='input input-block'
                        />
                        <div className='flex items-center space-x-2'>
                            <button type='submit' className='btn'>
                                <Search /> Search
                            </button>
                            {obj.type == 'entity' && (
                                <div className='flex items-center'>
                                    <input
                                        type='checkbox'
                                        id='searchOption'
                                        name='searchOption'
                                        className='switch switch-ghost-primary h-5 w-14'
                                        checked={linked_to_exact_match}
                                        onChange={(e) =>
                                            setLinkedToExactMatch(e.target.checked)
                                        }
                                    />
                                    <label
                                        htmlFor='searchOption'
                                        className='ml-2 text-sm'
                                    >
                                        Exact match
                                    </label>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
                {submittedFilters && (
                    <NotesList
                        query={submittedFilters}
                        noteActions={[
                            { Component: Publishable, props: {} },
                            { Component: DeleteNote, props: { setAlert } },
                        ]}
                    />
                )}
            </div>
        </>
    );
}
