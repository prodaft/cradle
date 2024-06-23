// import axios from 'axios';
import axios from '../axiosInstance/axiosInstance';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

/**
 * Get the count of unread notifications
 *
 * @param {string} token - the user's authentication token
 * @returns {Promise<AxiosResponse<any>>}
 */
export function getNotificationCount(token) {
    return axios({
        method: 'get',
        url: '/notifications/unread-count/',
        // headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Fetch all notifications
 *
 * @param {string} token - the user's authentication token
 * @returns {Promise<AxiosResponse<any>>}
 */
export function getNotifications(token) {
    return axios({
        method: 'get',
        url: '/notifications/',
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Mark a notification as read or unread
 *
 * @param {string} token - the user's authentication token
 * @param {string} notificationId - the id of the notification
 * @param {boolean} flag - the flag that indicates whether the notification should be marked as read or unread
 * @returns {Promise<AxiosResponse<any>>}
 */
export function markUnread(token, notificationId, flag) {
    return axios({
        method: 'put',
        url: `/notifications/${notificationId}/`,
        headers: { Authorization: `Bearer ${token}` },
        data: {
            is_marked_unread: flag,
        },
    });
}
