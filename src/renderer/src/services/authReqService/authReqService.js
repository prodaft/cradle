import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://127.0.0.1:8000";

/**
 * Sends a POST request to authenticate user
 * @param data
 * @returns {Promise<AxiosResponse<any>>}
 */
export async function logInReq(data) {
  return await axios({
    method: "post",
    url: "/users/login/",
    data: data,
    headers: { "Content-Type": "application/json" }, 
  });
}

/**
 * Sends a POST request to register user
 * @param data
 * @returns {Promise<AxiosResponse<any>>}
 */
export async function registerReq(data) {
  return await axios({
    method: "post",
    url: "/users/",
    data: data,
    headers: { "Content-Type": "application/json" }, 
  });
}
