import React from 'react';
import { toast } from 'sonner';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { Card, CardContent } from '@/components/ui/card';
import {
    AccessRequestAccessTypeEnum,
    AccessRequestNotification,
    EnrichmentCompleteNotification,
    EnrichmentErrorNotification,
    NewUserNotification,
    Notification,
    ReportProcessingErrorNotification,
    ReportRenderNotification,
} from '@/services/cradle';
import { formatDate } from '@/utils/dates';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Mail, MailOpen } from 'iconoir-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface NotificationCardProps {
    notification: Notification;
    updateFlaggedNotificationsCount: (updater: (prevCount: number) => number) => void;
}

const ActionBar = ({ children }: { children: React.ReactNode }) => {
    if (!children) return null;

    return <div className='flex justify-end gap-2 mt-1'>{children}</div>;
};

export default function NotificationCard({
    notification,
    updateFlaggedNotificationsCount,
}: NotificationCardProps): React.JSX.Element {
    const { id, message, timestamp, isMarkedUnread } = notification;
    const [unreadStatus, setUnreadStatus] = useState(isMarkedUnread);
    const { reportsApi, notificationsApi, accessApi, usersApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { execute } = useAPICall();
    console.log(notification);

    const handleMarkUnread = (id: string) => {
        notificationsApi
            .notificationsUpdate({
                notificationId: id,
                updateNotificationRequest: {
                    isMarkedUnread: !unreadStatus,
                },
            })
            .then(() => {
                if (unreadStatus) {
                    updateFlaggedNotificationsCount((prevCount) => prevCount - 1);
                } else {
                    updateFlaggedNotificationsCount((prevCount) => prevCount + 1);
                }
                setUnreadStatus(!unreadStatus);
            })
            .catch((error: any) => {
                toast.error(error.response?.data?.detail || 'Failed to update notification');
            });
    };

    const handleChangeAccess = (newAccess: AccessRequestAccessTypeEnum) => () => {
        const notif = notification as AccessRequestNotification;
        if (!notif.requestingUserId || !notif.entityId) return;

        accessApi
            .accessUserUpdate({
                userId: notif.requestingUserId,
                entityId: notif.entityId!,
                accessRequest: {
                    accessType: newAccess,
                },
            })
            .then(() => {
                toast.success('Access level changed successfully');
            })
            .catch((error: any) => {
                toast.error(error.response?.data?.detail || 'Failed to change access');
            });
    };

    const handleActivateUser = () => {
        const notif = notification as NewUserNotification;
        if (!notif.newUser) return;

        usersApi
            .usersUpdate({
                userId: notif.newUser.id!,
                userUpdateRequest: {
                    isActive: true,
                },
            })
            .then(() => {
                toast.success('User activated successfully.');
            })
            .catch((error: any) => {
                toast.error(error.response?.data?.detail || 'Failed to activate user');
            });
    };

    const handleViewReport = async () => {
        const notif = notification as ReportRenderNotification;
        if (!notif.publishedReportId) return;

        let report = await execute(() =>
            reportsApi.reportsRetrieve({
                id: notif.publishedReportId,
                downloadUrl: false,
            }),
        );

        if (report.reportUrl) {
            window.open(report.reportUrl, '_blank');
        } else {
            toast.error('Report URL not found');
        }
    };

    const formattedDate = timestamp ? formatDate(new Date(timestamp)) : 'N/A';

    return (
        <Card>
            <CardContent className='p-3'>
                {/* Content */}
                <div className='flex-1 min-w-0'>
                {/* Meta row: date + read/unread */}
                <div className='flex items-center justify-between'>
                    <span className='text-cradle-text-muted text-xs'>
                        {formattedDate}
                    </span>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant='ghost'
                                size='icon-sm'
                                className='p-1.5 hover:bg-cradle-bg-secondary'
                                onClick={() => handleMarkUnread(id!)}
                            >
                                {unreadStatus ? (
                                    <Mail
                                        width='16'
                                        height='16'
                                        className='text-[#FF8C00]'
                                        data-testid='mark-read'
                                    />
                                ) : (
                                    <MailOpen
                                        width='16'
                                        height='16'
                                        className='text-cradle-text-muted hover:text-cradle-text-primary'
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
                <p className='text-cradle-text-primary text-sm leading-relaxed mt-1'>
                    {message}
                </p>
            </div>
            <ActionBar>
                {notification.notificationType === 'request_access_notification' && (
                    <>
                        <Button
                            variant='outline'
                            size='sm'
                            className='px-2.5 py-1 text-xs font-medium text-amber-400 border-amber-400/30 hover:bg-amber-400/10'
                            onClick={handleChangeAccess('read')}
                        >
                            Read
                        </Button>
                        <Button
                            variant='outline'
                            size='sm'
                            className='px-2.5 py-1 text-xs font-medium text-green-400 border-green-400/30 hover:bg-green-400/10'
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
                        className='px-2.5 py-1 text-xs font-medium text-green-400 border-green-400/30 hover:bg-green-400/10'
                        onClick={handleActivateUser}
                    >
                        Activate User
                    </Button>
                )}

                {notification.notificationType === 'report_render_notification' && (
                    <Button
                        variant='outline'
                        size='sm'
                        className='px-2.5 py-1 text-xs font-medium text-cradle-text-secondary border-cradle-border-accent hover:border-[#FF8C00] hover:text-[#FF8C00]'
                        onClick={handleViewReport}
                    >
                        View Report
                    </Button>
                )}

                {notification.notificationType === 'report_processing_error_notification' && (
                    <Button
                        variant='outline'
                        size='sm'
                        className='px-2.5 py-1 text-xs font-medium text-cradle-text-secondary border-cradle-border-accent hover:border-[#FF8C00] hover:text-[#FF8C00]'
                        onClick={(e) => {
                            const notif =
                                notification as ReportProcessingErrorNotification;
                            navigateLink(`/reports/${notif.publishedReportId}`)(e);
                        }}
                    >
                        View Details
                    </Button>
                )}

                {notification.notificationType === 'enrichment_complete_notification' && (
                    <Button
                        variant='outline'
                        size='sm'
                        className='px-2.5 py-1 text-xs font-medium text-cradle-text-secondary border-cradle-border-accent hover:border-[#FF8C00] hover:text-[#FF8C00]'
                        onClick={(e) => {
                            const notif =
                                notification as EnrichmentCompleteNotification;
                            navigateLink(`/enrichment/${notif.enrichmentRequestId}`)(e);
                        }}
                    >
                        View Enrichment
                    </Button>
                )}

                {notification.notificationType === 'enrichment_error_notification' && (
                    <Button
                        variant='outline'
                        size='sm'
                        className='px-2.5 py-1 text-xs font-medium text-cradle-text-secondary border-cradle-border-accent hover:border-[#FF8C00] hover:text-[#FF8C00]'
                        onClick={(e) => {
                            const notif = notification as EnrichmentErrorNotification;
                            navigateLink(`/enrichment/${notif.enrichmentRequestId}`)(e);
                        }}
                    >
                        View Details
                    </Button>
                )}
            </ActionBar>
            </CardContent>
        </Card>
    );
}
