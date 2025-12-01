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
    onConfirm: (content: string, title: string) => void;
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
        <div className="w-full min-w-[28rem]">
            {/* Header */}
            {titleEditable ? (
                <input
                    type="text"
                    value={noteTitle}
                    onChange={handleTitleChange}
                    placeholder="Enter title"
                    className="font-semibold mb-3 mt-3 cradle-text-primary cradle-mono mb-2 w-full bg-transparent border-none outline-none focus:ring-0 p-0"
                />
            ) : (
                <h2 className="text-xl font-semibold cradle-text-primary cradle-mono mb-3">
                    {noteTitle}
                </h2>
            )}

            {/* Editor Section */}
            <div className="mb-6">
                <label
                    htmlFor="markdown-content"
                    className="block text-sm font-medium cradle-text-secondary cradle-mono mb-2"
                >
                    Content
                </label>
                <div className="cradle-border rounded overflow-hidden">
                    <CodeMirror
                        value={userInput}
                        onChange={handleContentChange}
                        theme={isDarkMode ? 'dark' : eclipse}
                        height="300px"
                        extensions={extensions}
                        placeholder="Write your markdown content here..."
                        className="w-full CodeMirror"
                    />
                </div>
            </div>


            {/* Help Text Section */}
            {helpText && (
                <div className="mb-6 p-4 cradle-border cradle-bg-secondary rounded">
                    <div className="flex items-start gap-3">
                        <div className="cradle-status-light cradle-status-info mt-1 flex-shrink-0"></div>
                        <div className="text-xs cradle-text-tertiary cradle-mono leading-relaxed">
                            {helpText}
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="cradle-border-t pt-5 mt-5">
                <div className="flex gap-3">
                    <button
                        type="button"
                        className="cradle-btn cradle-btn-ghost flex-1"
                        onClick={closeModal}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="cradle-btn cradle-btn-primary flex-1"
                        onClick={handleConfirm}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
