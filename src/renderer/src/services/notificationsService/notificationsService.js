import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Get the count of unread notifications
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getNotificationCount() {
    return authAxios({
        method: 'get',
        url: '/notifications/unread-count/',
    });
}

/**
 * Fetch all notifications
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getNotifications() {
    return authAxios({
        method: 'get',
        url: '/notifications/',
    });
}

/**
 * Mark a notification as read or unread
 *
 * @param {string} notificationId - the id of the notification
 * @param {boolean} isUnread - the flag that indicates whether the notification should be marked as unread
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function markUnread(notificationId, isUnread) {
    return authAxios({
        method: 'put',
        url: `/notifications/${notificationId}/`,
        data: {
            is_marked_unread: isUnread,
        },
    });
}
