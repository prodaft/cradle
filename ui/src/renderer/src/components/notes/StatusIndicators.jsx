import { DesignNib, InfoCircleSolid, WarningCircleSolid, WarningTriangleSolid } from 'iconoir-react';
import { capitalizeString } from '@/utils/dashboardUtils/dashboardUtils';
import Tooltip from '../Tooltip/Tooltip';

export function getSaveStatus(markdownContent, saving, hasUnsavedChanges) {
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

export function getStatusIcon(isFleeting, status) {
    if (isFleeting) {
        return <DesignNib className='text-primary' width='18' height='18' />;
    }

    if (!status) return null;

    switch (status) {
        case 'healthy':
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            );
        case 'processing':
            return <InfoCircleSolid className='text-blue-500' width='18' height='18' />;
        case 'warning':
            return <WarningTriangleSolid className='text-amber-500' width='18' height='18' />;
        case 'invalid':
            return <WarningCircleSolid className='text-red-500' width='18' height='18' />;
        default:
            return null;
    }
}

/**
 * Displays save status and health status indicators
 */
export default function StatusIndicators({ markdownContent, saving, hasUnsavedChanges, noteStatus, noteStatusMessage, isFleeting }) {
    const saveStatus = getSaveStatus(markdownContent, saving, hasUnsavedChanges);

    return (
        <>
            <Tooltip
                content={
                    saveStatus === 'saved' ? 'All changes saved' :
                        saveStatus === 'saving' ? 'Saving...' :
                            saveStatus === 'unsaved' ? 'Unsaved changes' :
                                'Cannot save empty note'
                }
            >
                <div className='flex items-center justify-center' data-testid='save-status-dot'>
                    <div
                        className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saved' ? 'bg-green-500' :
                            saveStatus === 'saving' ? 'bg-yellow-500' :
                                saveStatus === 'unsaved' ? 'bg-red-500' :
                                    'bg-gray-400'
                            }`}
                    />
                </div>
            </Tooltip>

            {noteStatus && (
                <Tooltip content={isFleeting ? 'Fleeting note' : noteStatusMessage || capitalizeString(noteStatus)}>
                    <div className='flex items-center justify-center cradle-text-tertiary'>
                        {getStatusIcon(isFleeting, noteStatus)}
                    </div>
                </Tooltip>
            )}
        </>
    );
}
