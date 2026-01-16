import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
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
 * const [open, setOpen] = useState(false);
 * <MarkdownEditorModal
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="My Note"
 *   titleEditable={true}
 *   initialContent="# Hello World"
 *   onConfirm={(content, title) => console.log(content, title)}
 *   helpText="This note will be saved to your collection"
 * />
 *
 * // With custom HTML
 * <MarkdownEditorModal
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="My Note"
 *   titleEditable={true}
 *   initialContent="# Hello World"
 *   onConfirm={(content, title) => console.log(content, title)}
 *   helpText={<div>Custom <strong>HTML</strong> content</div>}
 * />
 * ```
 */
export default function MarkdownEditorModal({
    onConfirm,
    title,
    titleEditable = false,
    open,
    onOpenChange,
    initialContent = '',
    helpText,
}: MarkdownEditorModalProps): React.ReactElement {
    const [userInput, setUserInput] = useState(initialContent);
    const [noteTitle, setNoteTitle] = useState(title || '');
    const { isDarkMode } = useTheme();

    const extensions = [
        markdown({ codeLanguages: languages }),
        EditorView.lineWrapping,
    ];

    const handleConfirm = async () => {
        await onConfirm(userInput, noteTitle);
        onOpenChange(false);
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNoteTitle(e.target.value);
    };

    const handleContentChange = (value: string) => {
        setUserInput(value);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    {titleEditable ? (
                        <>
                            <DialogTitle className='sr-only'>
                                {noteTitle || 'Note Editor'}
                            </DialogTitle>
                            <Input
                                type='text'
                                value={noteTitle}
                                onChange={handleTitleChange}
                                placeholder='Enter title'
                                className='text-lg font-semibold text-foreground tracking-wide w-full bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-muted-foreground shadow-none h-auto'
                            />
                        </>
                    ) : (
                        <DialogTitle>{noteTitle}</DialogTitle>
                    )}
                    <DialogDescription className='sr-only'>
                        Edit markdown content for this note
                    </DialogDescription>
                </DialogHeader>

                {/* Editor Section */}
                <div className='grid w-full items-center gap-3 mb-6'>
                    <Label htmlFor='markdown-content'>Content</Label>
                    <div className='border border-border rounded-lg overflow-hidden w-full'>
                        <CodeMirror
                            value={userInput}
                            onChange={handleContentChange}
                            theme={isDarkMode ? 'dark' : eclipse}
                            height='400px'
                            extensions={extensions}
                            placeholder='Write your markdown content here...'
                            className='w-full text-base'
                            width='100%'
                        />
                    </div>
                </div>

                {/* Help Text Section */}
                {helpText && (
                    <div className='mb-6 p-4 border border-border bg-secondary/30 rounded-lg'>
                        <div className='flex items-start gap-3'>
                            <div className='w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0'></div>
                            <div className='text-xs text-muted-foreground leading-relaxed'>
                                {helpText}
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className='flex justify-end gap-2 mt-4'>
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type='button'
                        variant='default'
                        size='sm'
                        onClick={handleConfirm}
                    >
                        Save
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
