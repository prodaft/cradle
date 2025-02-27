import { useState } from 'react';
import { markUnread } from '../../services/notificationsService/notificationsService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { Mail, MailOpen } from 'iconoir-react';
import { changeAccess, activateUser } from '../../services/adminService/adminService';
import { useNavigate } from 'react-router-dom';
import { getReport } from '../../services/publishService/publishService';

/**
 * @typedef {Object} Notification
 * @property {string} id - The unique identifier of the notification.
 * @property {string} message - The message contained in the notification.
 * @property {string} timestamp - The timestamp when the notification was created.
 * @property {boolean} is_marked_unread - A flag indicating whether the notification is marked as unread.
 * @property {string} notification_type - The type of notification.
 * @property {string} entity_id - The entity ID associated with the notification.
 * @property {string} requesting_user_id - The user ID of the user requesting access.
 * @description The notification object contains the details of a notification. It is equivalent to the Notification type in the backend.
 */

/**
 * @function updateFlaggedNotificationsCount
 * @param {number} prevCount - The previous count of flagged notifications.
 * @returns {number} The updated count of flagged notifications.
 */

/**
 * NotificationCard is a functional component in React that displays a notification card.
 * It takes a prop, 'notification', which is an object containing the details of the notification.
 * The component deconstructs the 'notification' object into its properties and displays them in a card format.
 * If the notification type is 'request_access_notification', additional options for granting access are displayed.
 * The options include 'Read' and 'Read/Write' access levels, when clicked, the access level is changed for the user requesting access.
 * The component also provides a button to mark the notification as read or unread.
 *
 * @function NotificationCard
 * @param {Object} props - The props of the component.
 * @param {Notification} props.notification - The notification object containing the details of the notification.
 * @param {StateSetter<Alert>} props.setAlert - A function to set an alert in the parent component
 * @param {updateFlaggedNotificationsCount} props.updateFlaggedNotificationsCount - A function to update the count of flagged notifications in the parent component
 * @returns {NotificationCard} A card displaying the details of the notification.
 * @constructor
 */
export default function NotificationCard({
    notification,
    setAlert,
    updateFlaggedNotificationsCount,
}) {
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
    const navigate = useNavigate();


    const handleMarkUnread = (id) => {
        markUnread(id, !isMarkedUnread)
            .then((response) => {
                if (response.status === 200) {
                    if (isMarkedUnread) {
                        updateFlaggedNotificationsCount((prevCount) => prevCount - 1);
                    } else {
                        updateFlaggedNotificationsCount((prevCount) => prevCount + 1);
                    }
                    setIsMarkedUnread(!isMarkedUnread);
                }
            })
            .catch(displayError(setAlert, navigate));
    };

    const handleChangeAccess = (newAccess) => () => {
        changeAccess(requesting_user_id, entity_id, newAccess)
            .then((response) => {
                if (response.status === 200) {
                    setAlert({
                        show: true,
                        message: 'Access level changed successfully',
                        color: 'green',
                    });
                }
            })
            .catch(displayError(setAlert, navigate));
    };

    const handleActivateUser = () => {
        activateUser(new_user.id)
            .then((response) => {
                if (response.status === 200) {
                    setAlert({
                        show: true,
                        message: 'User activated successfully.',
                        color: 'green',
                    });
                }
            })
            .catch(displayError(setAlert, navigate));
    };

    const handleViewReport = () => {
      getReport(published_report_id).then((response) => {
        if (response.status === 200) {
          window.open(response.data.report_url, '_blank');
        }
      }).catch(displayError(setAlert, navigate));
    };

    const handleGoToReport = () => {
      navigate(`/reports/${published_report_id}`);
    };

    return (
        <div className='bg-cradle3 bg-opacity-20 p-4 backdrop-blur-lg rounded-xl m-3 shadow-md flex flex-col space-y-1'>
            <div className='flex flex-row justify-between'>
                <div className='text-zinc-500 text-xs w-full'>
                    {new Date(timestamp).toLocaleString()}
                </div>
                <span
                    className='pb-1 space-x-1 flex flex-row tooltip tooltip-left'
                    data-tooltip={isMarkedUnread ? 'Mark as read' : 'Mark as unread'}
                >
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
                        onClick={handleGoToReport}
                    >
                      View Details
                    </button>
                </div>
            )}
        </div>
    );
}
