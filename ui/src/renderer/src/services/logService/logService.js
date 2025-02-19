import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Function to retrieve event logs with optional filters
 *
 * @param {Object} filters - Optional filters for event logs, including:
 *   - {string} type - Event type (case-insensitive)
 *   - {number} username - Username
 *   - {string} start_date - Start timestamp in ISO format
 *   - {string} end_date - End timestamp in ISO format
 *   - {string} content_type - Content type model (case-insensitive)
 *   - {string} object_id - UUID of the object
 *   - {number} page - Page number for pagination
 *   - {number} page_size - Number of items per page
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const getEventLogs = (filters = {}) => {
    // Remove empty filters
    Object.keys(filters).forEach((key) => !filters[key] && delete filters[key]);
    return authAxios({
        method: 'get',
        url: '/logs/',
        params: filters,
    });
};

export { getEventLogs };
