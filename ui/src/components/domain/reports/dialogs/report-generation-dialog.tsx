import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
    CodeIcon,
    DownloadSimpleIcon,
    EyeIcon,
    EyeSlashIcon,
    FileTextIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

/**
 * Report format types
 */
type ReportFormat = 'html' | 'json' | 'plain';

/**
 * Report mode types
 */
type ReportMode = 'anonymized' | 'transparent';

/**
 * ReportGenerationDialog component props
 */
interface ReportGenerationDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
    /** ID of the note to generate report from */
    noteId?: string;
    /** List of notes to generate report from */
    notes?: { id: string; title: string }[];
    /** Title of the note */
    noteTitle?: string;
}

/**
 * ReportGenerationDialog component - generates reports from notes in various formats
 *
 * Supports HTML, JSON, and plain text formats, with anonymized or transparent modes.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <ReportGenerationDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   noteId="123e4567-e89b-12d3-a456-426614174000"
 *   noteTitle="My Report"
 * />
 * ```
 */
export default function ReportGenerationDialog({
    open,
    onOpenChange,
    noteId,
    notes,
    noteTitle,
}: ReportGenerationDialogProps): React.JSX.Element {
    const [title, setTitle] = useState(noteTitle || '');
    const [format, setFormat] = useState<ReportFormat>('html');
    const [mode, setMode] = useState<ReportMode>('anonymized');

    const generateReport = useMutation({
        mutationFn: async (data: {
            title: string;
            format: ReportFormat;
            mode: ReportMode;
            noteIds: string[];
        }) => {
            const { error, response } = await fetchClient.POST('/reports/publish/', {
                body: {
                    strategy: data.format,
                    note_ids: data.noteIds,
                    title: data.title.trim(),
                    anonymized: data.mode === 'anonymized',
                },
            });
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'Report generated successfully!',
        },
        onSuccess: () => {
            onOpenChange(false);
        },
    });

    const targets = useMemo(() => {
        return (
            notes ?? (noteId ? [{ id: noteId, title: noteTitle || 'Untitled' }] : [])
        );
    }, [notes, noteId, noteTitle]);

    const isSingle = targets.length === 1;

    const [checkedIds, setCheckedIds] = useState<Set<string>>(
        () => new Set(targets.map((t) => t.id)),
    );

    // Optional: keep title in sync when opening / switching notes
    useEffect(() => {
        if (!open) return;
        setTitle(noteTitle || '');
    }, [open, noteTitle]);

    // Update selection only when it actually needs to change
    useEffect(() => {
        if (!open) return;

        const next = new Set(targets.map((t) => t.id));

        setCheckedIds((prev) => {
            if (prev.size !== next.size) return next;
            for (const id of prev) if (!next.has(id)) return next;
            return prev; // no change => no re-render loop
        });
    }, [open, targets]);

    const toggleNote = (id: string) => {
        setCheckedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const submit = () => {
        if (!title.trim()) {
            toast.error('Please enter a report title.');
            return;
        }

        const selectedNotes = isSingle
            ? targets
            : targets.filter((t) => checkedIds.has(t.id));

        if (selectedNotes.length === 0) {
            toast.error('No notes selected for report generation.');
            return;
        }

        generateReport.mutate({
            title: title.trim(),
            format,
            mode,
            noteIds: selectedNotes.map((t) => t.id),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>Generate Report</DialogTitle>
                    <DialogDescription>
                        {isSingle
                            ? `Generate a report from "${targets[0]?.title || 'Untitled'}" in various formats (HTML, JSON, or plain text).`
                            : 'Generate reports from selected notes in various formats (HTML, JSON, or plain text).'}
                    </DialogDescription>
                </DialogHeader>

                {/* Selected Notes List - Only show for bulk operations */}
                {!isSingle && targets.length > 0 && (
                    <FieldSet>
                        <FieldLegend>Selected Notes ({checkedIds.size})</FieldLegend>
                        <ScrollArea className='border border-border rounded-lg max-h-48'>
                            <ul>
                                {targets.map((note) => {
                                    const isChecked = checkedIds.has(note.id);
                                    return (
                                        <li
                                            key={note.id}
                                            className={`flex items-center gap-3 px-4 py-2 border-b border-border last:border-b-0 transition-colors ${
                                                isChecked
                                                    ? 'hover:bg-secondary/50'
                                                    : 'bg-secondary/10'
                                            }`}
                                        >
                                            <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={() =>
                                                    toggleNote(note.id)
                                                }
                                            />
                                            <span
                                                className={`text-sm truncate flex-1 ${
                                                    isChecked
                                                        ? 'text-foreground'
                                                        : 'text-muted-foreground line-through decoration-muted-foreground'
                                                }`}
                                            >
                                                {note.title || 'Untitled'}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </ScrollArea>
                    </FieldSet>
                )}

                <FieldGroup className='gap-4'>
                    {/* Title Input */}
                    <Field>
                        <FieldLabel htmlFor='report-title'>Report Title</FieldLabel>
                        <Input
                            id='report-title'
                            type='text'
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder='Enter report title...'
                            disabled={generateReport.isPending}
                        />
                    </Field>

                    {/* Format Selection */}
                    <Field>
                        <FieldLabel htmlFor='format-select'>Format</FieldLabel>
                        <Select
                            value={format}
                            onValueChange={(value) => setFormat(value as ReportFormat)}
                            disabled={generateReport.isPending}
                        >
                            <SelectTrigger id='format-select' className='w-full'>
                                <SelectValue placeholder='Select format' />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='html'>
                                    <FileTextIcon className='size-4' weight='bold' />
                                    <span>HTML</span>
                                </SelectItem>
                                <SelectItem value='json'>
                                    <CodeIcon className='size-4' weight='bold' />
                                    <span>JSON</span>
                                </SelectItem>
                                <SelectItem value='plain'>
                                    <DownloadSimpleIcon
                                        className='size-4'
                                        weight='bold'
                                    />
                                    <span>Plain Text</span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>

                    {/* Mode Selection */}
                    <Field>
                        <FieldLabel htmlFor='mode-select'>Mode</FieldLabel>
                        <Select
                            value={mode}
                            onValueChange={(value) => setMode(value as ReportMode)}
                            disabled={generateReport.isPending}
                        >
                            <SelectTrigger id='mode-select' className='w-full'>
                                <SelectValue placeholder='Select mode' />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='anonymized'>
                                    <EyeSlashIcon className='size-4' weight='bold' />
                                    <span>Anonymized</span>
                                </SelectItem>
                                <SelectItem value='transparent'>
                                    <EyeIcon className='size-4' weight='bold' />
                                    <span>Transparent</span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                </FieldGroup>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            disabled={generateReport.isPending}
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={submit}
                        disabled={generateReport.isPending || !title.trim()}
                        type='button'
                        variant='default'
                        size='sm'
                    >
                        {generateReport.isPending && <Spinner />}
                        {generateReport.isPending ? 'Generating...' : 'Generate Report'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
