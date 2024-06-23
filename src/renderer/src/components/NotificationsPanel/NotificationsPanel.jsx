import { Xmark } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth/useAuth';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import FleetingNoteCard from '../FleetingNoteCard/FleetingNoteCard';
import { getNotifications } from '../../services/notificationsService/notificationsService';
import NotificationCard from '../NotificationCard/NotificationCard';

/**
 * The NotificationsPanel component is responsible for displaying notifications to the user.
 * It fetches notifications from the server and displays them in a list.
 * The component can be shown or hidden by clicking a button in the Sidebar.
 *
 * The NotificationsPanel component also manages the state of the notifications.
 * It fetches the notifications from the server when the component is mounted and whenever the newNotificationsCount changes.
 * It also calculates the number of flagged notifications and updates the newNotificationsCount state.
 * When the number of flagged notifications is the same as the newNotificationsCount, the component does not fetch notifications from the server.
 *
 * The NotificationsPanel component uses the useAuth hook to get the user's authentication information for fetching notifications.
 * It also uses the AlertDismissible component to display alerts.
 *
 * @component
 * @param {Function} handleCloseNotifications - The function to call when the close button is clicked.
 * @param {number} unreadNotificationsCount - The current count of new notifications.
 * @param {Function} setUnreadNotificationsCount - The function to update the newNotificationsCount state.
 *
 * @returns {NotificationsPanel} The NotificationsPanel component.
 */
export default function NotificationsPanel({
    handleCloseNotifications,
    unreadNotificationsCount,
    setUnreadNotificationsCount,
}) {
    const auth = useAuth();
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [notifications, setNotifications] = useState([]);
    const [flaggedNotificationsCount, setFlaggedNotificationsCount] = useState(0);

    const updateFlaggedNotificationsCount = (update) => {
        setFlaggedNotificationsCount(update);
        setUnreadNotificationsCount(update);
    };

    function fetchNotificationsAndUpdateCounts() {
        getNotifications()
            .then((response) => {
                setNotifications(response.data);
                const auxFlaggedNotificationsCount = response.data.filter(
                    (notification) => notification.is_marked_unread,
                ).length;
                updateFlaggedNotificationsCount(auxFlaggedNotificationsCount);
            })
            .catch(displayError(setAlert));
    }

    useEffect(() => {
        fetchNotificationsAndUpdateCounts();
    }, []);

    useEffect(() => {
        if (flaggedNotificationsCount < unreadNotificationsCount) {
            fetchNotificationsAndUpdateCounts();
        }
    }, [unreadNotificationsCount]);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div
                className='bg-gray-2 w-full h-full p-4 flex flex-col space-y-2 overflow-hidden'
                data-testid='notifications-panel'
            >
                <div
                    className='h-fit w-full flex flex-row justify-end cursor-pointer'
                    onClick={handleCloseNotifications}
                    data-testid='close-notifications-panel'
                >
                    <Xmark className='text-zinc-500' width='1.5em' height='1.5em' />
                </div>
                <div className='w-full h-full overflow-y-auto overflow-x-hidden'>
                    {notifications && notifications.length > 0 ? (
                        notifications.map((notification, index) => (
                            <NotificationCard
                                key={index}
                                notification={notification}
                                setAlert={setAlert}
                                updateFlaggedNotificationsCount={
                                    updateFlaggedNotificationsCount
                                }
                            />
                        ))
                    ) : (
                        <p className='w-full p-2 text-zinc-500 text-center'>
                            No notifications to display
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
