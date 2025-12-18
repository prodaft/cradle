import { useNotif } from '@/contexts';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import { Code, Download, Page } from 'iconoir-react';
import { useState } from 'react';

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
    const { notify } = useNotif();
    const { execute } = useAPICall();

    const targets = selectedNotes || (noteId ? [{ id: noteId, title: noteTitle || 'Untitled' }] : []);

    const handleGenerate = async () => {
        if (!title.trim()) {
            notify({
                type: 'error',
                text: 'Please enter a report title.',
            });
            return;
        }

        if (targets.length === 0) {
            notify({
                type: 'error',
                text: 'No notes selected for report generation.',
            });
            return;
        }

        setIsGenerating(true);
        try {
            await execute(
                () =>
                    reportsApi.reportsPublishCreate({
                        publishReportRequest: {
                            strategy: format,
                            noteIds: targets.map((t) => t.id),
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
        <div className='min-w-[400px] max-w-lg'>
             <div className='flex items-end justify-between mb-4'>
                <div className='flex items-center gap-3'>
                    <h2 className='text-xl font-semibold text-cradle-text-primary tracking-wide'>
                        Generate Report
                    </h2>
                </div>
            </div>

            {/* Selected Notes List */}
            {targets.length > 0 && (
                <div className='mb-5'>
                    <h3 className='cradle-label mb-2 block'>
                        Selected Notes ({targets.length})
                    </h3>
                    <ul className='border border-cradle-border-accent rounded-lg max-h-48 overflow-y-auto'>
                        {targets.map((note) => (
                            <li
                                key={note.id}
                                className='px-4 py-2 text-cradle-text-primary text-sm border-b border-cradle-border-accent last:border-b-0 hover:bg-cradle-bg-secondary/50 transition-colors truncate'
                            >
                                {note.title || 'Untitled'}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Title Input */}
            <div className='mb-5'>
                <label className='cradle-label mb-2 block'>
                    Report Title
                </label>
                <input
                    type='text'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className='cradle-input w-full'
                    placeholder='Enter report title...'
                    disabled={isGenerating}
                />
            </div>

            {/* Format Selection */}
            <div className='mb-5'>
                <label className='cradle-label mb-2 block'>
                    Format
                </label>
                <div className='grid grid-cols-3 gap-3'>
                    <button
                        onClick={() => setFormat('html')}
                        disabled={isGenerating}
                        type='button'
                        className={`p-3 border rounded-xl flex flex-col items-center gap-2 transition-colors ${
                            format === 'html'
                                ? 'border-cradle-accent-primary bg-cradle-accent-primary/10 text-cradle-accent-primary'
                                : 'border-cradle-border-accent hover:border-cradle-accent-primary/50 text-cradle-text-secondary hover:text-cradle-text-primary'
                        } disabled:opacity-50`}
                    >
                        <Page width='20' height='20' />
                        <span className='text-sm font-medium'>HTML</span>
                    </button>
                    <button
                        onClick={() => setFormat('json')}
                        disabled={isGenerating}
                        type='button'
                        className={`p-3 border rounded-xl flex flex-col items-center gap-2 transition-colors ${
                            format === 'json'
                                ? 'border-cradle-accent-primary bg-cradle-accent-primary/10 text-cradle-accent-primary'
                                : 'border-cradle-border-accent hover:border-cradle-accent-primary/50 text-cradle-text-secondary hover:text-cradle-text-primary'
                        } disabled:opacity-50`}
                    >
                        <Code width='20' height='20' />
                        <span className='text-sm font-medium'>JSON</span>
                    </button>
                    <button
                        onClick={() => setFormat('plain')}
                        disabled={isGenerating}
                        type='button'
                        className={`p-3 border rounded-xl flex flex-col items-center gap-2 transition-colors ${
                            format === 'plain'
                                ? 'border-cradle-accent-primary bg-cradle-accent-primary/10 text-cradle-accent-primary'
                                : 'border-cradle-border-accent hover:border-cradle-accent-primary/50 text-cradle-text-secondary hover:text-cradle-text-primary'
                        } disabled:opacity-50`}
                    >
                        <Download width='20' height='20' />
                        <span className='text-sm font-medium'>Plain Text</span>
                    </button>
                </div>
            </div>

            {/* Mode Selection */}
            <div className='mb-6'>
                <label className='cradle-label mb-2 block'>
                    Mode
                </label>
                <div className='grid grid-cols-2 gap-3'>
                    <button
                        onClick={() => setMode('anonymized')}
                        disabled={isGenerating}
                        type='button'
                        className={`p-3 border rounded-xl flex items-center justify-center gap-2 transition-colors ${
                            mode === 'anonymized'
                                ? 'border-cradle-accent-primary bg-cradle-accent-primary/10 text-cradle-accent-primary'
                                : 'border-cradle-border-accent hover:border-cradle-accent-primary/50 text-cradle-text-secondary hover:text-cradle-text-primary'
                        } disabled:opacity-50`}
                    >
                        <span className='text-sm font-medium'>Anonymized</span>
                    </button>
                    <button
                        onClick={() => setMode('transparent')}
                        disabled={isGenerating}
                        type='button'
                        className={`p-3 border rounded-xl flex items-center justify-center gap-2 transition-colors ${
                            mode === 'transparent'
                                ? 'border-cradle-accent-primary bg-cradle-accent-primary/10 text-cradle-accent-primary'
                                : 'border-cradle-border-accent hover:border-cradle-accent-primary/50 text-cradle-text-secondary hover:text-cradle-text-primary'
                        } disabled:opacity-50`}
                    >
                        <span className='text-sm font-medium'>Transparent</span>
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className='flex justify-end gap-2 mt-4 pt-3 cradle-border-t'>
                <button
                    onClick={closeModal}
                    disabled={isGenerating}
                    type='button'
                    className='rounded-full border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary text-sm px-3 py-1.5 flex items-center gap-1.5'
                >
                    Cancel
                </button>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !title.trim()}
                    type='button'
                    className='rounded-full border border-cradle-accent-primary bg-cradle-accent-primary/10 text-cradle-accent-primary hover:bg-cradle-accent-primary/20 transition-colors text-sm px-4 py-1.5 flex items-center gap-1.5'
                >
                    {isGenerating && (
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current' />
                    )}
                    {isGenerating ? 'Generating...' : 'Generate Report'}
                </button>
            </div>
        </div>
    );
}
