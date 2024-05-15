import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://127.0.0.1:8000";


export async function createActor(data,token) {
    return axios({
        method: "post",
        url: "/entities/actors/",
        data: data,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`}
    });
}

export async function createCase(data, token) {
    return axios({
        method: "post",
        url: "/entities/actors/",
        data: data,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    });
}


