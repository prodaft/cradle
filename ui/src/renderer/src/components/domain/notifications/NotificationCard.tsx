import { useNotif } from '@/contexts/ui/NotificationContext';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import {
    AccessRequestAccessTypeEnum,
    AccessRequestNotification,
    instanceOfAccessRequestNotification,
    instanceOfNewUserNotification,
    instanceOfReportProcessingErrorNotification,
    instanceOfReportRenderNotification,
    NewUserNotification,
    Notification,
    ReportProcessingErrorNotification,
    ReportRenderNotification,
} from '@/services/cradle';
import { formatDate } from '@/utils/dates';
import Tooltip from '@components/base/Tooltip/Tooltip';
import { Mail, MailOpen } from 'iconoir-react';
import { useState } from 'react';

interface NotificationCardProps {
    notification: Notification;
    updateFlaggedNotificationsCount: (updater: (prevCount: number) => number) => void;
}

export default function NotificationCard({
    notification,
    updateFlaggedNotificationsCount,
}: NotificationCardProps) {
    const { id, message, timestamp, isMarkedUnread } = notification;
    const [unreadStatus, setUnreadStatus] = useState(isMarkedUnread);
    const { reportsApi, notificationsApi, accessApi, usersApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { notify } = useNotif();

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

    const handleViewReport = () => {
        const notif = notification as ReportRenderNotification;
        if (!notif.publishedReportId) return;

        reportsApi
            .reportsRetrieve({ id: notif.publishedReportId })
            .then((report) => {
                if (report.reportUrl) {
                    window.open(report.reportUrl, '_blank');
                } else {
                    notify({
                        type: 'error',
                        text: 'Report URL not found',
                    });
                }
            })
            .catch((error: any) => {
                notify({
                    type: 'error',
                    text: error.response?.data?.detail || 'Failed to view report',
                });
            });
    };

    return (
        <div className='bg-cradle3 bg-opacity-20 p-4 rounded-xl m-3 shadow-md flex flex-col space-y-1'>
            <div className='flex flex-row justify-between'>
                <div className='text-zinc-500 text-xs w-full'>
                    {formatDate(timestamp)}
                </div>
                <Tooltip content={unreadStatus ? 'Mark as read' : 'Mark as unread'}>
                    <span className='pb-1 space-x-1 flex flex-row'>
                        {unreadStatus ? (
                            <Mail
                                width='1.2em'
                                height='1.2em'
                                className='text-cradle2 cursor-pointer'
                                data-testid='mark-read'
                                onClick={() => handleMarkUnread(id!)}
                            />
                        ) : (
                            <MailOpen
                                width='1.2em'
                                height='1.2em'
                                className='text-zinc-500 cursor-pointer'
                                data-testid='mark-unread'
                                onClick={() => handleMarkUnread(id!)}
                            />
                        )}
                    </span>
                </Tooltip>
            </div>
            <p>{message}</p>
            {instanceOfAccessRequestNotification(notification) && (
                <div className='flex flex-row justify-between items-center flex-wrap'>
                    <div className='text-sm text-zinc-400'>Give access:</div>
                    <div className='flex flex-row justify-end items-center space-x-2'>
                        <button
                            className='btn btn-solid-warning btn-sm'
                            onClick={handleChangeAccess('read')}
                        >
                            Read
                        </button>
                        <button
                            className='btn btn-solid-success btn-sm'
                            onClick={handleChangeAccess('read-write')}
                        >
                            Read/Write
                        </button>
                    </div>
                </div>
            )}
            {instanceOfNewUserNotification(notification) && (
                <div className='flex flex-row justify-end items-center flex-wrap'>
                    <button
                        className='btn btn-solid-success btn-sm'
                        onClick={handleActivateUser}
                    >
                        Activate
                    </button>
                </div>
            )}
            {instanceOfReportRenderNotification(notification) && (
                <div className='flex flex-row justify-end items-center flex-wrap'>
                    <button
                        className='btn btn-solid-secondary btn-sm'
                        onClick={handleViewReport}
                    >
                        View Report
                    </button>
                </div>
            )}
            {instanceOfReportProcessingErrorNotification(notification) && (
                <div className='flex flex-row justify-end items-center flex-wrap'>
                    <button
                        className='btn btn-solid-secondary btn-sm'
                        onClick={(e) => {
                            const notif =
                                notification as ReportProcessingErrorNotification;
                            navigateLink(`/reports/${notif.publishedReportId}`)(e);
                        }}
                    >
                        View Details
                    </button>
                </div>
            )}
        </div>
    );
}
