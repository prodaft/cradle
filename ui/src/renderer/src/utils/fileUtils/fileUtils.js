/**
 * Upload a file to a presigned URL (e.g., MinIO)
 * @param {string} presignedUrl - The presigned URL for file upload
 * @param {File} file - The file to upload
 * @returns {Promise<Response>} - The response from the upload
 */
export async function uploadFile(presignedUrl, file) {
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

