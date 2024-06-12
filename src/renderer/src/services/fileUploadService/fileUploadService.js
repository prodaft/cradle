import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

/**
 * Make a GET request to `/file-transfer/upload`.
 * This fetches a presigned URL that can be used to upload a file to an external `minio` instance.
 * See the OpenAPI specification for more information.
 *
 * @param {string} token - the JWT access token
 * @param {string} fileName - the name of the file (e.g. 'file.txt')
 * @returns {Promise<AxiosResponse<any>>} a presigned URL that can be used to upload the file,
 *                                        the name of the bucket and the name of the file
 * @example const { presigned, bucket_name, minio_file_link } = getUploadLink(token, 'file.txt');
 */
const getUploadLink = (token, fileName) => {
    return axios({
        url: '/file-transfer/upload',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        params: {
            fileName: fileName,
        },
    });
};

/**
 * Upload a file using a (presigned) URL
 *
 * @param {string} uploadUrl - the (presigned) URL to upload the file to
 * @param {File} file - the file to be uploaded
 * @returns {Promise<AxiosResponse<any>>}
 */
const uploadFile = (uploadUrl, file) => {
    return axios({
        url: uploadUrl,
        method: 'PUT',
        data: file,
        headers: {
            'Content-Type': file.type,
        },
    });
};

/**
 * Make a GET request to `/file-transfer/download`.
 * See the OpenAPI specification for more information.
 *
 * @param {string} token - the JWT access token
 * @param {string} path - the path to request the download link from
 * @returns {Promise<AxiosResponse<any>>} a JSON containing presigned URL that can be used to download the file
 */
const getDownloadLink = (token, path) => {
    return axios({
        url: path,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
};

/**
 * Make a GET request to download a file
 *
 * @param {string} url - the URL to download the file from
 * @returns {Promise<AxiosResponse<Blob>>} the file
 */
const downloadFile = (url) => {
    return axios({
        url: url,
        method: 'GET',
        responseType: 'blob',
    });
};

export { getUploadLink, uploadFile, getDownloadLink, downloadFile };
