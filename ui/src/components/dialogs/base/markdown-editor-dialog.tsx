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
import { useEffect, useState } from 'react';

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
    /** Optional description shown below the dialog title */
    description?: string;
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
    description = 'Edit markdown content below.',
}: MarkdownEditorDialogProps): React.ReactElement {
    const [userInput, setUserInput] = useState(initialContent);
    const [noteTitle, setNoteTitle] = useState(title || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { isDarkMode } = useTheme();

    useEffect(() => {
        if (open) {
            setUserInput(initialContent ?? '');
            setNoteTitle(title ?? '');
        } else {
            setIsSubmitting(false);
        }
    }, [open, initialContent, title]);

    const extensions = [
        markdown({ codeLanguages: languages }),
        EditorView.lineWrapping,
    ];

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm(userInput, noteTitle);
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
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
                    <DialogTitle>{title ?? 'Note Snippet'}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                {titleEditable && (
                    <Field>
                        <FieldLabel htmlFor='note-title'>Title</FieldLabel>
                        <Input
                            id='note-title'
                            type='text'
                            value={noteTitle}
                            onChange={handleTitleChange}
                            placeholder='Enter title'
                        />
                    </Field>
                )}

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
                            <div className='text-xs text-muted-foreground leading-relaxed'>
                                {helpText}
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type='button'
                        variant='default'
                        size='sm'
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Saving...' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
