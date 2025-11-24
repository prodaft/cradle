import { Mail, MailOpen } from 'iconoir-react';
import { useState } from 'react';
import Tooltip from '@components/base/Tooltip/Tooltip';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { formatDate } from '@/utils/dates';
import { displayError } from '@/utils/api';
import { useNotif } from '@/contexts/ui/NotificationContext';

interface NotificationUser {
    id: string;
    username: string;
}

interface Notification {
    id: string;
    message: string;
    timestamp: string;
    is_marked_unread: boolean;
    published_report_id?: string;
    notification_type: string;
    new_user?: NotificationUser;
    entity_id?: string;
    requesting_user_id?: string;
}

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface NotificationCardProps {
    notification: Notification;
    updateFlaggedNotificationsCount: (updater: (prevCount: number) => number) => void;
}

/**
 * NotificationCard is a functional component in React that displays a notification card.
 * It takes a prop, 'notification', which is an object containing the details of the notification.
 * The component deconstructs the 'notification' object into its properties and displays them in a card format.
 * If the notification type is 'request_access_notification', additional options for granting access are displayed.
 * The options include 'Read' and 'Read/Write' access levels, when clicked, the access level is changed for the user requesting access.
 * The component also provides a button to mark the notification as read or unread.
 *
 * @function NotificationCard
 * @param {NotificationCardProps} props - The props of the component.
 * @returns {NotificationCard} A card displaying the details of the notification.
 * @constructor
 */
export default function NotificationCard({
    notification,
    updateFlaggedNotificationsCount,
}: NotificationCardProps) {
    const {
        id,
        message,
        timestamp,
        is_marked_unread,
        published_report_id,
        notification_type,
        new_user,
        entity_id,
        requesting_user_id,
    } = notification;
    const [isMarkedUnread, setIsMarkedUnread] = useState(is_marked_unread);
    const { reportsApi, notificationsApi, accessApi, usersApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { notify } = useNotif();

    const handleMarkUnread = (id: string) => {
        notificationsApi.notificationsUpdate({
            notificationId: id,
            updateNotificationRequest: {
                isMarkedUnread: !isMarkedUnread
            }
        })
            .then(() => {
                if (isMarkedUnread) {
                    updateFlaggedNotificationsCount((prevCount) => prevCount - 1);
                } else {
                    updateFlaggedNotificationsCount((prevCount) => prevCount + 1);
                }
                setIsMarkedUnread(!isMarkedUnread);
            })
            .catch((error: any) => {
                notify({
                    type: 'error',
                    text: error.response?.data?.detail || 'Failed to update notification',
                });
            });
    };

    const handleChangeAccess = (newAccess: string) => () => {
        if (!requesting_user_id || !entity_id) return;

        accessApi.accessUserUpdate({
            userId: requesting_user_id,
            entityId: entity_id,
            accessRequest: {
                accessType: newAccess
            }
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
        if (!new_user) return;

        usersApi.usersUpdate({
            userId: new_user.id,
            userRetrieveRequest: {
                isActive: true
            }
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
        if (!published_report_id) return;

        reportsApi
            .reportsRetrieve({ id: published_report_id })
            .then((report) => {
                window.open(report.reportUrl, '_blank');
            })
            .catch((error: any) => {
                notify({
                    type: 'error',
                    text: error.response?.data?.detail || 'Failed to view report',
                });
            });
    };

    return (
        <div className='bg-cradle3 bg-opacity-20 p-4 backdrop-blur-lg rounded-xl m-3 shadow-md flex flex-col space-y-1'>
            <div className='flex flex-row justify-between'>
                <div className='text-zinc-500 text-xs w-full'>
                    {formatDate(new Date(timestamp))}
                </div>
                <Tooltip content={isMarkedUnread ? 'Mark as read' : 'Mark as unread'}>
                    <span className='pb-1 space-x-1 flex flex-row'>
                        {isMarkedUnread ? (
                            <Mail
                                width='1.2em'
                                height='1.2em'
                                className='text-cradle2 cursor-pointer'
                                data-testid='mark-read'
                                onClick={() => handleMarkUnread(id)}
                            />
                        ) : (
                            <MailOpen
                                width='1.2em'
                                height='1.2em'
                                className='text-zinc-500 cursor-pointer'
                                data-testid='mark-unread'
                                onClick={() => handleMarkUnread(id)}
                            />
                        )}
                    </span>
                </Tooltip>
            </div>
            <p>{message}</p>
            {notification_type === 'request_access_notification' && (
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
            {notification_type === 'new_user_notification' && (
                <div className='flex flex-row justify-end items-center flex-wrap'>
                    <button
                        className='btn btn-solid-success btn-sm'
                        onClick={handleActivateUser}
                    >
                        Activate
                    </button>
                </div>
            )}
            {notification_type === 'report_render_notification' && (
                <div className='flex flex-row justify-end items-center flex-wrap'>
                    <button
                        className='btn btn-solid-secondary btn-sm'
                        onClick={handleViewReport}
                    >
                        View Report
                    </button>
                </div>
            )}
            {notification_type === 'report_processing_error_notification' && (
                <div className='flex flex-row justify-end items-center flex-wrap'>
                    <button
                        className='btn btn-solid-secondary btn-sm'
                        onClick={navigateLink(`/reports/${published_report_id}`)}
                    >
                        View Details
                    </button>
                </div>
            )}
        </div>
    );
}
