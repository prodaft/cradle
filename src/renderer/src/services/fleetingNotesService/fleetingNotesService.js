import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://localhost:8000";

/**
 * Function to get fleeting notes from the API
 * Passes the token to the API
 *
 * @param token - The (JWT) token to authenticate the request
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function getFleetingNotes(token){
    return axios({
        method: "GET",
        url: "/fleeting-notes/",
        withCredentials: true,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        }
    });
}

/**
 * Function to add a fleeting note
 * Passes the token and content to the API
 *
 * @param token - The (JWT) token to authenticate the request
 * @param content - The content of the note to add (String)
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function addFleetingNote(token, content){
    return axios({
        method: "POST",
        url: "/fleeting-notes/",
        withCredentials: true,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        data: {content:content}
    });

}

/**
 * Function to delete a fleeting note
 * @param token
 * @param id
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function deleteFleetingNote(token, id){
    return axios({
        method: "DELETE",
        url: `/fleeting-notes/${id}/`,
        withCredentials: true,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        }
    });
}

/**
 * Function to update a fleeting note
 * @param token
 * @param id
 * @param content
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function updateFleetingNote(token, id, content){
    return axios({
        method: "PUT",
        url: `/fleeting-notes/${id}/`,
        withCredentials: true,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        data: {content:content}
    });
}

/**
 * Function to get a fleeting note by id
 * @param token
 * @param id
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function getFleetingNoteById(token, id){
    return axios({
        method: "GET",
        url: `/fleeting-notes/${id}/`,
        withCredentials: true,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        }
    });
}

export function saveFleetingNoteAsFinal(token, id, publishable){
    return axios({
        method: "PUT",
        url: `/fleeting-notes/${id}/finalize/`,
        withCredentials: true,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        data: {publishable:publishable}
    });
}