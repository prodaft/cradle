import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Function to get the mapping types
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getMappingTypes() {
    return authAxios({
        method: 'GET',
        url: '/intelio/mappings/',
    });
}

/**
 * Function to get the enrichment types
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getEnrichmentTypes() {
    return authAxios({
        method: 'GET',
        url: '/intelio/enrichment/',
    });
}

/**
 * Function to get digest types
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getDigestTypes() {
    return authAxios({
        method: 'GET',
        url: '/intelio/digest/options/',
    });
}

/**
 * Function to get the mapping keys
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getMappingKeys(id) {
    return authAxios({
        method: 'GET',
        url: `/intelio/mappings/${id}/keys`,
    });
}

/**
 * Function to get the mappings
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getMappings(id) {
    return authAxios({
        method: 'GET',
        url: `/intelio/mappings/${id}/`,
    });
}

/**
 * Function to save a mapping
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function saveMapping(id, mapping) {
    return authAxios({
        method: 'POST',
        url: `/intelio/mappings/${id}/`,
        data: mapping,
    });
}

/**
 * Function to delete a mapping
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function deleteMapping(id, mappingId) {
    return authAxios({
        method: 'DELETE',
        url: `/intelio/mappings/${id}/`,
        params: { mapping_id: mappingId },
    });
}

/**
 * Function to get an enrichment
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getEnrichmentSettings(id) {
    return authAxios({
        method: 'GET',
        url: `/intelio/enrichment/${id}/`,
    });
}

/**
 * Function to save a mapping
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function saveEnrichmentSettings(id, enrichment) {
    return authAxios({
        method: 'POST',
        url: `/intelio/enrichment/${id}/`,
        data: enrichment,
    });
}

/**
 * Function to get the digests
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getDigests(filters) {
    return authAxios({
        method: 'GET',
        url: `/intelio/digest/`,
        params: filters,
    });
}

/**
 * Function to upload a digest
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function saveDigest(body, file) {
    const formData = new FormData();

    Object.entries(body).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((item) => {
                if (item && typeof item === 'object' && item.value) {
                    formData.append(key, item.value);
                } else {
                    formData.append(key, item);
                }
            });
        } else {
            formData.append(key, value);
        }
    });

    if (Array.isArray(file)) {
        file.forEach((f) => formData.append('file', f));
    } else {
        formData.append('file', file);
    }

    return authAxios({
        method: 'POST',
        url: '/intelio/digest/',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
}

/**
 * Function to delete a digestion
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function deleteDigest(id) {
    return authAxios({
        method: 'DELETE',
        url: '/intelio/digest',
        params: { id: id },
    });
}
