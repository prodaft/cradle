import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { capitalizeString } from '@/utils/dashboard';
import {
    DesignNib,
    InfoCircleSolid,
    WarningCircleSolid,
    WarningTriangleSolid,
} from 'iconoir-react';

type SaveStatus = 'empty' | 'saving' | 'unsaved' | 'saved';
type NoteStatus = 'healthy' | 'processing' | 'warning' | 'invalid' | null;

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

export function getStatusIcon(
    isFleeting: boolean,
    status: NoteStatus,
): JSX.Element | null {
    if (isFleeting) {
        return <DesignNib className='text-primary' width='18' height='18' />;
    }

    if (!status) return null;

    switch (status) {
        case 'healthy':
            return (
                <svg
                    width='18'
                    height='18'
                    viewBox='0 0 24 24'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                    className='text-primary'
                >
                    <path
                        d='M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                    />
                </svg>
            );
        case 'processing':
            return <InfoCircleSolid className='text-primary' width='18' height='18' />;
        case 'warning':
            return (
                <WarningTriangleSolid
                    className='text-muted-foreground'
                    width='18'
                    height='18'
                />
            );
        case 'invalid':
            return (
                <WarningCircleSolid
                    className='text-destructive'
                    width='18'
                    height='18'
                />
            );
        default:
            return null;
    }
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
                            className={`w-1.5 h-1.5 rounded-full ${
                                saveStatus === 'saved'
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

            {noteStatus && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className='flex items-center justify-center text-muted-foreground'>
                            {getStatusIcon(isFleeting, noteStatus)}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        {isFleeting
                            ? 'Fleeting note'
                            : noteStatusMessage || capitalizeString(noteStatus)}
                    </TooltipContent>
                </Tooltip>
            )}
        </>
    );
}
