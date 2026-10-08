import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';

/** Fetch a file's presigned URL and open it in a new tab. */
export function useFileDownload() {
    return useMutation({
        mutationFn: async (id: string) => {
            const { data, error, response } = await fetchClient.GET(
                '/file-transfer/download/',
                {
                    params: {
                        query: {
                            file_id: id,
                        },
                    },
                },
            );
            if (error) throw { response, error };
            return data.presigned_url;
        },
        onSuccess: (presignedUrl) => {
            if (presignedUrl) {
                window.open(presignedUrl, '_blank', 'noopener');
            }
        },
    });
}
