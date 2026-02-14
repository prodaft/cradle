import useApi from '@/hooks/api/use-api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Loading from 'src/components/base/Loading/Loading';
import { Notification } from 'src/services/cradle';
import NotificationCard from './NotificationCard';

interface NotificationsPanelProps {
    unreadNotificationsCount: number;
    setUnreadNotificationsCount: (count: number | ((prev: number) => number)) => void;
}

const PAGE_SIZE = 20;
const ESTIMATED_NOTIFICATION_HEIGHT = 120;
const OVERSCAN = 5;

/**
 * NotificationsPanel - Displays a virtualized scrollable list of user notifications.
 *
 * Rendered as a resizable side panel in MainLayout. Fetches notifications on mount
 * with infinite scroll pagination. Uses virtual scrolling for performance.
 */
export default function NotificationsPanel({
    unreadNotificationsCount,
    setUnreadNotificationsCount,
}: NotificationsPanelProps) {
    const { notificationsApi } = useApi();
    const [flaggedNotificationsCount, setFlaggedNotificationsCount] = useState(0);
    const parentRef = useRef<HTMLDivElement>(null);

    // Infinite query for paginated notifications
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
        useInfiniteQuery({
            queryKey: ['notifications'],
            queryFn: async ({ pageParam }) => {
                return notificationsApi.notificationsRetrieve({
                    page: pageParam,
                    pageSize: PAGE_SIZE,
                });
            },
            getNextPageParam: (lastPage) => {
                if (lastPage.page < lastPage.totalPages) {
                    return lastPage.page + 1;
                }
                return undefined;
            },
            initialPageParam: 1,
            meta: {
                showErrorToast: true,
            },
        });

    // Flatten all pages into a single array
    const notifications = useMemo(() => {
        return data?.pages.flatMap((page) => page.results) ?? [];
    }, [data]);

    // Calculate flagged notifications count from loaded notifications
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

    // Setup virtualizer for the notifications list
    const virtualizer = useVirtualizer({
        count: hasNextPage ? notifications.length + 1 : notifications.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ESTIMATED_NOTIFICATION_HEIGHT,
        overscan: OVERSCAN,
    });

    const virtualItems = virtualizer.getVirtualItems();

    // Load more when scrolling near the bottom
    const handleLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Check if we need to load more when last item becomes visible
    useEffect(() => {
        const lastItem = virtualItems[virtualItems.length - 1];
        if (!lastItem) return;

        // If the last visible item is the loader row (beyond actual data), fetch more
        if (
            lastItem.index >= notifications.length - 1 &&
            hasNextPage &&
            !isFetchingNextPage
        ) {
            handleLoadMore();
        }
    }, [
        virtualItems,
        notifications.length,
        hasNextPage,
        isFetchingNextPage,
        handleLoadMore,
    ]);

    const isEmpty = !isLoading && notifications.length === 0;

    return (
        <div
            className='w-full h-full flex flex-col overflow-hidden'
            data-testid='notifications-panel'
        >
            {isEmpty ? (
                <div className='flex flex-col items-center justify-center h-full p-3 text-muted-foreground'>
                    <span className='text-sm'>No notifications</span>
                </div>
            ) : isLoading && notifications.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-full p-3'>
                    <Loading />
                </div>
            ) : (
                <div
                    ref={parentRef}
                    className='flex-1 overflow-auto'
                    style={{ contain: 'strict' }}
                >
                    <div
                        style={{
                            height: `${virtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {virtualItems.map((virtualItem) => {
                            const isLoaderRow =
                                virtualItem.index >= notifications.length;
                            const notification = notifications[virtualItem.index];

                            return (
                                <div
                                    key={virtualItem.key}
                                    data-index={virtualItem.index}
                                    ref={virtualizer.measureElement}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${virtualItem.start}px)`,
                                    }}
                                >
                                    <div className='p-1.5'>
                                        {isLoaderRow ? (
                                            <div className='flex justify-center p-4'>
                                                {isFetchingNextPage ? (
                                                    <Loading />
                                                ) : (
                                                    <span className='text-sm text-muted-foreground'>
                                                        Load more...
                                                    </span>
                                                )}
                                            </div>
                                        ) : notification ? (
                                            <NotificationCard
                                                notification={notification}
                                                updateFlaggedNotificationsCount={
                                                    updateFlaggedNotificationsCount
                                                }
                                            />
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
