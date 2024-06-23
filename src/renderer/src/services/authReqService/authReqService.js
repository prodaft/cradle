import axios from '../axiosInstance/axiosInstance';

/**
 * Sends a POST request to authenticate user
 *
 * @param {{ username: string, password: string }} data - user credentials
 * @returns {Promise<AxiosResponse<any>>}
 */
export async function logInReq(data) {
    return axios({
        method: 'post',
        url: '/users/login/',
        data: data,
    });
}

/**
 * Sends a POST request to register user
 *
 * @param { username: string, password: string } data - user credentials
 * @returns {Promise<AxiosResponse<any>>}
 */
export async function registerReq(data) {
    return axios({
        method: 'post',
        url: '/users/',
        data: data,
    });
}
