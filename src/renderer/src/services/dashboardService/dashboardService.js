import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://localhost:8000";

/**
 * Function to get dashboard data from the API
 * Passes the token and path to the API
 * @param token
 * @param path
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function getDashboardData(token, path){
    return axios({
        method: "GET",
        url: path,
        withCredentials: true,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        }
    })
}

// TODO - check openapi, add to checkbox, add to dashboard
export function setPublishableStatus(token, path, status){
    return axios({
        method: "POST",
        url: path,
        withCredentials: true,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        data: {
            publishable: status
        }
    })
}