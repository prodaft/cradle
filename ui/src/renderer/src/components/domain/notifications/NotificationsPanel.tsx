import { useNotif } from '@/contexts/ui/NotificationContext';
import useApi from '@/hooks/api/useApi';
import { Notification } from '@/services/cradle';
import { Xmark } from 'iconoir-react';
import { useEffect, useState } from 'react';
import NotificationCard from './NotificationCard';

interface NotificationsPanelProps {
    handleCloseNotifications: () => void;
    unreadNotificationsCount: number;
    setUnreadNotificationsCount: (count: number | ((prev: number) => number)) => void;
}

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
 * It uses the useNotif hook to display notifications.
 *
 * @component
 * @param {NotificationsPanelProps} props - The props of the component.
 *
 * @returns {NotificationsPanel} The NotificationsPanel component.
 */
export default function NotificationsPanel({
    handleCloseNotifications,
    unreadNotificationsCount,
    setUnreadNotificationsCount,
}: NotificationsPanelProps) {
    const { notificationsApi } = useApi();
    const { notify } = useNotif();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [flaggedNotificationsCount, setFlaggedNotificationsCount] = useState(0);

    const updateFlaggedNotificationsCount = (
        updater: number | ((prevCount: number) => number),
    ) => {
        setFlaggedNotificationsCount(updater);
        setUnreadNotificationsCount(updater);
    };

    function fetchNotificationsAndUpdateCounts() {
        notificationsApi
            .notificationsList()
            .then((response) => {
                setNotifications(response || []);
                const auxFlaggedNotificationsCount = (response || []).filter(
                    (notification: Notification) => notification.isMarkedUnread,
                ).length;
                updateFlaggedNotificationsCount(auxFlaggedNotificationsCount);
            })
            .catch((error: any) => {
                notify({
                    type: 'error',
                    text:
                        error.response?.data?.detail || 'Failed to fetch notifications',
                });
            });
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
