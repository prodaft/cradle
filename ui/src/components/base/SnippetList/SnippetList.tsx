import ConfirmDeletionDialog from '@/components/dialogs/base/ConfirmDeletionDialog';
import MarkdownEditorDialog from '@/components/dialogs/base/MarkdownEditorDialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { logger } from '@/utils/logger';
import useApi from '@hooks/api/useApi';
import { PencilIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { forwardRef, MouseEvent, useImperativeHandle, useState } from 'react';
import { toast } from 'sonner';

interface Snippet {
    id: string;
    name: string;
    content: string;
}

interface SnippetListProps {
    userId?: string | null;
    showTitle?: boolean;
    description?: string;
}

export interface SnippetListRef {
    handleAddSnippet: () => void;
}

const SnippetList = forwardRef<SnippetListRef, SnippetListProps>(
    ({ userId = null, showTitle = true, description }, ref) => {
        const { notesApi } = useApi();
        const [addSnippetDialogOpen, setAddSnippetDialogOpen] = useState(false);
        const [editSnippetDialogOpen, setEditSnippetDialogOpen] = useState(false);
        const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
        const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
        const [deletingSnippet, setDeletingSnippet] = useState<Snippet | null>(null);

        // Query for snippets
        const { data: snippetsData, isPending: loading } = useQuery({
            queryKey: ['snippets', 'user', userId === null ? 'null' : String(userId)],
            queryFn: () =>
                notesApi.notesSnippetsUserList({
                    userId: userId === null ? 'null' : String(userId),
                }),
            meta: {
                showErrorToast: true,
                errorMessage: 'Failed to load snippets',
            },
        });

        const snippets = (snippetsData as any) || [];

        // Mutation for creating snippets
        const createMutation = useMutation({
            mutationFn: (data: { name: string; content: string }) =>
                notesApi.notesSnippetsUserCreate({
                    userId: userId === null ? 'null' : String(userId),
                    snippetRequest: data,
                }),
            meta: {
                invalidateQueries: [
                    {
                        queryKey: [
                            'snippets',
                            'user',
                            userId === null ? 'null' : String(userId),
                        ],
                    },
                ],
                successMessage: 'Snippet created successfully',
                errorMessage: 'Failed to create snippet',
            },
        });

        // Mutation for updating snippets
        const updateMutation = useMutation({
            mutationFn: ({
                snippetId,
                data,
            }: {
                snippetId: string;
                data: { name: string; content: string };
            }) =>
                notesApi.notesSnippetsUpdate({
                    snippetId,
                    snippetRequest: data,
                }),
            meta: {
                invalidateQueries: [
                    {
                        queryKey: [
                            'snippets',
                            'user',
                            userId === null ? 'null' : String(userId),
                        ],
                    },
                ],
                successMessage: 'Snippet updated successfully',
                errorMessage: 'Failed to update snippet',
            },
        });

        // Mutation for deleting snippets
        const deleteMutation = useMutation({
            mutationFn: (snippetId: string) =>
                notesApi.notesSnippetsDestroy({ snippetId }),
            meta: {
                invalidateQueries: [
                    {
                        queryKey: [
                            'snippets',
                            'user',
                            userId === null ? 'null' : String(userId),
                        ],
                    },
                ],
                successMessage: 'Snippet deleted successfully',
                errorMessage: 'Failed to delete snippet',
            },
        });

        const handleAddSnippet = (e?: MouseEvent) => {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }
            setAddSnippetDialogOpen(true);
        };

        useImperativeHandle(ref, () => ({
            handleAddSnippet: () => handleAddSnippet(),
        }));

        const handleEditSnippet = (snippet: Snippet, e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            setEditingSnippet(snippet);
            setEditSnippetDialogOpen(true);
        };

        const handleDeleteSnippet = async (snippet: Snippet, e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            setDeletingSnippet(snippet);
            setDeleteDialogOpen(true);
        };

        return (
            <div className='w-full pb-2'>
                {/* Header with title and add button */}
                {showTitle && (
                    <div className='flex items-center justify-between mb-3'>
                        <h3 className='text-sm font-semibold text-foreground font-mono tracking-wide'>
                            Note Snippets
                        </h3>
                        <Button
                            onClick={handleAddSnippet}
                            variant='default'
                            size='sm'
                            className='flex items-center gap-2'
                        >
                            <PlusIcon className='w-4 h-4' weight='bold' />
                            New Snippet
                        </Button>
                    </div>
                )}

                {/* Snippets list */}
                <ScrollArea className='max-h-40 border border-border'>
                    {loading ? (
                        <div className='p-3 text-center'>
                            <Spinner className='size-10' />
                            <p className='text-sm text-muted-foreground mt-2'>
                                Loading...
                            </p>
                        </div>
                    ) : snippets.length === 0 ? (
                        <div className='p-3 text-center text-muted-foreground'>
                            <p className='text-sm'>No snippets yet</p>
                        </div>
                    ) : (
                        <div className='divide-y divide-border'>
                            {snippets.map((snippet) => (
                                <div
                                    key={snippet.id}
                                    className='px-3 py-2 cursor-pointer flex items-center justify-between'
                                >
                                    <div className='font-medium text-sm truncate flex-1 mr-2'>
                                        {snippet.name}
                                    </div>
                                    <div className='flex items-center gap-1'>
                                        <Button
                                            onClick={(e) =>
                                                handleEditSnippet(snippet, e)
                                            }
                                            variant='ghost'
                                            size='icon-sm'
                                            className='p-1 hover:bg-muted'
                                            title='Edit snippet'
                                        >
                                            <PencilIcon
                                                className='w-4 h-4 text-primary'
                                                weight='bold'
                                            />
                                        </Button>
                                        <Button
                                            onClick={(e) =>
                                                handleDeleteSnippet(snippet, e)
                                            }
                                            variant='ghost'
                                            size='icon-sm'
                                            className='p-1 hover:bg-destructive/10'
                                            title='Delete snippet'
                                        >
                                            <TrashIcon
                                                className='w-4 h-4 text-destructive'
                                                weight='bold'
                                            />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <MarkdownEditorDialog
                    open={addSnippetDialogOpen}
                    onOpenChange={setAddSnippetDialogOpen}
                    titleEditable={true}
                    initialContent=''
                    helpText={
                        <div className='text-sm text-muted-foreground'>
                            You can use CodeMirror snippet format:{' '}
                            <a
                                href='https://codemirror.net/docs/ref/#autocomplete.snippet'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                https://codemirror.net/docs/ref/#autocomplete.snippet
                            </a>
                        </div>
                    }
                    onConfirm={async (content: string, title: string) => {
                        if (title.trim() && content.trim()) {
                            try {
                                const snippetData = {
                                    name: title.trim(),
                                    content: content.trim(),
                                };
                                await createMutation.mutateAsync(snippetData);
                            } catch (error) {
                                logger.error('Error creating snippet:', error);
                            }
                        } else if (title.trim() === '') {
                            toast.error('Title is required');
                            throw new Error('Title is required');
                        } else if (content.trim() === '') {
                            toast.error('Content is required');
                            throw new Error('Content is required');
                        }
                    }}
                />
                {editingSnippet && (
                    <MarkdownEditorDialog
                        open={editSnippetDialogOpen}
                        onOpenChange={(open) => {
                            setEditSnippetDialogOpen(open);
                            if (!open) setEditingSnippet(null);
                        }}
                        title={editingSnippet.name}
                        titleEditable={true}
                        initialContent={editingSnippet.content}
                        helpText='You can use CodeMirror snippet format: https://codemirror.net/docs/ref/#autocomplete.snippet'
                        onConfirm={async (content: string, title: string) => {
                            if (title.trim() && content.trim()) {
                                try {
                                    const snippetData = {
                                        name: title.trim(),
                                        content: content.trim(),
                                    };
                                    await updateMutation.mutateAsync({
                                        snippetId: editingSnippet.id,
                                        data: snippetData,
                                    });
                                } catch (error) {
                                    logger.error('Error updating snippet:', error);
                                }
                            }
                        }}
                    />
                )}
                {deletingSnippet && (
                    <ConfirmDeletionDialog
                        open={deleteDialogOpen}
                        onOpenChange={(open) => {
                            setDeleteDialogOpen(open);
                            if (!open) setDeletingSnippet(null);
                        }}
                        text={`Are you sure you want to delete "${deletingSnippet.name}"? This action cannot be undone.`}
                        onConfirm={async () => {
                            try {
                                await deleteMutation.mutateAsync(deletingSnippet.id);
                            } catch (error) {
                                logger.error('Error deleting snippet:', error);
                            }
                        }}
                    />
                )}
            </div>
        );
    },
);

SnippetList.displayName = 'SnippetList';

export default SnippetList;
