import React, { useState, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { languages } from '@codemirror/language-data';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { eclipse } from '@uiw/codemirror-theme-eclipse';
import { useTheme } from '../../contexts/ThemeContext/ThemeContext';

const MarkdownEditorModal = ({
    onConfirm,
    title,
    titleEditable = false,
    closeModal,
    initialContent = '',
    helpText = null,
}) => {
    const [userInput, setUserInput] = useState(initialContent);
    const [noteTitle, setNoteTitle] = useState(title || '');
    const { isDarkMode } = useTheme();

    const extensions = useMemo(
        () => [markdown({ codeLanguages: languages }), EditorView.lineWrapping],
        [],
    );

    const handleConfirm = () => {
        onConfirm(userInput, noteTitle);
        closeModal();
    };

    const handleTitleChange = (e) => {
        setNoteTitle(e.target.value);
    };

    const handleContentChange = (value) => {
        setUserInput(value);
    };

    return (
        <div className='w-[100%]'>
            <h2 className='text-2xl font-bold mb-4 mt-8'>
                {titleEditable ? (
                    <input
                        type='text'
                        value={noteTitle}
                        onChange={handleTitleChange}
                        placeholder='Enter title'
                        className='input input-block input-bordered w-full text-xl'
                    />
                ) : (
                    noteTitle
                )}
            </h2>

            <div className='mb-4'>
                <label
                    htmlFor='markdown-content'
                    className='block text-sm font-medium text-gray-700 mb-1 dark:text-gray-400'
                >
                    Content
                </label>
                <div className='border border-gray-300 rounded-md overflow-hidden'>
                    <CodeMirror
                        value={userInput}
                        onChange={handleContentChange}
                        theme={isDarkMode ? vscodeDark : eclipse}
                        height='300px'
                        extensions={extensions}
                        placeholder='Write your markdown content here...'
                        className='w-full CodeMirror'
                    />
                </div>
            </div>

            {helpText && (
                <div className='mb-4 text-sm text-gray-600 bg-gray-100 p-3 rounded-md dark:bg-gray-800 dark:text-gray-300'>
                    <p>{helpText}</p>
                </div>
            )}

            <div className='flex justify-end gap-2'>
                <button type='button' className='btn' onClick={closeModal}>
                    Cancel
                </button>
                <button
                    type='button'
                    className='btn btn-primary'
                    onClick={handleConfirm}
                >
                    Save
                </button>
            </div>
        </div>
    );
};

export default MarkdownEditorModal;
