import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash } from 'iconoir-react/regular';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import MarkdownEditorModal from '../Modals/MarkdownEditorModal';
import {
    getUserSnippets,
    createSnippet,
    updateSnippet,
    deleteSnippet,
} from '../../services/snippetsService/snippetsService';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal';

export default function SnippetList({ userId = null }) {
    const [snippets, setSnippets] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setModal } = useModal();

    useEffect(() => {
        loadSnippets();
    }, [userId]);

    const loadSnippets = async () => {
        try {
            setLoading(true);
            const response = await getUserSnippets(userId);
            setSnippets(response.data || []);
        } catch (error) {
            console.error('Error loading snippets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSnippet = (e) => {
        setModal(MarkdownEditorModal, {
            title: '',
            titleEditable: true,
            initialContent: '',
            helpText:
                'You can use CodeMirror snippet format: https://codemirror.net/docs/ref/#autocomplete.snippet',
            onConfirm: async (content, title) => {
                if (title.trim() && content.trim()) {
                    try {
                        const snippetData = {
                            name: title.trim(),
                            content: content.trim(),
                        };

                        await createSnippet(snippetData, userId);
                        await loadSnippets();
                    } catch (error) {
                        console.error('Error creating snippet:', error);
                    }
                }
            },
        });
        e.stopPropagation();
        e.preventDefault();
    };

    const handleEditSnippet = (snippet, event) => {
        event.stopPropagation();
        setModal(MarkdownEditorModal, {
            title: snippet.name,
            titleEditable: true,
            initialContent: snippet.content,
            helpText:
                'You can use CodeMirror snippet format: https://codemirror.net/docs/ref/#autocomplete.snippet',
            onConfirm: async (content, title) => {
                if (title.trim() && content.trim()) {
                    try {
                        const snippetData = {
                            name: title.trim(),
                            content: content.trim(),
                        };

                        await updateSnippet(snippet.id, snippetData);
                        await loadSnippets();
                    } catch (error) {
                        console.error('Error updating snippet:', error);
                    }
                }
            },
        });
    };

    const handleDeleteSnippet = async (snippet, event) => {
        event.stopPropagation();
        setModal(ConfirmDeletionModal, {
            title: 'Delete Snippet',
            text: `Are you sure you want to delete "${snippet.name}"? This action cannot be undone.`,
            onConfirm: async () => {
                try {
                    await deleteSnippet(snippet.id);
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
            <div className='flex items-center justify-between mb-3'>
                <h3 className='text-lg font-semibold'>Snippets</h3>
                <button
                    onClick={handleAddSnippet}
                    className='btn btn-sm btn-primary flex items-center gap-2'
                >
                    <Plus className='w-4 h-4' />
                    New Snippet
                </button>
            </div>

            {/* Snippets list */}
            <div className='max-h-40 overflow-y-auto border border-gray-200 rounded-lg'>
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
                                onClick={() => handleSnippetClick(snippet)}
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
}
