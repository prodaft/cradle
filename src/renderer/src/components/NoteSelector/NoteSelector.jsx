import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import DashboardNote from '../DashboardNote/DashboardNote';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import NavbarButton from '../NavbarButton/NavbarButton';
import { StatsReport, Xmark } from 'iconoir-react/regular';
import { createDashboardLink } from '../../utils/dashboardUtils/dashboardUtils';

/**
 * Displays the notes for an entity.
 * Allows the user to select notes for publishing and to publish the selected notes, which sends them to the publish preview page.
 *
 * @returns {NoteSelector}
 * @constructor
 */
export default function NoteSelector() {
    const location = useLocation();
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
    const dashboard = useRef(null);
    const [selectAll, setSelectAll] = useState(true);

    const { name, type, subtype, description, notes } = location.state || {
        name: '',
        type: '',
        subtype: '',
        description: '',
        notes: [],
    };
    const publishableNoteIds = notes
        ? notes.filter((note) => note.publishable).map((note) => note.id)
        : [];

    const [selectedNoteIds, setSelectedNoteIds] = useState([]);

    // On entering the page, all notes are selected by default
    useEffect(() => {
        setSelectedNoteIds(publishableNoteIds);
        setSelectAll(true);

        return () => {
            setSelectedNoteIds([]);
        };
    }, [notes]);

    // When all notes are selected, the "select all" checkbox is automatically checked
    useEffect(() => {
        setSelectAll(
            selectedNoteIds.length > 0 &&
                selectedNoteIds.length === publishableNoteIds.length,
        );
    }, [notes, selectedNoteIds]);

    const handleSelectAll = useCallback(() => {
        setSelectAll((prevSelectAll) => !prevSelectAll);
        if (!selectAll) {
            setSelectedNoteIds(publishableNoteIds);
        } else {
            setSelectedNoteIds([]);
        }
    }, [notes, setSelectedNoteIds, selectAll]);

    const handleCancelPublishMode = useCallback(() => {
        setSelectedNoteIds([]);
        navigate(createDashboardLink({ name, type, subtype })); // return to the dashboard
    }, [selectedNoteIds]);

    // When the publish button is clicked, the user is sent to the publish preview page,
    // where they can choose how to export the published report
    const handlePublish = useCallback(() => {
        if (selectedNoteIds.length === 0) {
            setAlert({
                show: true,
                message: 'Please select at least one note to publish',
                color: 'red',
            });
            return;
        }

        // TODO remove sort when any order will be possible (e.g. with drag and drop). See Array.splice()
        const noteIds = notes
            .filter((note) => selectedNoteIds.includes(note.id))
            .sort((note1, note2) => note2.timestamp - note1.timestamp)
            .map((note) => note.id);
        navigate(`/publish`, { state: { noteIds: noteIds, entityName: name } });
    }, [selectedNoteIds, name, navigate]);

    const navbarContents = [
        // If the dashboard is in publish preview mode, add a button to exit it and another to move to the publish preview
        <NavbarButton
            icon={<Xmark />}
            text='Cancel'
            data-testid='cancel-publish-btn'
            onClick={handleCancelPublishMode}
        />,
        <NavbarButton
            icon={<StatsReport />}
            text='Publish'
            data-testid='publish-btn'
            onClick={handlePublish}
        />,
    ];
    useNavbarContents(navbarContents, [location, selectedNoteIds]);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div
                className='w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-scroll'
                ref={dashboard}
            >
                <div className='w-[95%] h-full flex flex-col p-6 space-y-3'>
                    {name && <h1 className='text-5xl font-bold'>{name}</h1>}
                    {type && (
                        <p className='text-sm text-zinc-500'>{`Type: ${subtype ? subtype : type}`}</p>
                    )}
                    {description && (
                        <p className='text-sm text-zinc-500'>{`Description: ${description}`}</p>
                    )}

                    {notes && (
                        <div className='bg-cradle3 p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col flex-1'>
                            <h2 className='text-xl font-semibold mb-2'>Notes</h2>
                            <span className='flex flex-row justify-end m-3 p-4'>
                                <label htmlFor='select-all-btn' className='mx-2'>
                                    Select All
                                </label>
                                <input
                                    type='checkbox'
                                    id='select-all-btn'
                                    className='form-checkbox checkbox checkbox-primary'
                                    onClick={handleSelectAll}
                                    checked={selectAll}
                                />
                            </span>
                            {notes.map((note, index) => (
                                <DashboardNote
                                    index={index}
                                    note={note}
                                    setAlert={setAlert}
                                    publishMode={true}
                                    selectedNoteIds={selectedNoteIds}
                                    setSelectedNoteIds={setSelectedNoteIds}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
