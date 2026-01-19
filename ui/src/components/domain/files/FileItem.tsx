import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import useApi from '@/hooks/api/useApi';
import type { Alert, StateSetter } from '@/types';
import { createDashboardLink } from '@/utils/dashboard';
import type { FileReferenceWithNote } from '@services/cradle/models';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Download } from 'iconoir-react';
import { forwardRef, useState } from 'react';
import { toast } from 'sonner';

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
    const router = useRouter();
    const { fileTransferApi } = useApi();
    const [hidden, setHidden] = useState(false);

    const downloadMutation = useMutation({
        mutationFn: async (fileId: string) => {
            const response = await fileTransferApi.fileTransferDownloadRetrieve({
                fileId,
            });
            return response.presignedUrl;
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: (presignedUrl) => {
            const link = document.createElement('a');
            link.href = presignedUrl;
            const fileName = file.fileName!;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
    });

    const downloadFile = () => {
        if (file.id) {
            downloadMutation.mutate(file.id);
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
                    <div className='flex flex-wrap gap-2 mb-2'>
                        <h2 className='card-header text-foreground ml-1'>
                            {file.fileName}
                        </h2>
                        {file.entities?.map((entry) => (
                            <Badge
                                key={entry.name}
                                asChild
                                variant={!entry.color ? 'secondary' : 'default'}
                                style={
                                    entry.color
                                        ? {
                                              backgroundColor: entry.color,
                                          }
                                        : undefined
                                }
                            >
                                <a
                                    href={`#${createDashboardLink(entry)}`}
                                    data-custom-href={`#${createDashboardLink(entry)}`}
                                    className='hover:underline'
                                >
                                    {entry.name}
                                </a>
                            </Badge>
                        ))}
                    </div>
                    <div className='mt-1'>
                        {file.noteId && (
                            <>
                                <a
                                    href={`/notes/${file.noteId}`}
                                    onClick={() =>
                                        router.navigate({
                                            to: '/notes/$id',
                                            params: { id: file.noteId! },
                                        })
                                    }
                                    className='text-muted-foreground hover:text-foreground ml-2'
                                >
                                    View Note
                                </a>
                                <span className='text-muted-foreground mx-1'>|</span>
                            </>
                        )}
                        <span className='text-muted-foreground mx-1'>|</span>
                        <span className='text-muted-foreground'>
                            {file.timestamp
                                ? format(new Date(file.timestamp), 'dd/MM/yyyy, HH:mm')
                                : 'N/A'}
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
                <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => downloadFile()}
                    className='text-foreground hover:bg-accent p-2 rounded-full ml-4'
                    title='Download file'
                >
                    <Download />
                </Button>
            </div>
        </div>
    );
});

export default FileItem;
