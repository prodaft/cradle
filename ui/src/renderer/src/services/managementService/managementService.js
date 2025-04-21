import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Function to get the current system settings
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getSettings() {
    return authAxios({
        method: 'GET',
        url: '/management/settings/',
    });
}

/**
 * Function to update the system settings
 *
 * @param {Object} settings - The settings object to be saved
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function setSettings(settings) {
    return authAxios({
        method: 'POST',
        url: '/management/settings/',
        data: settings,
    });
}

/**
 * Function to perform a specific action
 *
 * @param {string} actionName - Name of the action to perform
 * @param {Object} [payload={}] - Optional payload to include with the action
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function performAction(actionName, payload = {}) {
    return authAxios({
        method: 'POST',
        url: `/management/actions/${actionName}`,
        data: payload,
    });
}
