import axios from "axios"

axios.defaults.baseURL = "http://localhost:8000";

/**
 * Make a GET request to `/file-transfer/upload`. 
 * See the OpenAPI specification for more information.
 * 
 * @param {string} token - the JWT access token
 * @param {string} fileName - the name of the file (e.g. 'file.txt')
 * @returns {Promise<AxiosResponse<any>>} a JSON containing a presigned URL that can be used to upload the file
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
 * Upload a file using the presigned URL to a `minio` instance obtained from the server.
 * 
 * @param {string} token - the JWT access token
 * @param {File} file - the file to be uploaded
 * @returns {Promise<AxiosResponse<any>>} a JSON containing the response from the upload request
 */
const uploadFile = async (token, file) => {
    try {
        const uploadLinkResponse = await getUploadLink(token, file.name);
        const uploadUrl = uploadLinkResponse.data.presigned;

        return axios.put(uploadUrl, file, {
            headers: {
                'Content-Type': file.type,
            },
        });
    } catch (err) {
        throw err;
    }
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

export { uploadFile }