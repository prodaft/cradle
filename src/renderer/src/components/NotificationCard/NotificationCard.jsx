import { useState } from 'react';
import { markUnread } from '../../services/notificationsService/notificationsService';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { Mail, MailOpen } from 'iconoir-react';
import { changeAccess } from '../../services/adminService/adminService';

/**
 * The notification object contains the details of a notification.
 * It is equivalent to the Notification type in the backend.
 * @typedef {Object} Notification
 * @property {string} id - The unique identifier of the notification.
 * @property {string} message - The message contained in the notification.
 * @property {string} timestamp - The timestamp when the notification was created.
 * @property {boolean} is_marked_unread - A flag indicating whether the notification is marked as unread.
 * @property {string} notification_type - The type of notification.
 * @property {string} case_id - The case ID associated with the notification.
 * @property {string} requesting_user_id - The user ID of the user requesting access.
 */

/**
 * NotificationCard is a functional component in React that displays a notification card.
 * It takes a prop, 'notification', which is an object containing the details of the notification.
 * The component deconstructs the 'notification' object into its properties and displays them in a card format.
 * If the notification type is 'request_access_notification', additional options for granting access are displayed.
 * The options include 'Read' and 'Read/Write' access levels, when clicked, the access level is changed for the user requesting access.
 * The component also provides a button to mark the notification as read or unread.
 *
 * @component
 * @param {Notification} notification - The notification object containing the details of the notification.
 * @param {(Object) => void} setAlert - A function to set an alert in the parent component
 * @param updateFlaggedNotificationsCount - A function to update the count of flagged notifications in the parent component
 * @returns {NotificationCard} A card displaying the details of the notification.
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
        notification_type,
        case_id,
        requesting_user_id,
    } = notification;
    const [isMarkedUnread, setIsMarkedUnread] = useState(is_marked_unread);
    const auth = useAuth();

    const handleMarkUnread = (id) => {
        markUnread(auth.access, id, !isMarkedUnread)
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
            .catch(displayError(setAlert));
    };

    const handleChangeAccess = (newAccess) => () => {
        changeAccess(auth.access, requesting_user_id, case_id, newAccess)
            .then((response) => {
                if (response.status === 200) {
                    setAlert({
                        show: true,
                        message: 'Access level changed successfully',
                        color: 'green',
                    });
                }
            })
            .catch(displayError(setAlert));
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
        </div>
    );
}
