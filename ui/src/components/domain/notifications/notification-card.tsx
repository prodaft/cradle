import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { queryKeys } from '@/hooks/query';
import {
    BellSimpleIcon,
    CheckCircleIcon,
    EnvelopeIcon,
    EnvelopeOpenIcon,
    FileTextIcon,
    ShieldCheckIcon,
    SparkleIcon,
    UserPlusIcon,
    WarningCircleIcon,
    type IconWeight,
} from '@phosphor-icons/react';
import type { ApiQuery } from '@services/openapi/api-query';
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

type AlertVariant = 'default' | 'destructive';

type NotificationVisual = {
    icon: React.ComponentType<{
        size?: number | string;
        weight?: IconWeight;
        className?: string;
    }>;
    title: string;
    variant: AlertVariant;
};

const DEFAULT_VISUAL: NotificationVisual = {
    icon: BellSimpleIcon,
    title: 'Notification',
    variant: 'default',
};

const VISUALS: Record<string, NotificationVisual> = {
    request_access_notification: {
        icon: ShieldCheckIcon,
        title: 'Access request',
        variant: 'default',
    },
    access_granted_notification: {
        icon: CheckCircleIcon,
        title: 'Access granted',
        variant: 'default',
    },
    new_user_notification: {
        icon: UserPlusIcon,
        title: 'New user',
        variant: 'default',
    },
    report_render_notification: {
        icon: FileTextIcon,
        title: 'Report ready',
        variant: 'default',
    },
    report_processing_error_notification: {
        icon: WarningCircleIcon,
        title: 'Report failed',
        variant: 'destructive',
    },
    enrichment_complete_notification: {
        icon: SparkleIcon,
        title: 'Enrichment complete',
        variant: 'default',
    },
    enrichment_error_notification: {
        icon: WarningCircleIcon,
        title: 'Enrichment failed',
        variant: 'destructive',
    },
    message_notification: {
        icon: BellSimpleIcon,
        title: 'Message',
        variant: 'default',
    },
};

export default function NotificationCard({
    notification,
}: NotificationCardProps): React.JSX.Element {
    const { id, message, timestamp, is_marked_unread } = notification;
    const [unreadStatus, setUnreadStatus] = useState(is_marked_unread);
    const queryClient = useQueryClient();
    const router = useRouter();

    useEffect(() => {
        setUnreadStatus(is_marked_unread);
    }, [id, is_marked_unread]);

    const visual =
        (notification.notification_type && VISUALS[notification.notification_type]) ||
        DEFAULT_VISUAL;
    const Icon = visual.icon;

    const markUnreadMutation = useMutation({
        mutationFn: async ({
            id,
            is_marked_unread,
        }: {
            id: string;
            is_marked_unread: boolean;
        }) => {
            const { error, response } = await fetchClient.PUT(
                '/notifications/{notification_id}/',
                {
                    params: { path: { notification_id: id } },
                    body: { is_marked_unread },
                },
            );
            if (error) throw { response, error };
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: (_data, variables) => {
            setUnreadStatus(variables.is_marked_unread);
            void queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.unreadCount(),
            });
            void queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.list(),
            });
        },
    });

    const changeAccessMutation = useMutation({
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

    const activateUserMutation = useMutation({
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

    const viewReportMutation = useMutation({
        mutationFn: async (reportId: string) => {
            const { data, error, response } = await fetchClient.GET('/reports/{id}/', {
                params: {
                    path: { id: reportId },
                    query: {
                        download_url: false,
                    } satisfies ApiQuery<'reports_retrieve'>,
                },
            });
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

    const handleMarkUnread = () => {
        if (!id) return;
        const next = !unreadStatus;
        markUnreadMutation.mutate({ id, is_marked_unread: next });
    };

    const handleChangeAccess = (newAccess: 'none' | 'read' | 'read-write') => () => {
        const notif = notification as AccessRequestNotification;
        if (!notif.requesting_user_id || !notif.entity_id) return;
        changeAccessMutation.mutate({
            userId: notif.requesting_user_id,
            entityId: notif.entity_id,
            accessType: newAccess,
        });
    };

    const handleActivateUser = () => {
        const notif = notification as NewUserNotification;
        if (!notif.new_user?.id) return;
        activateUserMutation.mutate(notif.new_user.id);
    };

    const handleViewReport = () => {
        const notif = notification as ReportRenderNotification;
        if (!notif.published_report_id) return;
        viewReportMutation.mutate(notif.published_report_id);
    };

    const timestampDate = timestamp ? new Date(timestamp) : null;
    const relativeTime = timestampDate
        ? formatDistanceToNow(timestampDate, { addSuffix: true })
        : 'N/A';
    const absoluteTime = timestampDate
        ? format(timestampDate, 'dd MMM yyyy, HH:mm')
        : 'N/A';

    const hasActions = !!(
        notification.notification_type === 'request_access_notification' ||
        notification.notification_type === 'new_user_notification' ||
        notification.notification_type === 'report_render_notification' ||
        notification.notification_type === 'report_processing_error_notification' ||
        notification.notification_type === 'enrichment_complete_notification' ||
        notification.notification_type === 'enrichment_error_notification'
    );

    return (
        <Alert variant={visual.variant}>
            <Icon weight='fill' />

            <AlertTitle className='flex items-center gap-2 pr-8'>
                <span className='truncate'>{visual.title}</span>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className='shrink-0 text-xs font-normal text-muted-foreground'>
                            {relativeTime}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>{absoluteTime}</TooltipContent>
                </Tooltip>
            </AlertTitle>

            <div className='absolute top-2 right-2'>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant='ghost'
                            size='icon-xs'
                            onClick={handleMarkUnread}
                        >
                            {unreadStatus ? (
                                <EnvelopeIcon weight='bold' data-testid='mark-read' />
                            ) : (
                                <EnvelopeOpenIcon
                                    weight='bold'
                                    data-testid='mark-unread'
                                />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {unreadStatus ? 'Mark as read' : 'Mark as unread'}
                    </TooltipContent>
                </Tooltip>
            </div>

            <AlertDescription>
                <p>{message}</p>

                {hasActions && (
                    <div className='flex flex-wrap gap-2 pt-2'>
                        {notification.notification_type ===
                            'request_access_notification' && (
                            <>
                                <Button size='xs' onClick={handleChangeAccess('read')}>
                                    Read
                                </Button>
                                <Button
                                    size='xs'
                                    onClick={handleChangeAccess('read-write')}
                                >
                                    Read/Write
                                </Button>
                            </>
                        )}

                        {notification.notification_type === 'new_user_notification' && (
                            <Button size='xs' onClick={handleActivateUser}>
                                Activate user
                            </Button>
                        )}

                        {notification.notification_type ===
                            'report_render_notification' && (
                            <Button size='xs' onClick={handleViewReport}>
                                View report
                            </Button>
                        )}

                        {notification.notification_type ===
                            'report_processing_error_notification' && (
                            <Button
                                size='xs'
                                onClick={() => router.navigate({ to: '/reports' })}
                            >
                                View details
                            </Button>
                        )}

                        {notification.notification_type ===
                            'enrichment_complete_notification' && (
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

                        {notification.notification_type ===
                            'enrichment_error_notification' && (
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
