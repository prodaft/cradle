import useApi from '@/hooks/api/use-api';
import { EnvelopeIcon, EnvelopeOpenIcon } from '@phosphor-icons/react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from 'src/components/ui/button';
import { Card, CardContent } from 'src/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from 'src/components/ui/tooltip';
import {
    AccessRequestAccessTypeEnum,
    AccessRequestNotification,
    EnrichmentCompleteNotification,
    EnrichmentErrorNotification,
    NewUserNotification,
    Notification,
    ReportRenderNotification,
} from 'src/services/cradle';

interface NotificationCardProps {
    notification: Notification;
    updateFlaggedNotificationsCount: (updater: (prevCount: number) => number) => void;
}

export default function NotificationCard({
    notification,
    updateFlaggedNotificationsCount,
}: NotificationCardProps): React.JSX.Element {
    const { id, message, timestamp, isMarkedUnread } = notification;
    const [unreadStatus, setUnreadStatus] = useState(isMarkedUnread);
    const { reportsApi, notificationsApi, accessApi, usersApi } = useApi();
    const router = useRouter();

    const markUnreadMutation = useMutation({
        mutationFn: async (id: string) => {
            await notificationsApi.notificationsUpdate({
                notificationId: id,
                updateNotificationRequest: {
                    isMarkedUnread: !unreadStatus,
                },
            });
        },
        meta: {
            errorMessage: 'Failed to update notification',
            suppressNotification: true, // We handle state updates ourselves
        },
        onSuccess: () => {
            if (unreadStatus) {
                updateFlaggedNotificationsCount((prevCount) => prevCount - 1);
            } else {
                updateFlaggedNotificationsCount((prevCount) => prevCount + 1);
            }
            setUnreadStatus(!unreadStatus);
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
            accessType: AccessRequestAccessTypeEnum;
        }) => {
            await accessApi.accessUserUpdate({
                userId: userId,
                entityId: Number(entityId),
                accessRequest: {
                    accessType,
                },
            });
        },
        meta: {
            successMessage: 'Access level changed successfully',
            errorMessage: 'Failed to change access',
        },
    });

    const activateUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            await usersApi.usersUpdate({
                userId,
                userUpdateRequest: {
                    isActive: true,
                },
            });
        },
        meta: {
            successMessage: 'User activated successfully.',
            errorMessage: 'Failed to activate user',
        },
    });

    const viewReportMutation = useMutation({
        mutationFn: async (reportId: string) => {
            const report = await reportsApi.reportsRetrieve({
                id: reportId,
                downloadUrl: false,
            });
            return report.reportUrl;
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
        markUnreadMutation.mutate(id!);
    };

    const handleChangeAccess = (newAccess: AccessRequestAccessTypeEnum) => () => {
        const notif = notification as AccessRequestNotification;
        if (!notif.requestingUserId || !notif.entityId) return;
        changeAccessMutation.mutate({
            userId: notif.requestingUserId,
            entityId: notif.entityId!,
            accessType: newAccess,
        });
    };

    const handleActivateUser = () => {
        const notif = notification as NewUserNotification;
        if (!notif.newUser) return;
        activateUserMutation.mutate(notif.newUser.id!);
    };

    const handleViewReport = () => {
        const notif = notification as ReportRenderNotification;
        if (!notif.publishedReportId) return;
        viewReportMutation.mutate(notif.publishedReportId);
    };

    const formattedDate = timestamp
        ? format(new Date(timestamp), 'dd/MM/yyyy, HH:mm')
        : 'N/A';

    return (
        <Card className='py-0 gap-0'>
            <CardContent className='p-3'>
                {/* Content */}
                <div className='flex-1 min-w-0'>
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
                    {notification.notificationType ===
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

                    {notification.notificationType === 'new_user_notification' && (
                        <Button
                            variant='outline'
                            size='sm'
                            className='px-2.5 py-1 text-xs font-medium text-primary border-primary/30 hover:bg-primary/10'
                            onClick={handleActivateUser}
                        >
                            Activate User
                        </Button>
                    )}

                    {notification.notificationType === 'report_render_notification' && (
                        <Button
                            variant='outline'
                            size='sm'
                            className='px-2.5 py-1 text-xs font-medium text-muted-foreground border-border hover:border-primary hover:text-primary'
                            onClick={handleViewReport}
                        >
                            View Report
                        </Button>
                    )}

                    {notification.notificationType ===
                        'report_processing_error_notification' && (
                        <Button
                            variant='outline'
                            size='sm'
                            className='px-2.5 py-1 text-xs font-medium text-muted-foreground border-border hover:border-primary hover:text-primary'
                            onClick={() => {
                                router.navigate({ to: '/reports' });
                            }}
                        >
                            View Details
                        </Button>
                    )}

                    {notification.notificationType ===
                        'enrichment_complete_notification' && (
                        <Button
                            variant='outline'
                            size='sm'
                            className='px-2.5 py-1 text-xs font-medium text-muted-foreground border-border hover:border-primary hover:text-primary'
                            onClick={(e) => {
                                const notif =
                                    notification as EnrichmentCompleteNotification;
                                router.navigate({
                                    to: '/enrichment/$id',
                                    params: {
                                        id: notif.enrichmentRequestId.toString(),
                                    },
                                });
                            }}
                        >
                            View Enrichment
                        </Button>
                    )}

                    {notification.notificationType ===
                        'enrichment_error_notification' && (
                        <Button
                            variant='outline'
                            size='sm'
                            className='px-2.5 py-1 text-xs font-medium text-muted-foreground border-border hover:border-primary hover:text-primary'
                            onClick={(e) => {
                                const notif =
                                    notification as EnrichmentErrorNotification;
                                router.navigate({
                                    to: '/enrichment/$id',
                                    params: {
                                        id: notif.enrichmentRequestId.toString(),
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
