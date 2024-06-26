import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    getDashboardData,
    requestCaseAccess,
} from '../../services/dashboardService/dashboardService';
import useAuth from '../../hooks/useAuth/useAuth';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import DashboardNote from '../DashboardNote/DashboardNote';
import { displayError } from '../../utils/responseUtils/responseUtils';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import NavbarButton from '../NavbarButton/NavbarButton';
import { TaskList, Trash } from 'iconoir-react/regular';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import { deleteEntity } from '../../services/adminService/adminService';
import NotFound from '../NotFound/NotFound';
import pluralize from 'pluralize';
import {
    renderDashboardSection,
    renderDashboardSectionWithInaccessibleEntities,
} from '../../utils/dashboardUtils/dashboardUtils';
import { Search } from 'iconoir-react';

/**
 * Dashboard component
 * Fetches and displays the dashboard data for an entity
 * If the entity does not exist, displays a 404 page
 * The dashboard displays the entity's name, type, description, related actors, cases, entries, metadata, and notes
 * The dashboard only displays the fields provided by the server, different entities may have different fields
 * If the user is an admin, a delete button is displayed in the navbar
 * If the user is not in publish mode, a button to enter publish mode is displayed in the navbar
 * If the entity is linked to cases to which the user does not have access to, a button to request access to view them is displayed
 * If the entity is an entry, a button to search the entry name on VirusTotal is displayed
 *
 * @function Dashboard
 * @returns {Dashboard}
 * @constructor
 */
export default function Dashboard() {
    const location = useLocation();
    const path = location.pathname + location.search;
    const [entityMissing, setEntityMissing] = useState(false);
    const [contentObject, setContentObject] = useState({});
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [dialog, setDialog] = useState(false);
    const navigate = useNavigate();
    const auth = useAuth();
    const dashboard = useRef(null);

    // On load, fetch the dashboard data for the entity
    useEffect(() => {
        setEntityMissing(false);
        setAlert('');

        // Populate dashboard
        getDashboardData(path)
            .then((response) => {
                setContentObject(response.data);
                dashboard.current.scrollTo(0, 0);
            })
            .catch((err) => {
                setContentObject({});
                if (err.response && err.response.status === 404) {
                    setEntityMissing(true);
                } else {
                    const errHandler = displayError(setAlert, navigate);
                    errHandler(err);
                }
            });
    }, [location, path, setAlert, setEntityMissing, setContentObject]);

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
        deleteEntity(`entities/${pluralize(contentObject.type)}`, contentObject.id)
            .then((response) => {
                if (response.status === 200) {
                    navigate('/');
                }
            })
            .catch(displayError(setAlert, navigate));
    };

    const navbarContents = [
        // If the user is an admin and the dashboard is not for an entry, add a delete button to the navbar
        auth.isAdmin && contentObject.type !== 'entry' && (
            <NavbarButton
                key='delete-entity-btn'
                icon={<Trash />}
                text='Delete'
                onClick={() => setDialog(true)}
                data-testid='delete-entity-btn'
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
    useNavbarContents(!entityMissing && navbarContents, [
        contentObject,
        location,
        auth.isAdmin,
        entityMissing,
        handleEnterPublishMode,
        setDialog,
    ]);

    const handleRequestCaseAccess = (cases) => {
        Promise.all(cases.map((c) => requestCaseAccess(c.id)))
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

    if (entityMissing) {
        return (
            <NotFound
                message={
                    'The entity you are looking for does not exist or you do not have access to it. If you believe the entity exists contact an administrator for access.'
                }
            />
        );
    }

    return (
        <>
            <ConfirmationDialog
                open={dialog}
                setOpen={setDialog}
                title={'Confirm Deletion'}
                description={'This is permanent'}
                handleConfirm={handleDelete}
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
                    {contentObject.type && contentObject.type === 'entry' && (
                        <div className='flex flex-row space-x-2 flex-wrap'>
                            <button
                                className='btn w-fit min-w-[200px] mt-2 gap-2 !pl-4'
                                onClick={() =>
                                    handleVirusTotalSearch(contentObject.name)
                                }
                            >
                                <Search />
                                Search on VirusTotal
                            </button>
                        </div>
                    )}

                    {renderDashboardSection(contentObject.actors, 'Related Actors')}

                    {renderDashboardSectionWithInaccessibleEntities(
                        contentObject.cases,
                        contentObject.inaccessible_cases,
                        'Related Cases',
                        'There are inaccessible cases linked to this entity. ',
                        'Request access to view them.',
                        handleRequestCaseAccess,
                    )}

                    {renderDashboardSection(contentObject.entries, 'Related Entries')}

                    {renderDashboardSection(contentObject.metadata, 'Metadata')}

                    {contentObject.second_hop_cases &&
                        renderDashboardSectionWithInaccessibleEntities(
                            contentObject.second_hop_cases,
                            contentObject.second_hop_inaccessible_cases,
                            'Second Degree Relationships',
                            'There are inaccessible entities linked to this entity. ',
                            'Request access to view them.',
                            handleRequestCaseAccess,
                        )}

                    {contentObject.notes && (
                        <div className='bg-cradle3 p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col flex-1'>
                            <h2 className='text-xl font-semibold mb-2'>Notes</h2>
                            {contentObject.notes.map((note, index) => (
                                <DashboardNote
                                    key={index}
                                    note={note}
                                    setAlert={setAlert}
                                    publishMode={false}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
