import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
    enrichEntry,
    getEnrichmentTechniques,
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
import { queryEntries } from '../../services/queryService/queryService';
import { Tabs, Tab } from '../Tabs/Tabs';
import Notes from './Notes';
import Relations from './Relations';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';
import ActionConfirmationModal from '../Modals/ActionConfirmationModal.jsx';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { SparksSolid } from 'iconoir-react';
import NavbarDropdown from '../NavbarDropdown/NavbarDropdown.jsx';

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
    const { subtype } = useParams();
    const { name } = useParams();
    const [entryMissing, setEntryMissing] = useState(false);
    const [contentObject, setContentObject] = useState(null);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [enrichers, setEnrichers] = useState([]);
    const navigate = useNavigate();
    const auth = useAuth();
    const dashboard = useRef(null);

    const { setModal } = useModal();

    // On load, fetch the dashboard data for the entry
    useEffect(() => {
        setEntryMissing(false);
        setAlert('');
        setContentObject(null);
        queryEntries({ subtype, name_exact: name }).then((response) => {
            if (response.data.count != 1) {
                setEntryMissing(true);
                return;
            }
            let obj = response.data.results[0];

            dashboard.current.scrollTo(0, 0);
            setContentObject(obj);
        });
    }, [subtype, name, setAlert, setEntryMissing, setContentObject]);

    useEffect(() => {
        if (contentObject == null) return;
        getEnrichmentTechniques(contentObject.id)
            .then((response) => {
                if (response.status === 200) {
                    setEnrichers(response.data);
                }
            })
            .catch((error) => {
                displayError(setAlert, navigate)(error);
            });
    }, [contentObject?.id]);

    const handleDelete = () => {
        deleteEntry(`entries/${pluralize(contentObject.type)}`, contentObject.id)
            .then((response) => {
                if (response.status === 200) {
                    navigate('/');
                }
            })
            .catch(displayError(setAlert, navigate));
    };

    const handleEnrich = (id, enrichId) => () => {
        enrichEntry(id, enrichId).then((response) => {
            if (response.status === 200) {
                setAlert({
                    show: true,
                    message: response.data.message,
                    color: 'green',
                });
            }
        });
    };

    const navbarContents = () => [
        // Add graph visualization button
        enrichers.length > 0 && contentObject?.id && (
            <NavbarDropdown
                key='-enrich'
                icon={<SparksSolid />}
                text={'Enrich'}
                contents={enrichers.map((option) => ({
                    label: option.name,
                    handler: () =>
                        setModal(ActionConfirmationModal, {
                            text: `Are you sure you want to enrich this entry with ${option.name}? Results will be visible to everyone.`,
                            onConfirm: handleEnrich(contentObject.id, option.id),
                        }),
                }))}
            />
        ),
        <NavbarButton
            key='view-graph-btn'
            icon={<Graph height={24} width={24} />}
            text='Explore in Graph'
            onClick={() =>
                navigate(
                    `/knowledge-graph?&pf_src={"value": "${contentObject.id}", "label": "${contentObject.name}"}&pgf_src={"value": "${contentObject.id}", "label": "${contentObject.name}"}`,
                )
            }
            data-testid='view-graph-btn'
        />,

        // If the user is an admin and the dashboard is not for an artifact, add a delete button to the navbar
        auth.isAdmin() && contentObject && contentObject.type !== 'artifact' && (
            <NavbarButton
                key='delete-entry-btn'
                icon={<Trash />}
                text='Delete'
                onClick={() =>
                    setModal(ConfirmDeletionModal, {
                        text: `Are you sure you want to delete this entity? This action is irreversible.`,
                        onConfirm: handleDelete,
                        confirmText: `${contentObject.subtype}:${contentObject.name}`,
                    })
                }
                data-testid='delete-entry-btn'
            />
        ),
    ];
    useNavbarContents(!entryMissing && navbarContents, [
        contentObject,
        enrichers,
        location,
        auth.isAdmin(),
        entryMissing,
    ]);

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
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div
                className='w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-scroll'
                ref={dashboard}
            >
                {contentObject == null ? (
                    <div className='flex items-center justify-center h-full'>
                        <div className='spinner-dot-pulse spinner-xl'>
                            <div className='spinner-pulse-dot'></div>
                        </div>
                    </div>
                ) : (
                    <div className='w-[95%] h-full flex flex-col p-6 space-y-3 '>
                        {contentObject.name && (
                            <div className="flex justify-between items-center w-full border-b border-gray-700 px-4 pb-3">
                                <h1 className='text-5xl font-bold break-all'>
                                    {contentObject.type && (
                                        <span className='text-4xl text-zinc-500'>{`${contentObject.subtype ? contentObject.subtype : contentObject.type}: `}</span>
                                    )}
                                    {contentObject.name}
                                </h1>
                            </div>
                        )}
                        {contentObject.description && (
                            <p className='text-sm text-zinc-400'>{`Description: ${contentObject.description}`}</p>
                        )}
                        {contentObject.id && (
                            <Tabs
                                defaultTab={0}
                                queryParam={'tab'}
                                tabClasses='tabs-underline w-full'
                                perTabClass='w-[50%] justify-center'
                            >
                                <Tab title='Notes' classes='pt-2'>
                                    <Notes 
                                        setAlert={setAlert} 
                                        obj={contentObject}
                                    />
                                </Tab>
                                <Tab title='Relations' classes='pt-2'>
                                    <Relations obj={contentObject} />
                                </Tab>
                            </Tabs>
                        )}
                    </div>
                )}
            </div>
            <div className='w-full h-8' />
        </>
    );
}
