import { AlertDialogAction } from '@/components/custom/alert-dialog';
import { useFileDownload } from '@/components/domain/files/use-file-download';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryKeys } from '@/hooks/query/query-keys';
import { cn } from '@/lib/utils';
import type { FileReferenceWithNote } from '@/types/models';
import {
    ArrowClockwiseIcon,
    ClipboardTextIcon,
    DotsThreeIcon,
    DownloadSimpleIcon,
    FileIcon,
    FileTextIcon,
    FileZipIcon,
    FingerprintIcon,
    ImageIcon,
    MagnifyingGlassIcon,
    PulseIcon,
    TerminalWindowIcon,
    TextboxIcon,
    TrashIcon,
    WarningCircleIcon,
    XIcon,
    type Icon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import {
    buildReferenceTag,
    findFileReferences,
    formatFileSize,
    getFileKind,
    type FileKind,
    type FileReferenceLocation,
} from '@utils/files';
import {
    useCallback,
    useMemo,
    useState,
    type Dispatch,
    type DragEvent,
    type SetStateAction,
} from 'react';
import type { PendingUpload } from './use-note-file-uploads';

const KIND_ICON: Record<FileKind, { icon: Icon; className: string }> = {
    executable: { icon: TerminalWindowIcon, className: 'text-destructive' },
    archive: { icon: FileZipIcon, className: 'text-primary' },
    capture: { icon: PulseIcon, className: 'text-sky-700 dark:text-sky-300' },
    document: { icon: FileTextIcon, className: 'text-foreground/80' },
    image: { icon: ImageIcon, className: 'text-violet-700 dark:text-violet-300' },
    other: { icon: FileIcon, className: 'text-muted-foreground' },
};

const buildMarkdownReference = (file: FileReferenceWithNote) =>
    `[${file.name ?? 'file'}][${buildReferenceTag(file)}]`;

interface FileEntry {
    file: FileReferenceWithNote;
    references: FileReferenceLocation[];
}

function matchesFilter(file: FileReferenceWithNote, query: string): boolean {
    if (!query) return true;
    const haystack = [
        file.name,
        file.mime_type,
        file.sha256,
        file.sha1,
        file.md5,
        ...(file.entities ?? []).map((entity) => entity.name),
    ];
    return haystack.some((value) => value?.toLowerCase().includes(query));
}

interface FilesOutlineProps {
    files: FileReferenceWithNote[];
    setFiles: Dispatch<SetStateAction<FileReferenceWithNote[]>>;
    /** Note markdown, used to find where each file is referenced. */
    content: string;
    /** 1-based line of the editor cursor. */
    currentLine?: number;
    insertText: (text: string) => void;
    jumpToPosition: (pos: number) => void;
    canEdit?: boolean;
    /** Uploads files to the note. */
    onUpload?: (files: File[]) => void;
    /** Opens the file picker. */
    onBrowse?: () => void;
    /** Uploads still in flight or failed, listed after the attached files. */
    uploads?: PendingUpload[];
    onRetryUpload?: (upload: PendingUpload) => void;
    onDismissUpload?: (id: string) => void;
}

/** Note attachments for the editor sidebar, listed in upload order. */
export default function FilesOutline({
    files,
    setFiles,
    content,
    currentLine,
    insertText,
    jumpToPosition,
    canEdit = true,
    onUpload,
    onBrowse,
    uploads = [],
    onRetryUpload,
    onDismissUpload,
}: FilesOutlineProps) {
    const [query, setQuery] = useState('');
    const [pendingRemove, setPendingRemove] = useState<FileEntry | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const entries = useMemo<FileEntry[]>(
        () =>
            files.map((file) => ({
                file,
                references: findFileReferences(content, file.id),
            })),
        [files, content],
    );

    const normalizedQuery = query.trim().toLowerCase();
    const visibleEntries = useMemo(
        () => entries.filter((entry) => matchesFilter(entry.file, normalizedQuery)),
        [entries, normalizedQuery],
    );

    const { mutate: openFile } = useFileDownload();

    const { mutate: deleteFile } = useMutation({
        mutationFn: async (id: string) => {
            const { error, response } = await fetchClient.DELETE('/files/{file_id}/', {
                params: { path: { file_id: id } },
            });
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [
                { queryKey: queryKeys.notes.apiDetails() },
                { queryKey: queryKeys.files.apiList() },
                { queryKey: queryKeys.files.apiDetails() },
            ],
            successMessage: 'File deleted.',
        },
    });

    const removeFile = useCallback(
        (file: FileReferenceWithNote) => {
            if (!file.id) return;
            deleteFile(file.id, {
                // Updater form: uploads may have finished while the delete was pending.
                onSuccess: () =>
                    setFiles((prev) => prev.filter((f) => f.id !== file.id)),
            });
        },
        [deleteFile, setFiles],
    );

    const openEntry = useCallback(
        ({ file, references }: FileEntry) => {
            // Repeated clicks walk through the references below the cursor.
            const next =
                references.find(
                    (ref) => currentLine === undefined || ref.line > currentLine,
                ) ?? references[0];
            if (next) jumpToPosition(next.pos);
            else if (canEdit) insertText(buildMarkdownReference(file));
        },
        [currentLine, jumpToPosition, insertText, canEdit],
    );

    const handleDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();
            setIsDragging(false);
            const dropped = Array.from(event.dataTransfer.files);
            if (dropped.length > 0) onUpload?.(dropped);
        },
        [onUpload],
    );

    const canUpload = canEdit && Boolean(onUpload);

    return (
        <div
            className={cn(
                'flex min-h-full flex-col transition-colors',
                isDragging && 'bg-primary/10 ring-1 ring-inset ring-primary',
            )}
            onDragOver={(event) => {
                if (!canUpload || !event.dataTransfer.types.includes('Files')) return;
                event.preventDefault();
                setIsDragging(true);
            }}
            onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node))
                    setIsDragging(false);
            }}
            onDrop={handleDrop}
        >
            {files.length > 0 && (
                <div className='p-3 pb-0'>
                    <InputGroup>
                        <InputGroupAddon>
                            <MagnifyingGlassIcon aria-hidden='true' />
                        </InputGroupAddon>
                        <InputGroupInput
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') setQuery('');
                            }}
                            placeholder='Filter files…'
                            title='Matches name, type, hashes and entities'
                            aria-label='Filter files'
                        />
                        {query && (
                            <InputGroupAddon align='inline-end'>
                                <InputGroupButton
                                    size='icon-xs'
                                    aria-label='Clear filter'
                                    onClick={() => setQuery('')}
                                >
                                    <XIcon />
                                </InputGroupButton>
                            </InputGroupAddon>
                        )}
                    </InputGroup>
                </div>
            )}

            <div className='flex min-h-0 flex-1 flex-col p-3'>
                {files.length === 0 && uploads.length === 0 && (
                    <Empty className='gap-3 p-4'>
                        <EmptyHeader>
                            <EmptyMedia variant='icon'>
                                <FileIcon />
                            </EmptyMedia>
                            <EmptyTitle>No files</EmptyTitle>
                            <EmptyDescription>
                                {canUpload ? (
                                    <>
                                        Drop files here or{' '}
                                        <button
                                            type='button'
                                            onClick={onBrowse}
                                            className='cursor-pointer text-foreground underline underline-offset-2 hover:text-primary'
                                        >
                                            browse
                                        </button>
                                        .
                                    </>
                                ) : (
                                    'Files you attach will appear here.'
                                )}
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
                {files.length > 0 && visibleEntries.length === 0 && (
                    <p className='px-2 py-1 text-sm text-muted-foreground'>
                        No files match “{query.trim()}”.
                    </p>
                )}
                {visibleEntries.map((entry) => (
                    <FileRow
                        key={entry.file.id}
                        entry={entry}
                        isCurrent={
                            currentLine !== undefined &&
                            entry.references.some((ref) => ref.line === currentLine)
                        }
                        canEdit={canEdit}
                        onOpen={() => openEntry(entry)}
                        onInsert={() => insertText(buildMarkdownReference(entry.file))}
                        onDownload={() => entry.file.id && openFile(entry.file.id)}
                        onDelete={() => setPendingRemove(entry)}
                    />
                ))}
                {uploads.map((upload) => (
                    <UploadRow
                        key={upload.id}
                        upload={upload}
                        onRetry={() => onRetryUpload?.(upload)}
                        onDismiss={() => onDismissUpload?.(upload.id)}
                    />
                ))}
            </div>

            <AlertDialog
                open={Boolean(pendingRemove)}
                onOpenChange={(open) => {
                    if (!open) setPendingRemove(null);
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Permanently delete{' '}
                            <span className='font-medium text-foreground break-all'>
                                {pendingRemove?.file.name ?? 'this file'}
                            </span>
                            ? This cannot be undone
                            {pendingRemove && pendingRemove.references.length > 0
                                ? `, and the ${pendingRemove.references.length === 1 ? 'reference' : `${pendingRemove.references.length} references`} to it in this note will stop working.`
                                : ', and any references to it in other notes will stop working.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            size='sm'
                            onClick={() => {
                                if (pendingRemove) removeFile(pendingRemove.file);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

interface FileRowProps {
    entry: FileEntry;
    isCurrent: boolean;
    canEdit: boolean;
    onOpen: () => void;
    onInsert: () => void;
    onDownload: () => void;
    onDelete: () => void;
}

function FileRow({
    entry: { file, references },
    isCurrent,
    canEdit,
    onOpen,
    onInsert,
    onDownload,
    onDelete,
}: FileRowProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const kind = KIND_ICON[getFileKind(file.mime_type, file.name)];
    const KindIcon = kind.icon;
    const isReferenced = references.length > 0;
    const copy = (text: string) => void navigator.clipboard.writeText(text);

    return (
        <div
            className={cn(
                'group/file relative flex h-8 items-center gap-2 pr-1 pl-2 text-sm hover:bg-muted/60',
                isCurrent && 'bg-muted shadow-[inset_2px_0_0_var(--primary)]',
            )}
            title={
                isReferenced
                    ? (file.name ?? undefined)
                    : `${file.name ?? 'File'} (not referenced in the note)`
            }
        >
            {(isReferenced || canEdit) && (
                <button
                    type='button'
                    className='absolute inset-0 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring'
                    onClick={onOpen}
                    aria-label={
                        isReferenced
                            ? `Go to ${file.name} in the note`
                            : `Insert ${file.name} into the note`
                    }
                />
            )}
            <KindIcon
                className={cn('size-4 shrink-0', kind.className)}
                weight='bold'
                aria-hidden='true'
            />
            <span
                className={cn(
                    'min-w-0 flex-1 truncate',
                    isCurrent && 'underline decoration-primary underline-offset-4',
                )}
            >
                {file.name}
            </span>
            {references.length > 1 && (
                <span className='shrink-0 bg-muted px-1 font-mono text-[10px] text-muted-foreground'>
                    ×{references.length}
                </span>
            )}

            {/* Swapped for the row actions on hover/focus. */}
            <div
                className={cn(
                    'flex shrink-0 items-center gap-1.5 group-focus-within/file:hidden group-hover/file:hidden',
                    isMenuOpen && 'hidden',
                )}
            >
                {!isReferenced && (
                    // Hidden on hover with the rest of the slot, so the row's
                    // tooltip carries this for pointer users.
                    <span
                        className='size-1.5 bg-primary'
                        aria-label='Not referenced in the note'
                        role='img'
                    />
                )}
                {file.size != null && (
                    <span className='font-mono text-[11px] text-muted-foreground'>
                        {formatFileSize(file.size)}
                    </span>
                )}
            </div>

            <div
                className={cn(
                    'relative z-10 hidden shrink-0 items-center group-focus-within/file:flex group-hover/file:flex',
                    isMenuOpen && 'flex',
                )}
            >
                {canEdit && (
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    variant='ghost'
                                    size='icon-xs'
                                    aria-label='Insert into editor'
                                    onClick={onInsert}
                                />
                            }
                        >
                            <TextboxIcon weight='bold' />
                        </TooltipTrigger>
                        <TooltipContent>Insert into editor</TooltipContent>
                    </Tooltip>
                )}
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <Button
                                variant='ghost'
                                size='icon-xs'
                                aria-label='Download'
                                onClick={onDownload}
                            />
                        }
                    >
                        <DownloadSimpleIcon weight='bold' />
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                </Tooltip>
                <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                variant='ghost'
                                size='icon-xs'
                                aria-label='More actions'
                            />
                        }
                    >
                        <DotsThreeIcon weight='bold' />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                            onClick={() => copy(buildMarkdownReference(file))}
                        >
                            <ClipboardTextIcon weight='bold' />
                            Copy reference
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            disabled={!file.sha256}
                            onClick={() => file.sha256 && copy(file.sha256)}
                        >
                            <FingerprintIcon weight='bold' />
                            {file.sha256 ? 'Copy SHA-256' : 'SHA-256 pending…'}
                        </DropdownMenuItem>
                        {canEdit && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    variant='destructive'
                                    onClick={onDelete}
                                >
                                    <TrashIcon weight='bold' />
                                    Delete
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

interface UploadRowProps {
    upload: PendingUpload;
    onRetry: () => void;
    onDismiss: () => void;
}

function UploadRow({ upload, onRetry, onDismiss }: UploadRowProps) {
    const { file, status, progress, error } = upload;
    const failed = status === 'error';

    return (
        <div
            className={cn(
                'relative flex h-8 items-center gap-2 pr-1 pl-2 text-sm',
                failed && 'bg-destructive/5',
            )}
            title={failed ? `${file.name}: ${error ?? 'Upload failed'}` : undefined}
        >
            {status === 'uploading' && <Spinner className='shrink-0' />}
            {status === 'processing' && (
                <FingerprintIcon
                    className='size-4 shrink-0 text-muted-foreground'
                    weight='bold'
                    aria-hidden='true'
                />
            )}
            {failed && (
                <WarningCircleIcon
                    className='size-4 shrink-0 text-destructive'
                    weight='bold'
                    aria-hidden='true'
                />
            )}
            <span
                className={cn(
                    'min-w-0 flex-1 truncate',
                    !failed && 'text-muted-foreground',
                )}
            >
                {file.name}
            </span>
            {!failed && (
                <span className='shrink-0 font-mono text-[11px] text-muted-foreground'>
                    {status === 'uploading'
                        ? `${Math.round(progress)}%`
                        : 'finalizing…'}
                </span>
            )}
            {failed && (
                <>
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    variant='ghost'
                                    size='icon-xs'
                                    aria-label={`Retry uploading ${file.name}`}
                                    onClick={onRetry}
                                />
                            }
                        >
                            <ArrowClockwiseIcon weight='bold' />
                        </TooltipTrigger>
                        <TooltipContent>Retry</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    variant='ghost'
                                    size='icon-xs'
                                    aria-label={`Dismiss ${file.name}`}
                                    onClick={onDismiss}
                                />
                            }
                        >
                            <XIcon weight='bold' />
                        </TooltipTrigger>
                        <TooltipContent>Dismiss</TooltipContent>
                    </Tooltip>
                </>
            )}
            {status === 'uploading' && (
                <div
                    aria-hidden='true'
                    className='absolute bottom-0 left-0 h-0.5 bg-primary transition-[width] duration-150'
                    style={{ width: `${progress}%` }}
                />
            )}
        </div>
    );
}
