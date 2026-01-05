import { useNotif } from '@/contexts/ui/NotificationContext';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import {
    AccessRequestAccessTypeEnum,
    AccessRequestNotification,
    EnrichmentCompleteNotification,
    EnrichmentErrorNotification,
    NewUserNotification,
    Notification,
    ReportProcessingErrorNotification,
    ReportRenderNotification
} from '@/services/cradle';
import { formatDate } from '@/utils/dates';
import Tooltip from '@components/base/Tooltip/Tooltip';
import { Mail, MailOpen } from 'iconoir-react';
import { useState } from 'react';

interface NotificationCardProps {
    notification: Notification;
    updateFlaggedNotificationsCount: (updater: (prevCount: number) => number) => void;
}

const ActionBar = ({ children }: { children: React.ReactNode }) => {
    if (!children) return null;

    return (
        <div className='flex justify-end gap-2 mt-1'>
            {children}
        </div>
    );
};


export default function NotificationCard({
    notification,
    updateFlaggedNotificationsCount,
}: NotificationCardProps) {
    const { id, message, timestamp, isMarkedUnread } = notification;
    const [unreadStatus, setUnreadStatus] = useState(isMarkedUnread);
    const { reportsApi, notificationsApi, accessApi, usersApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { execute } = useAPICall();
    const { notify } = useNotif();
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
                notify({
                    type: 'error',
                    text:
                        error.response?.data?.detail || 'Failed to update notification',
                });
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
                notify({
                    type: 'success',
                    text: 'Access level changed successfully',
                });
            })
            .catch((error: any) => {
                notify({
                    type: 'error',
                    text: error.response?.data?.detail || 'Failed to change access',
                });
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
                notify({
                    type: 'success',
                    text: 'User activated successfully.',
                });
            })
            .catch((error: any) => {
                notify({
                    type: 'error',
                    text: error.response?.data?.detail || 'Failed to activate user',
                });
            });
    };

    const handleViewReport = async () => {
        const notif = notification as ReportRenderNotification;
        if (!notif.publishedReportId) return;

        let report = await execute(() => reportsApi.reportsRetrieve({ id: notif.publishedReportId, downloadUrl: false }));

        if (report.reportUrl) {
            window.open(report.reportUrl, '_blank');
        } else {
            notify({
                type: 'error',
                text: 'Report URL not found',
            });
        }
    };

    const formattedDate = timestamp ? formatDate(new Date(timestamp)) : 'N/A';

    return (
        <div className='cradle-card p-3'>
            {/* Content */}
            <div className='flex-1 min-w-0'>
                {/* Meta row: date + read/unread */}
                <div className='flex items-center justify-between'>
                    <span className='text-cradle-text-muted text-xs'>
                        {formattedDate}
                    </span>

                    <Tooltip content={unreadStatus ? 'Mark as read' : 'Mark as unread'}>
                        <button
                            className='p-1.5 hover:bg-cradle-bg-secondary rounded transition-colors'
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
                        </button>
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
                        <button
                            className='px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-400/30 hover:bg-amber-400/10 rounded transition-colors'
                            onClick={handleChangeAccess('read')}
                        >
                            Read
                        </button>
                        <button
                            className='px-2.5 py-1 text-xs font-medium text-green-400 border border-green-400/30 hover:bg-green-400/10 rounded transition-colors'
                            onClick={handleChangeAccess('read-write')}
                        >
                            Read/Write
                        </button>
                    </>
                )}

                {notification.notificationType === 'new_user_notification' && (
                    <button
                        className='px-2.5 py-1 text-xs font-medium text-green-400 border border-green-400/30 hover:bg-green-400/10 rounded transition-colors'
                        onClick={handleActivateUser}
                    >
                        Activate User
                    </button>
                )}

                {notification.notificationType === 'report_render_notification' && (
                    <button
                        className='px-2.5 py-1 text-xs font-medium text-cradle-text-secondary border border-cradle-border-accent hover:border-[#FF8C00] hover:text-[#FF8C00] rounded transition-colors'
                        onClick={handleViewReport}
                    >
                        View Report
                    </button>
                )}

                {notification.notificationType === 'report_processing_error_notification' && (
                    <button
                        className='px-2.5 py-1 text-xs font-medium text-cradle-text-secondary border border-cradle-border-accent hover:border-[#FF8C00] hover:text-[#FF8C00] rounded transition-colors'
                        onClick={(e) => {
                            const notif = notification as ReportProcessingErrorNotification;
                            navigateLink(`/reports/${notif.publishedReportId}`)(e);
                        }}
                    >
                        View Details
                    </button>
                )}

                {notification.notificationType === 'enrichment_complete_notification' && (
                    <button
                        className='px-2.5 py-1 text-xs font-medium text-cradle-text-secondary border border-cradle-border-accent hover:border-[#FF8C00] hover:text-[#FF8C00] rounded transition-colors'
                        onClick={(e) => {
                            const notif = notification as EnrichmentCompleteNotification;
                            navigateLink(`/enrichment/${notif.enrichmentRequestId}`)(e);
                        }}
                    >
                        View Enrichment
                    </button>
                )}

                {notification.notificationType === 'enrichment_error_notification' && (
                    <button
                        className='px-2.5 py-1 text-xs font-medium text-cradle-text-secondary border border-cradle-border-accent hover:border-[#FF8C00] hover:text-[#FF8C00] rounded transition-colors'
                        onClick={(e) => {
                            const notif = notification as EnrichmentErrorNotification;
                            navigateLink(`/enrichment/${notif.enrichmentRequestId}`)(e);
                        }}
                    >
                        View Details
                    </button>
                )}
            </ActionBar>

        </div>
    );
}
