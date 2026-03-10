import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { parseContent } from '@/utils/editor/text-editor';
import type { components } from '@services/openapi/schema';
import { useQuery } from '@tanstack/react-query';
import Preview from '../../base/preview/preview';

type NoteForPreview = Pick<
    components['schemas']['NoteListResponse'],
    'content' | 'files'
> & { content?: string; files?: unknown[] };

interface NotePreviewContentProps {
    note: NoteForPreview;
}

/**
 * NotePreviewContent - Handles async parsing and rendering of note content for tooltips
 * @param {Object} props
 * @param {Object} props.note - The note object to preview
 * @returns {JSX.Element}
 */
export const NotePreviewContent = ({ note }: NotePreviewContentProps) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

    const { data: parsedContent, isLoading } = useQuery({
        queryKey: ['parseNotePreview', note.content, note.files],
        queryFn: async () => {
            const result = await parseContent(
                note.content ?? '',
                baseURL,
                note.files ?? [],
            );
            return result.html;
        },
        meta: { showErrorToast: true },
        staleTime: Infinity,
    });

    return (
        <div className='w-[450px] max-h-[450px] overflow-hidden'>
            {isLoading ? (
                <div className='flex items-center justify-center h-32'>
                    <Spinner className='size-10' />
                </div>
            ) : (
                <ScrollArea className='max-h-[450px]'>
                    <Preview htmlContent={parsedContent ?? ''} />
                </ScrollArea>
            )}
        </div>
    );
};

export default NotePreviewContent;
