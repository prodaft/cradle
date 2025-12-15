import { useNotif } from '@/contexts';
import { useAPICall } from '@/hooks';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import MarkdownEditorModal from '@components/modals/notes/MarkdownEditorModal';
import { useModal } from '@contexts/ui/ModalContext';
import useApi from '@hooks/api/useApi';
import { Edit, Plus, Trash } from 'iconoir-react/regular';
import { forwardRef, MouseEvent, useEffect, useImperativeHandle, useState } from 'react';

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

const SnippetList = forwardRef<SnippetListRef, SnippetListProps>(({ userId = null, showTitle = true, description }, ref) => {
    const [snippets, setSnippets] = useState<Snippet[]>([]);
    const [loading, setLoading] = useState(true);
    const { execute } = useAPICall();
    const { notify } = useNotif();
    const { setModal } = useModal();
    const { notesApi } = useApi();

    useEffect(() => {
        loadSnippets();
    }, [userId]);

    const loadSnippets = async () => {
        try {
            setLoading(true);
            const response = await execute(() => notesApi.notesSnippetsUserList({
                userId: userId === null ? 'null' : String(userId),
            }));
            setSnippets((response as any) || []);
        } catch (error) {
            console.error('Error loading snippets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSnippet = (e?: MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        setModal(MarkdownEditorModal, {
            titleEditable: true,
            initialContent: '',
            helpText: (
                <div>
                    You can use CodeMirror snippet format:{' '}
                    <a
                        href='https://codemirror.net/docs/ref/#autocomplete.snippet'
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        https://codemirror.net/docs/ref/#autocomplete.snippet
                    </a>
                </div>
            ),
            onConfirm: async (content: string, title: string) => {
                if (title.trim() && content.trim()) {
                    try {
                        const snippetData = {
                            name: title.trim(),
                            content: content.trim(),
                        };

                        await execute(() => notesApi.notesSnippetsUserCreate({
                            userId: userId === null ? 'null' : String(userId),
                            snippetRequest: snippetData,
                        }), {
                            successMessage: 'Snippet created successfully',
                            errorMessage: 'Failed to create snippet',
                        });
                        await loadSnippets();
                    } catch (error) {
                        console.error('Error creating snippet:', error);
                    }
                } else if (title.trim() === '') {
                    notify({ type: 'error', text: 'Title is required' });
                    throw new Error('Title is required');
                } else if (content.trim() === '') {
                    notify({ type: 'error', text: 'Content is required' });
                    throw new Error('Content is required');
                }
            },
        });
    };

    useImperativeHandle(ref, () => ({
        handleAddSnippet: () => handleAddSnippet(),
    }));

    const handleEditSnippet = (snippet: Snippet, e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setModal(MarkdownEditorModal, {
            title: snippet.name,
            titleEditable: true,
            initialContent: snippet.content,
            helpText:
                'You can use CodeMirror snippet format: https://codemirror.net/docs/ref/#autocomplete.snippet',
            onConfirm: async (content: string, title: string) => {
                if (title.trim() && content.trim()) {
                    try {
                        const snippetData = {
                            name: title.trim(),
                            content: content.trim(),
                        };

                        await execute(() => notesApi.notesSnippetsUpdate({
                            snippetId: snippet.id,
                            snippetRequest: snippetData,
                        }), {
                            successMessage: 'Snippet updated successfully',
                            errorMessage: 'Failed to update snippet',
                        });
                        await loadSnippets();
                    } catch (error) {
                        console.error('Error updating snippet:', error);
                    }
                }
            },
        });
    };

    const handleDeleteSnippet = async (snippet: Snippet, e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setModal(ConfirmDeletionModal, {
            text: `Are you sure you want to delete "${snippet.name}"? This action cannot be undone.`,
            onConfirm: async () => {
                try {
                    await notesApi.notesSnippetsDestroy({ snippetId: snippet.id });
                    await loadSnippets();
                } catch (error) {
                    console.error('Error deleting snippet:', error);
                }
            },
        });
    };

    return (
        <div className='w-full'>
            {/* Header with title and add button */}
            {showTitle && (
                <div className='flex items-center justify-between mb-3'>
                    <h3 className='text-sm font-semibold cradle-text-secondary cradle-mono'>
                        Note Snippets
                    </h3>
                    <button
                        onClick={handleAddSnippet}
                        className='btn btn-sm btn-primary flex items-center gap-2'
                    >
                        <Plus className='w-4 h-4' />
                        New Snippet
                    </button>
                </div>
            )}

            {/* Snippets list */}
            <div className='max-h-40 overflow-y-auto border border-cradle-border-primary'>
                {loading ? (
                    <div className='p-3 text-center'>
                        <div className='loading loading-spinner loading-sm'></div>
                        <p className='text-sm text-gray-500 mt-2'>Loading...</p>
                    </div>
                ) : snippets.length === 0 ? (
                    <div className='p-3 text-center text-gray-500'>
                        <p className='text-sm'>No snippets yet</p>
                    </div>
                ) : (
                    <div className='divide-y divide-gray-200'>
                        {snippets.map((snippet) => (
                            <div
                                key={snippet.id}
                                className='px-3 py-2 cursor-pointer flex items-center justify-between'
                            >
                                <div className='font-medium text-sm truncate flex-1 mr-2'>
                                    {snippet.name}
                                </div>
                                <div className='flex items-center gap-1'>
                                    <button
                                        onClick={(e) => handleEditSnippet(snippet, e)}
                                        className='p-1 hover:bg-gray-200 rounded'
                                        title='Edit snippet'
                                    >
                                        <Edit className='w-4 h-4 dark:text-cradle2' />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteSnippet(snippet, e)}
                                        className='p-1 hover:bg-red-100 rounded'
                                        title='Delete snippet'
                                    >
                                        <Trash className='w-4 h-4 text-red-600' />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

SnippetList.displayName = 'SnippetList';

export default SnippetList;
