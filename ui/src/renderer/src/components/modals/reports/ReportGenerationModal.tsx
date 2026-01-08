import { toast } from 'sonner';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import { Code, Download, Page } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    /** Function to close the modal */
    closeModal: () => void;
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
 * <ReportGenerationModal
 *   closeModal={closeModal}
 *   noteId="123e4567-e89b-12d3-a456-426614174000"
 *   noteTitle="My Report"
 * />
 * ```
 */
export default function ReportGenerationModal({
    closeModal,
    noteId,
    selectedNotes,
    noteTitle,
}: ReportGenerationModalProps): JSX.Element {
    const { reportsApi } = useApi();
    const [title, setTitle] = useState(noteTitle || '');
    const [format, setFormat] = useState<ReportFormat>('html');
    const [mode, setMode] = useState<ReportMode>('anonymized');
    const [isGenerating, setIsGenerating] = useState(false);
    const { execute } = useAPICall();

    const targets =
        selectedNotes ||
        (noteId ? [{ id: noteId, title: noteTitle || 'Untitled' }] : []);

    // Track selected note IDs
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        () => new Set(targets.map((t) => t.id)),
    );

    // Update selection if targets change (e.g. initial load)
    useEffect(() => {
        setSelectedIds(new Set(targets.map((t) => t.id)));
    }, [targets]);

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleGenerate = async () => {
        if (!title.trim()) {
            toast.error('Please enter a report title.');
            return;
        }

        const validTargets = targets.filter((t) => selectedIds.has(t.id));

        if (validTargets.length === 0) {
            toast.error('No notes selected for report generation.');
            return;
        }

        setIsGenerating(true);
        try {
            await execute(
                () =>
                    reportsApi.reportsPublishCreate({
                        publishReportRequest: {
                            strategy: format,
                            noteIds: validTargets.map((t) => t.id),
                            title: title.trim(),
                            anonymized: mode === 'anonymized',
                        },
                    }),
                {
                    successMessage: 'Report generated successfully!',
                },
            );

            closeModal();
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>Generate Report</DialogTitle>
            </DialogHeader>

            {/* Selected Notes List */}
            {targets.length > 0 && (
                <div className='mb-5'>
                    <Label>
                        Selected Notes ({selectedIds.size})
                    </Label>
                    <ul className='border border-cradle-border-accent rounded-lg max-h-48 overflow-y-auto'>
                        {targets.map((note) => {
                            const isSelected = selectedIds.has(note.id);
                            return (
                                <li
                                    key={note.id}
                                    className={`flex items-center gap-3 px-4 py-2 border-b border-cradle-border-accent last:border-b-0 transition-colors ${
                                        isSelected
                                            ? 'hover:bg-cradle-bg-secondary/50'
                                            : 'bg-cradle-bg-secondary/10'
                                    }`}
                                >
                                    <input
                                        type='checkbox'
                                        className='cradle-checkbox'
                                        checked={isSelected}
                                        onChange={() => toggleSelection(note.id)}
                                    />
                                    <span
                                        className={`text-sm truncate flex-1 ${
                                            isSelected
                                                ? 'text-cradle-text-primary'
                                                : 'text-cradle-text-tertiary line-through decoration-cradle-text-tertiary'
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
                <Label htmlFor='report-title'>
                    Report Title
                </Label>
                <Input
                    id='report-title'
                    type='text'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder='Enter report title...'
                    disabled={isGenerating}
                />
            </div>

            {/* Format Selection */}
            <div className='mb-5'>
                <Label>
                    Format
                </Label>
                <div className='grid grid-cols-3 gap-3'>
                    <Button
                        onClick={() => setFormat('html')}
                        disabled={isGenerating}
                        type='button'
                        variant={format === 'html' ? 'default' : 'outline'}
                        className='p-3 flex flex-col items-center gap-2'
                    >
                        <Page width='20' height='20' />
                        <span className='text-sm font-medium'>HTML</span>
                    </Button>
                    <Button
                        onClick={() => setFormat('json')}
                        disabled={isGenerating}
                        type='button'
                        variant={format === 'json' ? 'default' : 'outline'}
                        className='p-3 flex flex-col items-center gap-2'
                    >
                        <Code width='20' height='20' />
                        <span className='text-sm font-medium'>JSON</span>
                    </Button>
                    <Button
                        onClick={() => setFormat('plain')}
                        disabled={isGenerating}
                        type='button'
                        variant={format === 'plain' ? 'default' : 'outline'}
                        className='p-3 flex flex-col items-center gap-2'
                    >
                        <Download width='20' height='20' />
                        <span className='text-sm font-medium'>Plain Text</span>
                    </Button>
                </div>
            </div>

            {/* Mode Selection */}
            <div className='mb-6'>
                <Label>
                    Mode
                </Label>
                <div className='grid grid-cols-2 gap-3'>
                    <Button
                        onClick={() => setMode('anonymized')}
                        disabled={isGenerating}
                        type='button'
                        variant={mode === 'anonymized' ? 'default' : 'outline'}
                        className='p-3 flex items-center justify-center gap-2'
                    >
                        <span className='text-sm font-medium'>Anonymized</span>
                    </Button>
                    <Button
                        onClick={() => setMode('transparent')}
                        disabled={isGenerating}
                        type='button'
                        variant={mode === 'transparent' ? 'default' : 'outline'}
                        className='p-3 flex items-center justify-center gap-2'
                    >
                        <span className='text-sm font-medium'>Transparent</span>
                    </Button>
                </div>
            </div>

            {/* Footer */}
            <div className='flex justify-end gap-2 mt-4'>
                <Button
                    onClick={closeModal}
                    disabled={isGenerating}
                    type='button'
                    variant='outline'
                    size='sm'
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !title.trim()}
                    type='button'
                    variant='default'
                    size='sm'
                >
                    {isGenerating && (
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current' />
                    )}
                    {isGenerating ? 'Generating...' : 'Generate Report'}
                </Button>
            </div>
        </>
    );
}
