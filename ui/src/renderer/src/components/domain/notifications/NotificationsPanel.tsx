import Loading from '@/components/base/Loading/Loading';
import { useNotif } from '@/contexts/ui/NotificationContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { Notification } from '@/services/cradle';
import { useEffect, useState } from 'react';
import NotificationCard from './NotificationCard';

interface NotificationsPanelProps {
    unreadNotificationsCount: number;
    setUnreadNotificationsCount: (count: number | ((prev: number) => number)) => void;
}

/**
 * NotificationsPanel - Displays a scrollable list of user notifications.
 * 
 * Rendered as a resizable side panel in MainLayout. Fetches notifications on mount
 * and when unread count increases. Users close the panel via the notification bell button.
 */
export default function NotificationsPanel({
    unreadNotificationsCount,
    setUnreadNotificationsCount,
}: NotificationsPanelProps) {
    const { notificationsApi } = useApi();
    const { notify } = useNotif();
    const [loading, setLoading] = useState(false);
    const { execute } = useAPICall();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [flaggedNotificationsCount, setFlaggedNotificationsCount] = useState(0);

    const updateFlaggedNotificationsCount = (
        updater: number | ((prevCount: number) => number),
    ) => {
        setFlaggedNotificationsCount(updater);
        setUnreadNotificationsCount(updater);
    };

    async function fetchNotificationsAndUpdateCounts() {
        setLoading(true);
        const response = await execute(() => notificationsApi
            .notificationsList());
        setNotifications(response);
        const auxFlaggedNotificationsCount = (response || []).filter(
            (notification: Notification) => notification.isMarkedUnread,
        ).length;
        updateFlaggedNotificationsCount(auxFlaggedNotificationsCount);
        setLoading(false);
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
        <div
            className='w-full h-full flex flex-col overflow-hidden'
            data-testid='notifications-panel'
        >
            {/* Notifications list */}
            <div className='flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2'>
                {notifications && notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                        <NotificationCard
                            key={notification.id || index}
                            notification={notification}
                            updateFlaggedNotificationsCount={
                                updateFlaggedNotificationsCount
                            }
                        />
                    ))
                ) : (
                    <div className='flex flex-col items-center justify-center h-full text-cradle-text-muted'>
                        {!loading && <span className='text-sm'>No notifications</span>}
                        {loading && <Loading />}
                    </div>
                )}
            </div>
        </div>
    );
}
