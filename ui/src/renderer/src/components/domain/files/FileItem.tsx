import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import type { Alert, StateSetter } from '@/types';
import { createDashboardLink } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import type { FileReferenceWithNote } from '@services/cradle/models';
import { Download } from 'iconoir-react';
import { forwardRef, useState } from 'react';

/**
 * FileItem component - This component is used to display a file in a list.
 * @function FileItem
 * @param {Object} props - Component props
 * @param {string} props.id - The file ID
 * @param {FileReferenceWithNote} props.file - The file object
 * @param {StateSetter<Alert>} props.setAlert - Function to set alerts
 */
interface FileItemProps {
    id: string;
    file: FileReferenceWithNote;
}

const FileItem = forwardRef<HTMLDivElement, FileItemProps>(function FileItem(
    { id, file, ...props },
    ref,
) {
    const { navigateLink } = useCradleNavigate();
    const { fileTransferApi } = useApi();
    const [hidden, setHidden] = useState(false);
    const { execute } = useAPICall();

    const downloadFile = async () => {
        if (file.id) {
            let response = await execute(() =>
                fileTransferApi.fileTransferDownloadRetrieve({
                    fileId: file.id!,
                }),
            );

            const { presignedUrl } = response;
            const link = document.createElement('a');
            link.href = presignedUrl;

            const fileName = file.fileName!;
            link.download = fileName;
            document.body.appendChild(link);

            link.click();

            document.body.removeChild(link);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                toast.success('Copied to clipboard');
            })
            .catch((error) => {
                toast.error('Failed to copy to clipboard');
            });
    };

    if (hidden) return null;

    return (
        <div ref={ref} {...props}>
            <div
                key={file.id}
                className='relative h-fit w-full bg-card/20 px-3 py-4 rounded-xl my-2 flex items-center'
            >
                <div className='flex-grow text-xs'>
                    <div className='flex flex-wrap gap-2 mb-2 ml-1'>
                        <h2 className='card-header text-foreground ml-1'>
                            {file.fileName}
                        </h2>
                        {file.entities?.map((entry) => (
                            <a
                                key={entry.name}
                                className={`hover:underline badge badge-flat-primary badge-xs px-2 mx-1 my-1 py-1 text-primary-foreground ${!entry.color ? 'bg-muted' : ''}`}
                                href={`#${createDashboardLink(entry)}`}
                                data-custom-href={`#${createDashboardLink(entry)}`}
                                style={entry.color ? {
                                    backgroundColor: entry.color,
                                } : undefined}
                            >
                                {entry.name}
                            </a>
                        ))}
                    </div>
                    <div className='mt-1'>
                        <a
                            href={`/notes/${file.noteId}`}
                            onClick={navigateLink(`/notes/${file.noteId}`)}
                            className='text-muted-foreground hover:text-foreground ml-2'
                        >
                            View Note
                        </a>
                        <span className='text-muted-foreground mx-1'>|</span>
                        <span className='text-muted-foreground'>
                            {file.timestamp ? formatDate(file.timestamp) : 'N/A'}
                        </span>

                        {file.sha256Hash && (
                            <>
                                <span className='text-muted-foreground mx-1'>|</span>
                                <span
                                    className='text-muted-foreground cursor-pointer hover:bg-muted'
                                    onClick={() => copyToClipboard(file.sha256Hash!)}
                                    title='Click to copy'
                                >
                                    <strong>SHA256:</strong>{' '}
                                    {file.sha256Hash.substring(0, 21)}...
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div className='flex space-x-2 ml-4'>
                    <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => downloadFile()}
                        className='text-foreground hover:bg-accent p-2 rounded-full'
                        title='Download file'
                    >
                        <Download />
                    </Button>
                </div>
            </div>
        </div>
    );
});

export default FileItem;
