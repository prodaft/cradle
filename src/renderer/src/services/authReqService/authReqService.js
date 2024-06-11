import axios from 'axios';

axios.defaults.withCredentials = false;
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

/**
 * Sends a POST request to authenticate user
 * @param data
 * @returns {Promise<AxiosResponse<any>>}
 */
export async function logInReq(data) {
    return axios({
        method: 'post',
        url: '/users/login/',
        data: data,
        headers: { 'Content-Type': 'application/json' },
    });
}

/**
 * Sends a POST request to register user
 * @param data
 * @returns {Promise<AxiosResponse<any>>}
 */
export async function registerReq(data) {
    return axios({
        method: 'post',
        url: '/users/',
        data: data,
        headers: { 'Content-Type': 'application/json' },
    });
}
