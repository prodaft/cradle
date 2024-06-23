import axios from '../axiosInstance/axiosInstance';

/**
 * Get the count of unread notifications
 *
 * @returns {Promise<AxiosResponse<any>>}
 */
export function getNotificationCount() {
    return axios({
        method: 'get',
        url: '/notifications/unread-count/',
    });
}

/**
 * Fetch all notifications
 *
 * @returns {Promise<AxiosResponse<any>>}
 */
export function getNotifications() {
    return axios({
        method: 'get',
        url: '/notifications/',
    });
}

/**
 * Mark a notification as read or unread
 *
 * @param {string} notificationId - the id of the notification
 * @param {boolean} flag - the flag that indicates whether the notification should be marked as read or unread
 * @returns {Promise<AxiosResponse<any>>}
 */
export function markUnread(notificationId, flag) {
    return axios({
        method: 'put',
        url: `/notifications/${notificationId}/`,
        data: {
            is_marked_unread: flag,
        },
    });
}
