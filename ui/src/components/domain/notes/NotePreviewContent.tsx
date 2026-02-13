import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import useApi from '@/hooks/api/use-api';
import { parseContent } from '@/utils/editor/text-editor';
import type { NoteRetrieve } from '@services/cradle/models';
import { useEffect, useState } from 'react';
import Preview from '../../base/Preview/Preview';

interface NotePreviewContentProps {
    note: NoteRetrieve;
}

/**
 * NotePreviewContent - Handles async parsing and rendering of note content for tooltips
 * @param {Object} props
 * @param {Object} props.note - The note object to preview
 * @returns {JSX.Element}
 */
export const NotePreviewContent = ({ note }: NotePreviewContentProps) => {
    const [parsedContent, setParsedContent] = useState('');
    const [loading, setLoading] = useState(true);
    const { entriesApi, fileTransferApi, basePath } = useApi();

    useEffect(() => {
        parseContent(note.content, entriesApi, fileTransferApi, basePath, note.files)
            .then((result) => {
                setParsedContent(result.html);
                setLoading(false);
            })
            .catch(() => {
                setParsedContent('<p>Error loading preview</p>');
                setLoading(false);
            });
    }, [note.content, note.files, entriesApi, fileTransferApi, basePath]);

    return (
        <div className='w-[450px] max-h-[450px] overflow-hidden'>
            {loading ? (
                <div className='flex items-center justify-center h-32'>
                    <Spinner className='size-10' />
                </div>
            ) : (
                <ScrollArea className='max-h-[450px]'>
                    <Preview htmlContent={parsedContent} />
                </ScrollArea>
            )}
        </div>
    );
};

export default NotePreviewContent;
