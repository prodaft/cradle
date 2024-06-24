import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Navbar from '../Navbar/Navbar';
import { useCallback, useMemo, useState } from 'react';
import { IconoirProvider } from 'iconoir-react';
import FleetingNotesPanel from '../FleetingNotesPanel/FleetingNotesPanel';
import NotificationsPanel from '../NotificationsPanel/NotificationsPanel';
import useInterval from '../../hooks/useInterval/useInterval';
import { getNotificationCount } from '../../services/notificationsService/notificationsService';

/**
 * The Home component serves as the main layout of the application. It is composed of several child components:
 *
 * - Sidebar: This component allows navigation between different sections of the application.
 *   It includes options for creating a new note, viewing the graph, accessing the admin panel (if the user is an admin), and logging out.
 *   It also displays the number of new notifications.
 *
 * - Navbar: This component provides access to various functionalities of the application.
 *   The contents of the Navbar are dynamic and can be set by the child components rendered in the Outlet.
 *
 * - FleetingNotesPanel: This component displays fleeting notes. It can be shown or hidden by clicking a button in the Navbar.
 *
 * - NotificationsPanel: This component displays notifications.
 *   It fetches the notifications from the server and displays them in a list.
 *   It can be shown or hidden by clicking a button in the Sidebar.
 *
 * - Outlet: This component is where the different components of the application are rendered based on the current route.
 *   The child components rendered in the Outlet can set the contents of the Navbar and trigger a refresh of the FleetingNotesPanel.
 *
 * The Home component also manages the state of the Navbar and the FleetingNotesPanel.
 * It fetches the count of new notifications from the server every 10 seconds and updates the newNotificationsCount state.
 * When the newNotificationsCount state changes, the Sidebar and NotificationsPanel are updated to reflect the new count.
 *
 * @function Home
 * @returns {Home}
 * @constructor
 */
export default function Home() {
    const [showFleetingNotes, setShowFleetingNotes] = useState(false);
    const [fleetingNotesRefreshCount, setFleetingNotesRefreshCount] = useState(0);
    const [navbarContents, setNavbarContents] = useState([]);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    const SHORT_POLLING_DELAY = 10000;

    const toggleFleetingNotes = useCallback(() => {
        setShowFleetingNotes((prev) => !prev);
    }, [setShowFleetingNotes]);

    const toggleNotifications = useCallback(() => {
        setShowNotifications((prev) => !prev);
    }, [setShowNotifications]);

    const refreshFleetingNotes = useCallback(() => {
        setFleetingNotesRefreshCount((prevCount) => prevCount + 1);
    }, []);

    const memoizedNavbarContents = useMemo(() => navbarContents, [navbarContents]);

    useInterval(() => {
        getNotificationCount()
            .then((response) => {
                setUnreadNotificationsCount(response.data.count);
            })
            .catch((error) => {
                console.log(error);
            });
    }, SHORT_POLLING_DELAY);

    return (
        <IconoirProvider
            iconProps={{
                color: '#f68d2e',
                strokeWidth: 1,
                width: '1.7em',
                height: '1.7em',
            }}
        >
            <div className='flex flex-col w-screen h-full overflow-hidden'>
                <Navbar
                    showFleetingNotesButton={!showFleetingNotes}
                    handleFleetingNotesButton={toggleFleetingNotes}
                    contents={memoizedNavbarContents}
                />
                <div className='flex flex-row w-full h-full overflow-hidden'>
                    <Sidebar
                        showNotifications={showNotifications}
                        unreadNotificationsCount={unreadNotificationsCount}
                        handleNotifications={toggleNotifications}
                    />
                    <div
                        className={`transition-all duration-150 ${showNotifications ? 'max-w-96 w-full' : 'w-0'} overflow-hidden`}
                    >
                        {showNotifications && (
                            <NotificationsPanel
                                handleCloseNotifications={toggleNotifications}
                                unreadNotificationsCount={unreadNotificationsCount}
                                setUnreadNotificationsCount={
                                    setUnreadNotificationsCount
                                }
                            />
                        )}
                    </div>
                    <div className='flex-grow overflow-y-auto w-full'>
                        <Outlet
                            context={{
                                setNavbarContents,
                                refreshFleetingNotes,
                            }}
                        />
                    </div>
                    <div
                        className={`transition-all duration-150 ${showFleetingNotes ? 'max-w-96 w-full' : 'w-0'} overflow-hidden`}
                    >
                        {showFleetingNotes && (
                            <FleetingNotesPanel
                                handleFleetingNotesButton={toggleFleetingNotes}
                                fleetingNotesRefresh={fleetingNotesRefreshCount}
                            />
                        )}
                    </div>
                </div>
            </div>
        </IconoirProvider>
    );
}
