/**
 * File upload and handling utilities
 */

/**
 * Upload a file to a presigned URL (e.g., MinIO)
 *
 * @param presignedUrl - The presigned URL for file upload
 * @param file - The file to upload
 * @returns The response from the upload
 * @throws Error if the file upload fails
 */
export async function uploadFile(presignedUrl: string, file: File): Promise<Response> {
    const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type || 'application/octet-stream',
        },
    });

    if (!response.ok) {
        throw new Error(`File upload failed: ${response.statusText}`);
    }

    return response;
}
