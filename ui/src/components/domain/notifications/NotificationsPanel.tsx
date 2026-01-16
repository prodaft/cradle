import Loading from 'src/components/base/Loading/Loading';
import { ScrollArea } from 'src/components/ui/scroll-area';
import useApi from 'src/hooks/api/useApi';
import { Notification } from 'src/services/cradle';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
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
    const [flaggedNotificationsCount, setFlaggedNotificationsCount] = useState(0);

    // Query for notifications
    const {
        data: notificationsData,
        isPending: loading,
        refetch,
    } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationsApi.notificationsList(),
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to load notifications',
        },
    });

    const notifications = notificationsData || [];

    // Calculate flagged notifications count
    const calculatedFlaggedCount = useMemo(() => {
        return notifications.filter(
            (notification: Notification) => notification.isMarkedUnread,
        ).length;
    }, [notifications]);

    // Update flagged count when notifications change
    useEffect(() => {
        setFlaggedNotificationsCount(calculatedFlaggedCount);
        setUnreadNotificationsCount(calculatedFlaggedCount);
    }, [calculatedFlaggedCount, setUnreadNotificationsCount]);

    // Refetch when unread count increases (new notification arrived)
    useEffect(() => {
        if (flaggedNotificationsCount < unreadNotificationsCount) {
            refetch();
        }
    }, [unreadNotificationsCount, flaggedNotificationsCount, refetch]);

    const updateFlaggedNotificationsCount = (
        updater: number | ((prevCount: number) => number),
    ) => {
        const newCount =
            typeof updater === 'function'
                ? updater(flaggedNotificationsCount)
                : updater;
        setFlaggedNotificationsCount(newCount);
        setUnreadNotificationsCount(newCount);
    };

    return (
        <div
            className='w-full h-full flex flex-col overflow-hidden'
            data-testid='notifications-panel'
        >
            {/* Notifications list */}
            <ScrollArea className='flex-1 overflow-x-hidden p-3 space-y-2'>
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
                    <div className='flex flex-col items-center justify-center h-full text-muted-foreground'>
                        {!loading && <span className='text-sm'>No notifications</span>}
                        {loading && <Loading />}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
