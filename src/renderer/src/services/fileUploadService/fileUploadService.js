import axios from "axios"

axios.defaults.baseURL = "http://localhost:8000";

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
const getUploadLink = async (token, fileName) => {
    return axios({
        url: '/file-transfer/upload',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        params: {
            fileName: fileName
        }
    })
}

/**
 * Upload a file using a (presigned) URL
 * 
 * @param {string} uploadUrl - the (presigned) URL to upload the file to
 * @param {File} file - the file to be uploaded
 * @returns {Promise<AxiosResponse<any>>}
 */
const uploadFile = async (uploadUrl, file) => {
    return axios.put(uploadUrl, file, {
        headers: {
            'Content-Type': file.type,
        },
    });
}


/**
 * Make a GET request to `/file-transfer/download`.
 * See the OpenAPI specification for more information.
 * 
 * @param {string} token - the JWT access token
 * @param {string} bucketName - the name of the bucket, probably the user's username
 * @param {string} minioFileName - the name of the file in minio. This is of the form `<uuid>-<filename>`
 * @returns {Promise<AxiosResponse<any>>} a JSON containing presigned URL that can be used to download the file
 */
const getDownloadLink = async (token, bucketName, minioFileName) => {
    return axios({
        url: '/file-transfer/download',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        params: {
            bucketName: bucketName,
            minioFileName: minioFileName,
        }
    })
}

export { getUploadLink, uploadFile }