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
        url: "/entities/cases/",
        data: data,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    });
}

export async function getActors(token) {
    return axios({
        method: "get",
        url: "/entities/actors/",
        headers: {"Authorization": `Bearer ${token}`}
    });
}

export async function getCases(token) {
    return axios({
        method: "get",
        url: "/entities/cases/",
        headers: {"Authorization": `Bearer ${token}`}
    });
}

export async function getUsers(token) {
    return axios({
        method: "get",
        url: "/users/",
        headers: {"Authorization": `Bearer ${token}`}
    });
}

export async function deleteEntity(token,type ,id){
    return axios({
        method: "delete",
        url: `/${type}/${id}/`,
        headers: {"Authorization": `Bearer ${token}`}
    })
}



