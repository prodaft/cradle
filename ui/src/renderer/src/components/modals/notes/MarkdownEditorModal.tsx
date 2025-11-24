import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import { eclipse } from '@uiw/codemirror-theme-eclipse';
import CodeMirror from '@uiw/react-codemirror';
import { useState } from 'react';
import { useTheme } from '@/contexts/ui/ThemeContext';

/**
 * MarkdownEditorModal component props
 */
export interface MarkdownEditorModalProps {
  /** Callback function when content is confirmed, receives content and title */
  onConfirm: (content: string, title: string) => void;
  /** Title for the modal/note */
  title?: string;
  /** Whether the title is editable */
  titleEditable?: boolean;
  /** Function to close the modal */
  closeModal: () => void;
  /** Initial markdown content */
  initialContent?: string;
  /** Optional help text to display below the editor */
  helpText?: string | null;
}

/**
 * MarkdownEditorModal component - provides a markdown editor with syntax highlighting
 *
 * Uses CodeMirror for markdown editing with support for code blocks in multiple languages.
 *
 * @example
 * ```tsx
 * <MarkdownEditorModal
 *   title="My Note"
 *   titleEditable={true}
 *   initialContent="# Hello World"
 *   onConfirm={(content, title) => console.log(content, title)}
 *   closeModal={closeModal}
 *   helpText="This note will be saved to your collection"
 * />
 * ```
 */
export default function MarkdownEditorModal({
    onConfirm,
    title,
    titleEditable = false,
    closeModal,
    initialContent = '',
    helpText = null,
}: MarkdownEditorModalProps): JSX.Element {
    const [userInput, setUserInput] = useState(initialContent);
    const [noteTitle, setNoteTitle] = useState(title || '');
    const { isDarkMode } = useTheme();

    const extensions = [markdown({ codeLanguages: languages }), EditorView.lineWrapping];

    const handleConfirm = () => {
        onConfirm(userInput, noteTitle);
        closeModal();
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNoteTitle(e.target.value);
    };

    const handleContentChange = (value: string) => {
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
                        theme={isDarkMode ? 'dark' : eclipse}
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
}
