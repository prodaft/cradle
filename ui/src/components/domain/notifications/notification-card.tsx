import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { queryKeys } from '@/hooks/query';
import {
    notificationDestructive,
    notificationIcon,
    notificationTitle,
} from '@/utils/notification-titles';
import { EnvelopeIcon, EnvelopeOpenIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { format, formatDistanceToNow } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from 'src/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from 'src/components/ui/tooltip';

type Notification = components['schemas']['Notification'];
type AccessRequestNotification = components['schemas']['AccessRequestNotification'];
type NewUserNotification = components['schemas']['NewUserNotification'];
type ReportRenderNotification = components['schemas']['ReportRenderNotification'];
type EnrichmentCompleteNotification =
    components['schemas']['EnrichmentCompleteNotification'];
type EnrichmentErrorNotification = components['schemas']['EnrichmentErrorNotification'];

interface NotificationCardProps {
    notification: Notification;
}

export default function NotificationCard({
    notification,
}: NotificationCardProps): React.JSX.Element {
    const { id, message, created_at, is_unread } = notification;
    const [unreadStatus, setUnreadStatus] = useState(is_unread);
    const queryClient = useQueryClient();
    const router = useRouter();

    useEffect(() => {
        setUnreadStatus(is_unread);
    }, [id, is_unread]);

    const title = notificationTitle(notification.type);
    const Icon = notificationIcon(notification.type);
    const variant = notificationDestructive(notification.type) ? 'destructive' : 'default';

    const updateUnreadStatus = useMutation({
        mutationFn: async ({ id, is_unread }: { id: string; is_unread: boolean }) => {
            const { error, response } = await fetchClient.PUT(
                '/notifications/{notification_id}/',
                {
                    params: { path: { notification_id: id } },
                    body: { is_unread },
                },
            );
            if (error) throw { response, error };
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: (_data, variables) => {
            setUnreadStatus(variables.is_unread);
            void queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.unreadCount(),
            });
            void queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.all,
            });
        },
    });

    const updateAccess = useMutation({
        mutationFn: async ({
            userId,
            entityId,
            accessType,
        }: {
            userId: string;
            entityId: number;
            accessType: 'none' | 'read' | 'read-write';
        }) => {
            const { error, response } = await fetchClient.PUT(
                '/access/user/{user_id}/{entity_id}/',
                {
                    params: { path: { user_id: userId, entity_id: entityId } },
                    body: { access_type: accessType },
                },
            );
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'Access level changed successfully',
        },
    });

    const activateUser = useMutation({
        mutationFn: async (userId: string) => {
            const { error, response } = await fetchClient.PATCH('/users/{user_id}/', {
                params: { path: { user_id: userId } },
                body: { is_active: true },
            });
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'User activated successfully.',
        },
    });

    const fetchReportUrl = useMutation({
        mutationFn: async (reportId: string) => {
            const { data, error, response } = await fetchClient.GET(
                '/reports/{report_id}/',
                {
                    params: {
                        path: { report_id: reportId },
                        query: {
                            download_url: false,
                        },
                    },
                },
            );
            if (error) throw { response, error };
            return data?.report_url;
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: (reportUrl) => {
            if (reportUrl) {
                window.open(reportUrl, '_blank');
            } else {
                toast.error('Report URL not found');
            }
        },
    });

    const toggleUnread = () => {
        if (!id) return;
        const next = !unreadStatus;
        updateUnreadStatus.mutate({ id, is_unread: next });
    };

    const grantAccess = (access: 'read' | 'read-write') => () => {
        const notif = notification as AccessRequestNotification;
        if (!notif.requesting_user_id || !notif.entity_id) return;
        updateAccess.mutate({
            userId: notif.requesting_user_id,
            entityId: notif.entity_id,
            accessType: access,
        });
    };

    const activateNewUser = () => {
        const notif = notification as NewUserNotification;
        if (!notif.new_user?.id) return;
        activateUser.mutate(notif.new_user.id);
    };

    const viewReport = () => {
        const notif = notification as ReportRenderNotification;
        if (!notif.report_id) return;
        fetchReportUrl.mutate(notif.report_id);
    };

    const createdAtDate = created_at ? new Date(created_at) : null;
    const relativeTime = createdAtDate
        ? formatDistanceToNow(createdAtDate, { addSuffix: true })
        : 'N/A';
    const absoluteTime = createdAtDate
        ? format(createdAtDate, 'dd MMM yyyy, HH:mm')
        : 'N/A';

    const isActionable = !!(
        notification.type === 'request_access_notification' ||
        notification.type === 'new_user_notification' ||
        notification.type === 'report_render_notification' ||
        notification.type === 'report_processing_error_notification' ||
        notification.type === 'enrichment_complete_notification' ||
        notification.type === 'enrichment_error_notification'
    );

    return (
        <Alert variant={variant}>
            <Icon weight='fill' />

            <AlertTitle className='flex items-center gap-2 pr-6'>
                <span className='truncate'>{title}</span>
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <span className='shrink-0 text-xs font-normal text-muted-foreground' />
                        }
                    >
                        {relativeTime}
                    </TooltipTrigger>
                    <TooltipContent>{absoluteTime}</TooltipContent>
                </Tooltip>
            </AlertTitle>

            <div className='absolute top-1.5 right-1.5'>
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <Button
                                variant='ghost'
                                size='icon-xs'
                                onClick={toggleUnread}
                            />
                        }
                    >
                        {unreadStatus ? (
                            <EnvelopeIcon weight='bold' data-testid='mark-read' />
                        ) : (
                            <EnvelopeOpenIcon weight='bold' data-testid='mark-unread' />
                        )}
                    </TooltipTrigger>
                    <TooltipContent>
                        {unreadStatus ? 'Mark as read' : 'Mark as unread'}
                    </TooltipContent>
                </Tooltip>
            </div>

            <AlertDescription>
                <p>{message}</p>

                {isActionable && (
                    <div className='-mt-1 flex flex-wrap gap-2'>
                        {notification.type === 'request_access_notification' && (
                            <>
                                <Button size='xs' onClick={grantAccess('read')}>
                                    Read
                                </Button>
                                <Button size='xs' onClick={grantAccess('read-write')}>
                                    Read/Write
                                </Button>
                            </>
                        )}

                        {notification.type === 'new_user_notification' && (
                            <Button size='xs' onClick={activateNewUser}>
                                Activate user
                            </Button>
                        )}

                        {notification.type === 'report_render_notification' && (
                            <Button size='xs' onClick={viewReport}>
                                View report
                            </Button>
                        )}

                        {notification.type ===
                            'report_processing_error_notification' && (
                            <Button
                                size='xs'
                                onClick={() => router.navigate({ to: '/reports' })}
                            >
                                View details
                            </Button>
                        )}

                        {notification.type === 'enrichment_complete_notification' && (
                            <Button
                                size='xs'
                                onClick={() => {
                                    const notif =
                                        notification as EnrichmentCompleteNotification;
                                    if (!notif.enrichment_request_id) return;
                                    router.navigate({
                                        to: '/enrichment/$id',
                                        params: {
                                            id: notif.enrichment_request_id,
                                        },
                                    });
                                }}
                            >
                                View enrichment
                            </Button>
                        )}

                        {notification.type === 'enrichment_error_notification' && (
                            <Button
                                size='xs'
                                onClick={() => {
                                    const notif =
                                        notification as EnrichmentErrorNotification;
                                    if (!notif.enrichment_request_id) return;
                                    router.navigate({
                                        to: '/enrichment/$id',
                                        params: {
                                            id: notif.enrichment_request_id,
                                        },
                                    });
                                }}
                            >
                                View details
                            </Button>
                        )}
                    </div>
                )}
            </AlertDescription>
        </Alert>
    );
}
