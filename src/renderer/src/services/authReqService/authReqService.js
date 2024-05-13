import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://127.0.0.1:8000";

export async function logInReq(data) {
  return await axios({
    method: "post",
    url: "/users/login/",
    data: data,
    headers: { "Content-Type": "application/json" }, 
  });
}

export async function registerReq(data) {
  return await axios({
    method: "post",
    url: "/users/",
    data: data,
    headers: { "Content-Type": "application/json" }, 
  });
}
