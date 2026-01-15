import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import useApi from '@/hooks/api/useApi';
import { useMutation } from '@tanstack/react-query';
import { Code, Download, Eye, EyeClosed, Page } from 'iconoir-react';
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
 * ReportGenerationModal component props
 */
export interface ReportGenerationModalProps {
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
 * ReportGenerationModal component - generates reports from notes in various formats
 *
 * Supports HTML, JSON, and plain text formats, with anonymized or transparent modes.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <ReportGenerationModal
 *   open={open}
 *   onOpenChange={setOpen}
 *   noteId="123e4567-e89b-12d3-a456-426614174000"
 *   noteTitle="My Report"
 * />
 * ```
 */
export default function ReportGenerationModal({
    open,
    onOpenChange,
    noteId,
    selectedNotes,
    noteTitle,
}: ReportGenerationModalProps): React.JSX.Element {
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
            <DialogContent>
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
                    <div className='mb-5'>
                        <Label>Selected Notes ({selectedIds.size})</Label>
                        <ul className='border border-border rounded-lg max-h-48 overflow-y-auto'>
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
                    </div>
                )}

                {/* Title Input */}
                <div className='grid w-full items-center gap-3 mb-5'>
                    <Label htmlFor='report-title'>Report Title</Label>
                    <Input
                        id='report-title'
                        type='text'
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder='Enter report title...'
                        disabled={generateReportMutation.isPending}
                    />
                </div>

                {/* Format Selection */}
                <div className='grid w-full items-center gap-3 mb-5'>
                    <Label htmlFor='format-select'>Format</Label>
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
                                <Page className='size-4' />
                                <span>HTML</span>
                            </SelectItem>
                            <SelectItem value='json'>
                                <Code className='size-4' />
                                <span>JSON</span>
                            </SelectItem>
                            <SelectItem value='plain'>
                                <Download className='size-4' />
                                <span>Plain Text</span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Mode Selection */}
                <div className='grid w-full items-center gap-3 mb-6'>
                    <Label htmlFor='mode-select'>Mode</Label>
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
                                <EyeClosed className='size-4' />
                                <span>Anonymized</span>
                            </SelectItem>
                            <SelectItem value='transparent'>
                                <Eye className='size-4' />
                                <span>Transparent</span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Footer */}
                <div className='flex justify-end gap-2 mt-4'>
                    <Button
                        onClick={() => onOpenChange(false)}
                        disabled={generateReportMutation.isPending}
                        type='button'
                        variant='outline'
                        size='sm'
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={generateReportMutation.isPending || !title.trim()}
                        type='button'
                        variant='default'
                        size='sm'
                    >
                        {generateReportMutation.isPending && (
                            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current' />
                        )}
                        {generateReportMutation.isPending
                            ? 'Generating...'
                            : 'Generate Report'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
