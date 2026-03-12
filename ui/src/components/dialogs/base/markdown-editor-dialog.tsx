import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/contexts/ui';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import { eclipse } from '@uiw/codemirror-theme-eclipse';
import CodeMirror from '@uiw/react-codemirror';
import { useState } from 'react';

/**
 * MarkdownEditorDialog component props
 */
interface MarkdownEditorDialogProps {
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
 * MarkdownEditorDialog component - provides a markdown editor with syntax highlighting
 *
 * Uses CodeMirror for markdown editing with support for code blocks in multiple languages.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <MarkdownEditorDialog
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
 * <MarkdownEditorDialog
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
export default function MarkdownEditorDialog({
    onConfirm,
    title,
    titleEditable = false,
    open,
    onOpenChange,
    initialContent = '',
    helpText,
}: MarkdownEditorDialogProps): React.ReactElement {
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
                    <DialogTitle>New snippet</DialogTitle>
                    <DialogDescription>
                        Edit markdown content for this note
                    </DialogDescription>
                </DialogHeader>

                {/* Title Section */}
                <Field>
                    <FieldLabel htmlFor='note-title'>Title</FieldLabel>
                    <Input
                        id='note-title'
                        type='text'
                        value={noteTitle}
                        onChange={handleTitleChange}
                        placeholder='Enter title'
                        disabled={!titleEditable}
                    />
                </Field>

                {/* Editor Section */}
                <Field>
                    <FieldLabel htmlFor='markdown-content'>Content</FieldLabel>
                    <div className='border border-border rounded-lg overflow-hidden'>
                        <CodeMirror
                            value={userInput}
                            onChange={handleContentChange}
                            theme={isDarkMode ? 'dark' : eclipse}
                            height='400px'
                            extensions={extensions}
                            placeholder='Write your markdown content here...'
                            className='text-base'
                            width='100%'
                        />
                    </div>
                </Field>

                {/* Help Text Section */}
                {helpText && (
                    <div className='p-4 border border-border bg-secondary/30 rounded-lg'>
                        <div className='flex items-start gap-3'>
                            <div className='w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0' />
                            <span className='text-xs text-muted-foreground leading-relaxed'>
                                {helpText}
                            </span>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <DialogClose asChild>
                        <Button type='button' variant='outline' size='sm'>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type='button'
                        variant='default'
                        size='sm'
                        onClick={handleConfirm}
                    >
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
