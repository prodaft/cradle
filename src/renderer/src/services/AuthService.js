import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://127.0.0.1:8000";

export async function logInReq(data) {
    return await axios({
        method: "post",
        url: "/users/login/",
        data: data,
        headers: { "Content-Type": "multipart/form-data; charset=UTF-8" },
      });
}

export async function logOutReq(authData) {
    return await axios({
        method: "post",
        url: "/users/logout/",
        headers: {
          "Content-Type":"application/json",
          "X_CSRFTOKEN":authData.csrftoken,
        }
      })
}

export async function registerReq(data) {
  return await axios({
    method: "post",
    url: "/users/",
    data: data,
    headers: { "Content-Type": "multipart/form-data" },
  })
}