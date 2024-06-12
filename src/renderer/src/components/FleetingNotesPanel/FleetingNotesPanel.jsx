import { Notes, Xmark } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { getFleetingNotes } from '../../services/fleetingNotesService/fleetingNotesService';
import { useAuth } from '../../hooks/useAuth/useAuth';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import FleetingNoteCard from '../FleetingNoteCard/FleetingNoteCard';

/**
 * The FleetingNotesPanel component is a panel that displays all the fleeting notes of the user.
 * It is displayed when the user clicks the fleeting notes button in the Navbar.
 * @param handleFleetingNotesButton - the function to handle the closing of the FleetingNotesPanel
 * @param fleetingNotesRefresh - the state used to determine the refresh of the FleetingNotesPanel
 * @returns {FleetingNotesPanel}
 * @constructor
 */
export default function FleetingNotesPanel({
    handleFleetingNotesButton,
    fleetingNotesRefresh,
}) {
    const auth = useAuth();
    const [alertText, setAlertText] = useState('');
    const [alertColor, setAlertColor] = useState('');
    const [notes, setNotes] = useState([]);

    useEffect(() => {
        getFleetingNotes(auth.access)
            .then((response) => {
                if (response.status == 200) {
                    setNotes(response.data);
                }
            })
            .catch(displayError(setAlertText, setAlertColor));
    }, [fleetingNotesRefresh]);

    return (
        <>
            <AlertDismissible
                alert={alertText}
                setAlert={setAlertText}
                color={alertColor}
            />
            <div
                className='bg-gray-2 w-full h-full p-4 flex flex-col space-y-2 overflow-hidden'
                data-testid='fleeting-notes-panel'
            >
                <div
                    className='h-fit w-full flex flex-row justify-between cursor-pointer'
                    onClick={handleFleetingNotesButton}
                    data-testid='close-fleeting-notes'
                >
                    <Notes className='text-zinc-500' width='1.5em' height='1.5em' />
                    <Xmark className='text-zinc-500' width='1.5em' height='1.5em' />
                </div>
                <div className='w-full h-full overflow-y-auto'>
                    {notes && notes.length > 0 ? (
                        notes.map((note) => (
                            <FleetingNoteCard
                                note={note}
                                setAlert={setAlertText}
                                setAlertColor={setAlertColor}
                            />
                        ))
                    ) : (
                        <p className='w-full p-2 text-zinc-500 text-center'>
                            No notes to display
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
