import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';

export function useRequestNoteAccess() {
    return useMutation({
        mutationFn: async (noteId: string) => {
            const { error, response } = await fetchClient.POST(
                '/notes/{note_id}/access/request/',
                { params: { path: { note_id: noteId } } },
            );
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'Access requested. The note’s owners have been notified.',
        },
    });
}
