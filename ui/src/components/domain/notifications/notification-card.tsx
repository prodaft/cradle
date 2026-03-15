import { EnvelopeIcon, EnvelopeOpenIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from 'src/components/ui/button';
import { Card, CardContent } from 'src/components/ui/card';
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
    updateFlaggedNotificationsCount: (updater: (prevCount: number) => number) => void;
}

export default function NotificationCard({
    notification,
    updateFlaggedNotificationsCount,
}: NotificationCardProps): React.JSX.Element {
    const { id, message, timestamp, is_marked_unread } = notification;
    const [unreadStatus, setUnreadStatus] = useState(is_marked_unread);
    const router = useRouter();

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
            updateFlaggedNotificationsCount(
                (prevCount) => prevCount + (variables.is_marked_unread ? 1 : -1),
            );
            setUnreadStatus(variables.is_marked_unread);
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
                    query: { download_url: false },
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

    const formattedDate = timestamp
        ? format(new Date(timestamp), 'dd/MM/yyyy, HH:mm')
        : 'N/A';

    return (
        <Card className='py-0 gap-0'>
            <CardContent className='p-3'>
                {/* Content */}
                <div className='min-w-0'>
                    {/* Meta row: date + read/unread */}
                    <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground text-xs'>
                            {formattedDate}
                        </span>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant='ghost'
                                    size='icon-sm'
                                    className='p-1.5 hover:bg-secondary'
                                    onClick={handleMarkUnread}
                                >
                                    {unreadStatus ? (
                                        <EnvelopeIcon
                                            size={16}
                                            weight='bold'
                                            className='text-primary'
                                            data-testid='mark-read'
                                        />
                                    ) : (
                                        <EnvelopeOpenIcon
                                            size={16}
                                            weight='bold'
                                            className='text-muted-foreground hover:text-foreground'
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

                    {/* Message */}
                    <p className='text-foreground text-sm leading-relaxed mt-1'>
                        {message}
                    </p>
                </div>
                <div className='flex justify-end gap-2 mt-1'>
                    {notification.notification_type ===
                        'request_access_notification' && (
                        <>
                            <Button
                                variant='outline'
                                size='sm'
                                className='px-2.5 py-1 text-xs font-medium text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                                onClick={handleChangeAccess('read')}
                            >
                                Read
                            </Button>
                            <Button
                                variant='outline'
                                size='sm'
                                className='px-2.5 py-1 text-xs font-medium text-primary border-primary/30 hover:bg-primary/10'
                                onClick={handleChangeAccess('read-write')}
                            >
                                Read/Write
                            </Button>
                        </>
                    )}

                    {notification.notification_type === 'new_user_notification' && (
                        <Button
                            variant='outline'
                            size='sm'
                            className='px-2.5 py-1 text-xs font-medium text-primary border-primary/30 hover:bg-primary/10'
                            onClick={handleActivateUser}
                        >
                            Activate User
                        </Button>
                    )}

                    {notification.notification_type ===
                        'report_render_notification' && (
                        <Button
                            variant='outline'
                            size='sm'
                            className='px-2.5 py-1 text-xs font-medium text-muted-foreground border-border hover:border-primary hover:text-primary'
                            onClick={handleViewReport}
                        >
                            View Report
                        </Button>
                    )}

                    {notification.notification_type ===
                        'report_processing_error_notification' && (
                        <Button
                            variant='outline'
                            size='sm'
                            className='px-2.5 py-1 text-xs font-medium text-muted-foreground border-border hover:border-primary hover:text-primary'
                            onClick={() => router.navigate({ to: '/reports' })}
                        >
                            View Details
                        </Button>
                    )}

                    {notification.notification_type ===
                        'enrichment_complete_notification' && (
                        <Button
                            variant='outline'
                            size='sm'
                            className='px-2.5 py-1 text-xs font-medium text-muted-foreground border-border hover:border-primary hover:text-primary'
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
                            View Enrichment
                        </Button>
                    )}

                    {notification.notification_type ===
                        'enrichment_error_notification' && (
                        <Button
                            variant='outline'
                            size='sm'
                            className='px-2.5 py-1 text-xs font-medium text-muted-foreground border-border hover:border-primary hover:text-primary'
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
                            View Details
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
