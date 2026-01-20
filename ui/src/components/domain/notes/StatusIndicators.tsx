import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { startCase } from 'lodash';
import { StatusIcon, type StatusType } from './StatusIcon';

type SaveStatus = 'empty' | 'saving' | 'unsaved' | 'saved';
type NoteStatus = StatusType | null;

export function getSaveStatus(
    markdownContent: string,
    saving: boolean,
    hasUnsavedChanges: boolean,
): SaveStatus {
    if (!markdownContent || markdownContent.trim().length === 0) {
        return 'empty';
    }
    if (saving) {
        return 'saving';
    }
    if (hasUnsavedChanges) {
        return 'unsaved';
    }
    return 'saved';
}

interface StatusIndicatorsProps {
    markdownContent: string;
    saving: boolean;
    hasUnsavedChanges: boolean;
    noteStatus: NoteStatus;
    noteStatusMessage?: string;
    isFleeting: boolean;
}

/**
 * Displays save status and health status indicators
 */
export default function StatusIndicators({
    markdownContent,
    saving,
    hasUnsavedChanges,
    noteStatus,
    noteStatusMessage,
    isFleeting,
}: StatusIndicatorsProps) {
    const saveStatus = getSaveStatus(markdownContent, saving, hasUnsavedChanges);

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className='flex items-center justify-center'
                        data-testid='save-status-dot'
                    >
                        <div
                            className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saved'
                                    ? 'bg-primary'
                                    : saveStatus === 'saving'
                                        ? 'bg-accent'
                                        : saveStatus === 'unsaved'
                                            ? 'bg-destructive'
                                            : 'bg-muted-foreground'
                                }`}
                        />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    {saveStatus === 'saved'
                        ? 'All changes saved'
                        : saveStatus === 'saving'
                            ? 'Saving...'
                            : saveStatus === 'unsaved'
                                ? 'Unsaved changes'
                                : 'Cannot save empty note'}
                </TooltipContent>
            </Tooltip>

            {(noteStatus || isFleeting) && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className='flex items-center justify-center text-muted-foreground'>
                            <StatusIcon 
                                status={isFleeting ? 'fleeting' : (noteStatus as StatusType)} 
                            />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        {isFleeting
                            ? 'Fleeting note'
                            : noteStatusMessage || startCase(noteStatus || '')}
                    </TooltipContent>
                </Tooltip>
            )}
        </>
    );
}
