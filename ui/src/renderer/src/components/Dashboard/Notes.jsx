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

export default function Notes({ setAlert, obj }) {
    const [searchFilters, setSearchFilters] = useState({
        content: '',
        author__username: '',
    });
    const [linked_to_exact_match, setLinkedToExactMatch] = useState(false);
    const [submittedFilters, setSubmittedFilters] = useState(null);

    // On load, fetch the dashboard data for the entry
    useEffect(() => {
        if (!obj) return;
        setSearchFilters((prev) => ({
            ...prev,
            ['linked_to']: obj.id,
            linked_to_exact_match
        }));

        setSubmittedFilters({ ...searchFilters, ['linked_to']: obj.id, linked_to_exact_match });
    }, [setAlert, obj, linked_to_exact_match]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setSubmittedFilters(searchFilters);
    };

    const handleSearchChange = (e) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({ ...prev, [name]: value }));
    };

    return (
    <>
        <div className='bg-cradle3 p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col flex-1'>
            <div className='flex flex-col space-y-4'>
                <form
                    onSubmit={handleSearchSubmit}
                    className='flex space-x-4 px-3 pb-2'
                >
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
                    <div className="flex items-center space-x-2">
                        <button type='submit' className='btn'>
                            <Search /> Search
                        </button>
                        {obj.type == 'entity' && 
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="searchOption"
                                name="searchOption"
                                className="switch switch-ghost-primary h-5 w-14"
                                checked={linked_to_exact_match}
                                onChange={(e) => setLinkedToExactMatch(e.target.checked)}
                            />
                            <label htmlFor="searchOption" className="ml-2 text-sm">Exact match</label>
                            </div>}
                    </div>
                </form>
            </div>
            {submittedFilters && (
                <NotesList
                    query={{
                        ...submittedFilters,
                    }}
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
