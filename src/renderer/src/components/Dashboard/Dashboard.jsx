import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    getDashboardData,
    requestEntityAccess,
} from '../../services/dashboardService/dashboardService';
import useAuth from '../../hooks/useAuth/useAuth';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import NavbarButton from '../NavbarButton/NavbarButton';
import { TaskList, Trash } from 'iconoir-react/regular';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import { deleteEntry } from '../../services/adminService/adminService';
import NotFound from '../NotFound/NotFound';
import pluralize from 'pluralize';
import {
    renderDashboardSection,
    renderDashboardSectionWithInaccessibleEntries,
} from '../../utils/dashboardUtils/dashboardUtils';
import { Search } from 'iconoir-react';
import NotesList from '../NotesList/NotesList';

/**
 * Dashboard component
 * Fetches and displays the dashboard data for an entry
 * If the entry does not exist, displays a 404 page
 * The dashboard displays the entry's name, type, description, related actors, entities, artifacts, metadata, and notes
 * The dashboard only displays the fields provided by the server, different entries may have different fields
 * If the user is an admin, a delete button is displayed in the navbar
 * If the user is not in publish mode, a button to enter publish mode is displayed in the navbar
 * If the entry is linked to entities to which the user does not have access to, a button to request access to view them is displayed
 * If the entry is an artifact, a button to search the artifact name on VirusTotal is displayed
 *
 * @function Dashboard
 * @returns {Dashboard}
 * @constructor
 */
export default function Dashboard() {
    const location = useLocation();
    const path = location.pathname + location.search;
    const [entryMissing, setEntryMissing] = useState(false);
    const [contentObject, setContentObject] = useState({});
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [virusTotalDialog, setVirusTotalDialog] = useState(false);
    const [searchFilters, setSearchFilters] = useState({
        content: '',
        author__username: '',
    });
    const [submittedFilters, setSubmittedFilters] = useState({
        content: '',
        author__username: '',
    });
    const navigate = useNavigate();
    const auth = useAuth();
    const dashboard = useRef(null);

    // On load, fetch the dashboard data for the entry
    useEffect(() => {
        setEntryMissing(false);
        setAlert('');

        // Populate dashboard
        getDashboardData(path)
            .then((response) => {
                setContentObject(response.data);

                setSearchFilters((prev) => ({
                    ...prev,
                    ['references']: response.data.id,
                }));
                setSubmittedFilters((prev) => ({
                    ...prev,
                    ['references']: response.data.id,
                }));
                dashboard.current.scrollTo(0, 0);
            })
            .catch((err) => {
                setContentObject({});
                if (err.response && err.response.status === 404) {
                    setEntryMissing(true);
                } else {
                    const errHandler = displayError(setAlert, navigate);
                    errHandler(err);
                }
            });
    }, [location, path, setAlert, setEntryMissing, setContentObject]);

    const handleEnterPublishMode = useCallback(() => {
        const publishableNotes = contentObject.notes.filter((note) => note.publishable);
        if (publishableNotes.length === 0) {
            setAlert({
                show: true,
                message: 'There are no publishable notes available.',
                color: 'red',
            });
            return;
        }
        navigate(`/notes`, { state: contentObject });
    }, [navigate, contentObject, setAlert]);

    const handleDelete = () => {
        deleteEntry(`entries/${pluralize(contentObject.type)}`, contentObject.id)
            .then((response) => {
                if (response.status === 200) {
                    navigate('/');
                }
            })
            .catch(displayError(setAlert, navigate));
    };

    const navbarContents = [
        // If the user is an admin and the dashboard is not for an artifact, add a delete button to the navbar
        auth.isAdmin && contentObject.type !== 'artifact' && (
            <NavbarButton
                key='delete-entry-btn'
                icon={<Trash />}
                text='Delete'
                onClick={() => setDeleteDialog(true)}
                data-testid='delete-entry-btn'
            />
        ),

        // A button to enter publish mode. Here the user can choose which notes they want to view in the publish preview
        // This is only visible while the user is not in publish preview mode
        <NavbarButton
            key='publish-mode-btn'
            icon={<TaskList />}
            text='Enter Publish Mode'
            data-testid='publish-mode-btn'
            onClick={handleEnterPublishMode}
        />,
    ];
    useNavbarContents(!entryMissing && navbarContents, [
        contentObject,
        location,
        auth.isAdmin,
        entryMissing,
        handleEnterPublishMode,
        setDeleteDialog,
    ]);

    const handleRequestEntityAccess = (entities) => {
        Promise.all(entities.map((c) => requestEntityAccess(c.id)))
            .then(() =>
                setAlert({
                    show: true,
                    message: 'Access request sent successfully',
                    color: 'green',
                }),
            )
            .catch(displayError(setAlert, navigate));
    };

    const handleVirusTotalSearch = (name) => {
        window.open(`https://www.virustotal.com/gui/search/${name}`);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setSubmittedFilters(searchFilters);
    };

    const handleSearchChange = (e) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({ ...prev, [name]: value }));
    };

    if (entryMissing) {
        return (
            <NotFound
                message={
                    'The entry you are looking for does not exist or you do not have access to it. If you believe the entry exists contact an administrator for access.'
                }
            />
        );
    }

    return (
        <>
            <ConfirmationDialog
                open={deleteDialog}
                setOpen={setDeleteDialog}
                title={'Confirm Deletion'}
                description={'This is permanent'}
                handleConfirm={handleDelete}
            />
            <ConfirmationDialog
                open={virusTotalDialog}
                setOpen={setVirusTotalDialog}
                title={'Notice'}
                description={
                    'This action will send data about this artifact to VirusTotal. Are you sure you want to proceed?'
                }
                handleConfirm={() => handleVirusTotalSearch(contentObject.name)}
            />
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div
                className='w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-scroll'
                ref={dashboard}
            >
                <div className='w-[95%] h-full flex flex-col p-6 space-y-3'>
                    {contentObject.name && (
                        <h1 className='text-5xl font-bold w-full break-all'>
                            {contentObject.type && (
                                <span className='text-4xl text-zinc-500'>{`${contentObject.subtype ? contentObject.subtype : contentObject.type}: `}</span>
                            )}
                            {contentObject.name}
                        </h1>
                    )}
                    {contentObject.description && (
                        <p className='text-sm text-zinc-400'>{`Description: ${contentObject.description}`}</p>
                    )}
                    {contentObject.type && contentObject.type === 'artifact' && (
                        <div className='flex flex-row space-x-2 flex-wrap'>
                            <button
                                className='btn w-fit min-w-[200px] mt-2 gap-2 !pl-4'
                                onClick={() => setVirusTotalDialog(true)}
                            >
                                <Search />
                                Search on VirusTotal
                            </button>
                        </div>
                    )}

                    {renderDashboardSection(contentObject.actors, 'Related Actors')}

                    {renderDashboardSectionWithInaccessibleEntries(
                        contentObject.entities,
                        contentObject.inaccessible_entities,
                        'Related Entities',
                        'There are inaccessible entities linked to this entry. ',
                        'Request access to view them.',
                        handleRequestEntityAccess,
                    )}

                    {renderDashboardSection(
                        contentObject.artifacts,
                        'Related Artifacts',
                    )}

                    {renderDashboardSection(contentObject.metadata, 'Metadata')}

                    {contentObject.second_hop_entities &&
                        renderDashboardSectionWithInaccessibleEntries(
                            contentObject.second_hop_entities,
                            contentObject.second_hop_inaccessible_entities,
                            'Second Degree Relationships',
                            'There are inaccessible entries linked to this entry. ',
                            'Request access to view them.',
                            handleRequestEntityAccess,
                        )}

                    {contentObject.id && contentObject.notes && (
                        <div className='bg-cradle3 p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col flex-1'>
                            <h2 className='text-xl font-semibold mb-2'>Notes</h2>

                            <div className=''>
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
                            </div>

                            <NotesList query={submittedFilters} />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
