import axios from '../axiosInstance/axiosInstance';

/**
 * Make a GET request to `/file-transfer/upload`.
 * This fetches a presigned URL that can be used to upload a file to an external `minio` instance.
 * See the OpenAPI specification for more information.
 *
 * @param {string} fileName - the name of the file (e.g. 'file.txt')
 * @returns {Promise<AxiosResponse<any>>} a presigned URL that can be used to upload the file,
 *                                        the name of the bucket and the name of the file
 * @example const { presigned, bucket_name, minio_file_link } = getUploadLink('file.txt');
 */
const getUploadLink = (fileName) => {
    return axios({
        url: '/file-transfer/upload/',
        method: 'GET',
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
 * @param {string} path - the path to request the download link from
 * @returns {Promise<AxiosResponse<any>>} a JSON containing presigned URL that can be used to download the file
 */
const getDownloadLink = (path) => {
    return axios({
        url: path,
        method: 'GET',
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
