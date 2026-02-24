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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import useApi from '@/hooks/api/use-api';
import {
    CodeIcon,
    DownloadSimpleIcon,
    EyeIcon,
    EyeSlashIcon,
    FileTextIcon,
} from '@phosphor-icons/react';
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
export interface ReportGenerationDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
    /** ID of the note to generate report from */
    noteId?: string;
    /** List of selected notes to generate report from */
    selectedNotes?: { id: string; title: string }[];
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
    selectedNotes,
    noteTitle,
}: ReportGenerationDialogProps): React.JSX.Element {
    const { reportsApi } = useApi();
    const [title, setTitle] = useState(noteTitle || '');
    const [format, setFormat] = useState<ReportFormat>('html');
    const [mode, setMode] = useState<ReportMode>('anonymized');

    const generateReportMutation = useMutation({
        mutationFn: async (data: {
            title: string;
            format: ReportFormat;
            mode: ReportMode;
            noteIds: string[];
        }) => {
            await reportsApi.reportsPublishCreate({
                publishReportRequest: {
                    strategy: data.format,
                    noteIds: data.noteIds,
                    title: data.title.trim(),
                    anonymized: data.mode === 'anonymized',
                },
            });
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
            selectedNotes ??
            (noteId ? [{ id: noteId, title: noteTitle || 'Untitled' }] : [])
        );
    }, [selectedNotes, noteId, noteTitle]);

    const isSingleNote = targets.length === 1;

    // Track selected note IDs
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
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

        setSelectedIds((prev) => {
            if (prev.size !== next.size) return next;
            for (const id of prev) if (!next.has(id)) return next;
            return prev; // no change => no re-render loop
        });
    }, [open, targets]);

    const toggleSelection = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleGenerate = () => {
        if (!title.trim()) {
            toast.error('Please enter a report title.');
            return;
        }

        // For single note, use all targets; for bulk, filter by selection
        const validTargets = isSingleNote
            ? targets
            : targets.filter((t) => selectedIds.has(t.id));

        if (validTargets.length === 0) {
            toast.error('No notes selected for report generation.');
            return;
        }

        generateReportMutation.mutate({
            title: title.trim(),
            format,
            mode,
            noteIds: validTargets.map((t) => t.id),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>Generate Report</DialogTitle>
                    <DialogDescription>
                        {isSingleNote
                            ? `Generate a report from "${targets[0]?.title || 'Untitled'}" in various formats (HTML, JSON, or plain text).`
                            : 'Generate reports from selected notes in various formats (HTML, JSON, or plain text).'}
                    </DialogDescription>
                </DialogHeader>

                {/* Selected Notes List - Only show for bulk operations */}
                {!isSingleNote && targets.length > 0 && (
                    <FieldSet>
                        <FieldLegend>Selected Notes ({selectedIds.size})</FieldLegend>
                        <ScrollArea className='border border-border rounded-lg max-h-48'>
                            <ul>
                                {targets.map((note) => {
                                    const isSelected = selectedIds.has(note.id);
                                    return (
                                        <li
                                            key={note.id}
                                            className={`flex items-center gap-3 px-4 py-2 border-b border-border last:border-b-0 transition-colors ${
                                                isSelected
                                                    ? 'hover:bg-secondary/50'
                                                    : 'bg-secondary/10'
                                            }`}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() =>
                                                    toggleSelection(note.id)
                                                }
                                            />
                                            <span
                                                className={`text-sm truncate flex-1 ${
                                                    isSelected
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
                            disabled={generateReportMutation.isPending}
                        />
                    </Field>

                    {/* Format Selection */}
                    <Field>
                        <FieldLabel htmlFor='format-select'>Format</FieldLabel>
                        <Select
                            value={format}
                            onValueChange={(value) => setFormat(value as ReportFormat)}
                            disabled={generateReportMutation.isPending}
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
                            disabled={generateReportMutation.isPending}
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
                            disabled={generateReportMutation.isPending}
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={handleGenerate}
                        disabled={generateReportMutation.isPending || !title.trim()}
                        type='button'
                        variant='default'
                        size='sm'
                    >
                        {generateReportMutation.isPending && <Spinner />}
                        {generateReportMutation.isPending
                            ? 'Generating...'
                            : 'Generate Report'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
