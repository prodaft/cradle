import { useTheme } from '@/contexts/ui/ThemeContext';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import { eclipse } from '@uiw/codemirror-theme-eclipse';
import CodeMirror from '@uiw/react-codemirror';
import { useState } from 'react';

/**
 * MarkdownEditorModal component props
 */
export interface MarkdownEditorModalProps {
    /** Callback function when content is confirmed, receives content and title */
    onConfirm: (content: string, title: string) => Promise<void>;
    /** Title for the modal/note */
    title?: string;
    /** Whether the title is editable */
    titleEditable?: boolean;
    /** Function to close the modal */
    closeModal: () => void;
    /** Initial markdown content */
    initialContent?: string;
    /** Optional help text to display below the editor - can be a string or React node */
    helpText?: React.ReactNode;
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
 *
 * // With custom HTML
 * <MarkdownEditorModal
 *   title="My Note"
 *   titleEditable={true}
 *   initialContent="# Hello World"
 *   onConfirm={(content, title) => console.log(content, title)}
 *   closeModal={closeModal}
 *   helpText={<div>Custom <strong>HTML</strong> content</div>}
 * />
 * ```
 */
export default function MarkdownEditorModal({
    onConfirm,
    title,
    titleEditable = false,
    closeModal,
    initialContent = '',
    helpText,
}: MarkdownEditorModalProps): JSX.Element {
    const [userInput, setUserInput] = useState(initialContent);
    const [noteTitle, setNoteTitle] = useState(title || '');
    const { isDarkMode } = useTheme();

    const extensions = [
        markdown({ codeLanguages: languages }),
        EditorView.lineWrapping,
    ];

    const handleConfirm = async () => {
        await onConfirm(userInput, noteTitle);
        closeModal();
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNoteTitle(e.target.value);
    };

    const handleContentChange = (value: string) => {
        setUserInput(value);
    };

    return (
        <div className='w-full min-w-[500px] max-w-3xl'>
            {/* Header */}
            <div className='flex items-end justify-between mb-4'>
                <div className='flex items-center gap-3 w-full'>
                    {titleEditable ? (
                        <input
                            type='text'
                            value={noteTitle}
                            onChange={handleTitleChange}
                            placeholder='Enter title'
                            className='text-xl font-semibold text-cradle-text-primary tracking-wide w-full bg-transparent border-none outline-none focus:ring-0 p-0 placeholder-cradle-text-tertiary'
                        />
                    ) : (
                        <h2 className='text-xl font-semibold text-cradle-text-primary tracking-wide'>
                            {noteTitle}
                        </h2>
                    )}
                </div>
            </div>

            {/* Editor Section */}
            <div className='mb-6'>
                <label
                    htmlFor='markdown-content'
                    className='cradle-label mb-2 block'
                >
                    Content
                </label>
                <div className='border border-cradle-border-accent rounded-lg overflow-hidden w-full'>
                    <CodeMirror
                        value={userInput}
                        onChange={handleContentChange}
                        theme={isDarkMode ? 'dark' : eclipse}
                        height='400px'
                        extensions={extensions}
                        placeholder='Write your markdown content here...'
                        className='w-full text-base'
                        width="100%"
                    />
                </div>
            </div>

            {/* Help Text Section */}
            {helpText && (
                <div className='mb-6 p-4 border border-cradle-border-accent bg-cradle-bg-secondary/30 rounded-lg'>
                    <div className='flex items-start gap-3'>
                        <div className='w-2 h-2 rounded-full bg-cradle-accent-primary mt-1.5 flex-shrink-0'></div>
                        <div className='text-xs text-cradle-text-tertiary leading-relaxed'>
                            {helpText}
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className='flex justify-end gap-2 mt-4 pt-3 cradle-border-t'>
                <button
                    type='button'
                    className='rounded-lg border border-cradle-border-accent bg-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors text-cradle-text-secondary text-sm px-3 py-1.5 flex items-center gap-1.5'
                    onClick={closeModal}
                >
                    <span>Cancel</span>
                </button>
                <button
                    type='button'
                    className='rounded-lg border border-cradle-accent-primary bg-cradle-accent-primary/10 text-cradle-accent-primary hover:bg-cradle-accent-primary/20 transition-colors text-sm px-4 py-1.5 flex items-center gap-1.5'
                    onClick={handleConfirm}
                >
                    <span>Save</span>
                </button>
            </div>
        </div>
    );
}
