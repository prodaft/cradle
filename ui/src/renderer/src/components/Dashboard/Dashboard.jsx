import pluralize from 'pluralize';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { deleteEntry } from '../../services/adminService/adminService';
import {
    enrichEntry,
    getEnrichmentTechniques,
} from '../../services/dashboardService/dashboardService';
import { queryEntries } from '../../services/queryService/queryService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import ActionConfirmationModal from '../Modals/ActionConfirmationModal.jsx';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';
import NotFound from '../NotFound/NotFound';
import { Tab, Tabs } from '../Tabs/Tabs';
import Files from './Files.jsx';
import Notes from './Notes';
import Relations from './Relations';

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
    const { navigate, navigateLink } = useCradleNavigate();
    const { profile, isAdmin } = useProfile();
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
                className='w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-hidden'
                ref={dashboard}
            >
                {contentObject == null ? (
                    <div className='flex items-center justify-center h-full'>
                        <div className='spinner-dot-pulse spinner-xl'>
                            <div className='spinner-pulse-dot'></div>
                        </div>
                    </div>
                ) : (
                    <div className='w-[95%] h-full flex flex-col p-6 space-y-4'>
                        {contentObject.name && (
                            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4'>
                                <div>
                                    <h1 className='text-3xl font-medium break-all cradle-text-primary cradle-mono tracking-tight'>
                                        {contentObject.type && (
                                            <span className='cradle-text-tertiary text-2xl mr-2'>{`${contentObject.subtype ? contentObject.subtype : contentObject.type}:`}</span>
                                        )}
                                        {contentObject.name}
                                    </h1>
                                    {contentObject.description && (
                                        <p className='text-sm cradle-text-secondary mt-2 cradle-mono'>
                                            {contentObject.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                        {contentObject.id && (
                            <div className='cradle-card'>
                                <Tabs
                                    defaultTab={0}
                                    queryParam={'tab'}
                                    tabClasses='tabs-underline w-full'
                                    perTabClass='w-[33%] justify-center'
                                >
                                    <Tab title='Notes' classes='pt-4'>
                                        <Notes setAlert={setAlert} obj={contentObject} />
                                    </Tab>
                                    <Tab title='Relations' classes='pt-4'>
                                        <Relations obj={contentObject} />
                                    </Tab>
                                    <Tab title='Files' classes='pt-4'>
                                        <Files obj={contentObject} setAlert={setAlert} />
                                    </Tab>
                                </Tabs>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className='w-full h-8' />
        </>
    );
}
