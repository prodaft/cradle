import { PageLoader } from '@/components/base/page-loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryKeys } from '@/hooks/query';
import { BellRingingIcon, XIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NotificationCard from './notification-card';

type FilterMode = 'all' | 'unread';

interface NotificationsPanelProps {
    unreadCount: number;
    onClose?: () => void;
}

const PAGE_SIZE = 20;
const ESTIMATED_NOTIFICATION_HEIGHT = 140;
const OVERSCAN = 5;

/**
 * NotificationsPanel - Displays a virtualized scrollable list of user notifications.
 *
 * Rendered as a resizable side panel in MainLayout. Fetches notifications on mount
 * with infinite scroll pagination. Uses virtual scrolling for performance.
 */
export default function NotificationsPanel({ unreadCount, onClose }: NotificationsPanelProps) {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<FilterMode>('all');
    const scrollAreaContainerRef = useRef<HTMLDivElement>(null);

    const getScrollElement = useCallback((): HTMLDivElement | null => {
        return (
            scrollAreaContainerRef.current?.querySelector<HTMLDivElement>(
                '[data-slot="scroll-area-viewport"]',
            ) ?? null
        );
    }, []);

    const {
        data: notificationPages,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: queryKeys.notifications.list(filter === 'unread' ? 'unread' : 'all'),
        queryFn: async ({ pageParam }) => {
            const unreadOnly = filter === 'unread';
            const { data, error, response } = await fetchClient.GET('/notifications/', {
                params: {
                    query: {
                        page: pageParam,
                        page_size: PAGE_SIZE,
                        ...(unreadOnly ? { unread_only: true } : {}),
                    },
                },
            });
            if (error) throw { response, error };
            if (!unreadOnly) {
                void queryClient.invalidateQueries({
                    queryKey: queryKeys.notifications.unreadCount(),
                });
            }
            return data!;
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.page < lastPage.total_pages) {
                return lastPage.page + 1;
            }
            return undefined;
        },
        initialPageParam: 1,
        meta: {
            showErrorToast: true,
        },
    });

    const notifications = useMemo(() => {
        return notificationPages?.pages.flatMap((page) => page.results) ?? [];
    }, [notificationPages]);

    const virtualizer = useVirtualizer({
        count: hasNextPage ? notifications.length + 1 : notifications.length,
        getScrollElement,
        estimateSize: () => ESTIMATED_NOTIFICATION_HEIGHT,
        overscan: OVERSCAN,
    });

    const virtualItems = virtualizer.getVirtualItems();

    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    useEffect(() => {
        const lastItem = virtualItems[virtualItems.length - 1];
        if (!lastItem) return;

        if (
            lastItem.index >= notifications.length - 1 &&
            hasNextPage &&
            !isFetchingNextPage
        ) {
            loadMore();
        }
    }, [virtualItems, notifications.length, hasNextPage, isFetchingNextPage, loadMore]);

    useEffect(() => {
        getScrollElement()?.scrollTo({ top: 0 });
    }, [filter, getScrollElement]);

    const isInitialLoad = isLoading && notifications.length === 0;
    const isEmpty = !isInitialLoad && notifications.length === 0;

    return (
        <div
            className='w-full h-full flex flex-col overflow-hidden bg-card'
            data-testid='notifications-panel'
        >
            {/* Header */}
            <div className='flex items-center justify-between gap-2 px-4 h-14 border-b border-border shrink-0'>
                <div className='flex items-center gap-2 min-w-0'>
                    <h2 className='text-base font-semibold text-foreground truncate'>
                        Notifications
                    </h2>
                    {unreadCount > 0 && (
                        <Badge
                            variant='default'
                            className='h-5 min-w-5 px-1.5 tabular-nums'
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                    )}
                </div>
                {onClose && (
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    variant='ghost'
                                    size='icon-sm'
                                    onClick={onClose}
                                    aria-label='Close notifications'
                                />
                            }
                        >
                            <XIcon size={16} weight='bold' />
                        </TooltipTrigger>
                        <TooltipContent>Close</TooltipContent>
                    </Tooltip>
                )}
            </div>

            {/* Filter tabs */}
            <div className='px-3 pt-3 pb-2 shrink-0'>
                <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
                    <TabsList className='w-full'>
                        <TabsTrigger value='all'>All</TabsTrigger>
                        <TabsTrigger value='unread'>
                            Unread
                            {unreadCount > 0 && (
                                <Badge
                                    variant='secondary'
                                    className='h-4 min-w-4 px-1 text-[10px] tabular-nums'
                                >
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Body */}
            {isInitialLoad ? (
                <div className='flex-1 min-h-0 flex items-center justify-center p-3'>
                    <PageLoader fill='container' />
                </div>
            ) : isEmpty ? (
                <div className='flex-1 min-h-0 flex items-center justify-center p-4'>
                    <Empty className='border-0'>
                        <EmptyHeader>
                            <EmptyMedia variant='icon'>
                                <BellRingingIcon size={24} weight='duotone' />
                            </EmptyMedia>
                            <EmptyTitle>
                                {filter === 'unread'
                                    ? "You're all caught up"
                                    : 'No notifications yet'}
                            </EmptyTitle>
                            <EmptyDescription>
                                {filter === 'unread'
                                    ? 'New unread notifications will appear here.'
                                    : "We'll let you know when something needs your attention."}
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                </div>
            ) : (
                <div
                    ref={scrollAreaContainerRef}
                    className='flex min-h-0 flex-1 flex-col min-w-0'
                >
                    <ScrollArea className='relative min-h-0 flex-1'>
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
                                        <div className='px-3 py-1.5'>
                                            {isLoaderRow ? (
                                                <div className='flex justify-center p-4'>
                                                    {isFetchingNextPage ? (
                                                        <Spinner className='size-6' />
                                                    ) : (
                                                        <span className='text-xs text-muted-foreground'>
                                                            Load more...
                                                        </span>
                                                    )}
                                                </div>
                                            ) : notification ? (
                                                <NotificationCard
                                                    notification={notification}
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}
