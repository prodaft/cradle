import { toast } from 'sonner';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { capitalizeString } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { parseContent } from '@/utils/editor/textEditor';
import { parseMarkdownInline } from '@/utils/parser';
import type { NoteRetrieve, NoteRetrieveStatusEnum } from '@services/cradle/models';
import {
    DesignNib,
    InfoCircleSolid,
    NavArrowDown,
    NavArrowUp,
    WarningCircleSolid,
    WarningTriangleSolid,
} from 'iconoir-react';
import React, { forwardRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Preview from '../../base/Preview/Preview';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ReferenceTree from '../relations/ReferenceTree';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface NoteAction {
    Component: React.ComponentType<{
        note: NoteRetrieve;
        setHidden: (hidden: boolean) => void;
        [key: string]: unknown;
    }>;
    props?: Record<string, unknown>;
}

interface NoteProps extends React.HTMLAttributes<HTMLDivElement> {
    id: string;
    note: NoteRetrieve;
    setAlert?: React.Dispatch<React.SetStateAction<Alert>>;
    actions?: NoteAction[];
    ghost?: boolean;
}

/**
 * Note component - This component is used to display a note on the dashboard.
 * @function Note
 * @param {Object} props - Component props
 * @param {string} props.id - The note ID
 * @param {Object} props.note - The note object
 * @param {Function} props.setAlert - Function to set alerts
 * @param {boolean} props.publishMode - Whether the component is in publish mode
 * @param {Array} props.selectedNoteIds - Array of selected note IDs
 * @param {Function} props.setSelectedNoteIds - Function to set selected note IDs
 * @param {boolean} props.draggable - Whether the note is draggable
 * @param {React.ReactNode} props.customControls - Custom controls to display in the header
 * @param {boolean} props.hideDefaultControls - Whether to hide the default controls
 */
const Note = forwardRef<HTMLDivElement, NoteProps>(function Note(
    { id, note, setAlert, actions = [], ghost = false, ...props },
    ref,
) {
    const { navigate, navigateLink } = useCradleNavigate();
    const { entriesApi, fileTransferApi, basePath } = useApi();
    const [hidden, setHidden] = useState(false);
    const location = useLocation();
    const [parsedContent, setParsedContent] = useState('');
    const [metadataExpanded, setMetadataExpanded] = useState(true);

    const getStatusIcon = (status?: NoteRetrieveStatusEnum) => {
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
                        className='text-green-500'
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
                return (
                    <InfoCircleSolid className='text-blue-500' width='18' height='18' />
                );
            case 'warning':
                return (
                    <WarningTriangleSolid
                        className='text-amber-500'
                        width='18'
                        height='18'
                    />
                );
            case 'invalid':
                return (
                    <WarningCircleSolid
                        className='text-red-500'
                        width='18'
                        height='18'
                    />
                );
            default:
                return null;
        }
    };

    useEffect(() => {
        parseContent(note.content, entriesApi, fileTransferApi, basePath, note.files)
            .then((result) => setParsedContent(result.html))
            .catch((err) =>
                toast.error('Cannot parse note!'),
            );
    }, [
        note.content,
        note.files,
        entriesApi,
        fileTransferApi,
        basePath,
        setAlert,
        navigate,
    ]);

    const style = {
        opacity: ghost ? 0.5 : 1,
    };

    if (hidden) return null;

    return (
        <div ref={ref} {...props} className='w-full min-w-0'>
            <div style={style} className='mb-4 w-full min-w-0'>
                {/* Header row with timestamp and configurable controls */}
                <div className='flex items-center justify-between border-b border-cradle-border-primary pb-3 mb-4 w-full min-w-0'>
                    <div className='flex items-center gap-3 cradle-mono text-xs min-w-0 flex-1'>
                        {note.fleeting && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className='inline-flex items-center align-middle'>
                                        <DesignNib
                                            className='text-[#FF8C00]'
                                            width='18'
                                            height='18'
                                        />
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Fleeting Note
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {note.status && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className='inline-flex items-center align-middle'>
                                        {getStatusIcon(note.status)}
                                    </span>
                                </TooltipTrigger>
                                {(note.statusMessage || capitalizeString(note.status)) && (
                                    <TooltipContent>
                                        {note.statusMessage ||
                                            capitalizeString(note.status)}
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        )}
                        {!note.editor && (
                            <>
                                <span className='cradle-text-tertiary'>
                                    {note.timestamp &&
                                        formatDate(new Date(note.timestamp))}
                                </span>
                                <span className='cradle-text-muted'>·</span>
                                <span className='cradle-text-secondary'>
                                    {note?.author ? note.author.username : 'Unknown'}
                                </span>
                            </>
                        )}
                        {note.editor && (
                            <>
                                <span className='cradle-text-tertiary'>
                                    {note.editTimestamp &&
                                        formatDate(new Date(note.editTimestamp))}
                                </span>
                                <span className='cradle-text-muted'>·</span>
                                <span className='cradle-text-secondary'>
                                    {note?.editor ? note.editor.username : 'Unknown'}
                                </span>
                            </>
                        )}
                    </div>
                    <div className='flex items-center gap-2 flex-shrink-0'>
                        {actions.map(({ Component, props: actionProps }, index) => (
                            <Component
                                key={index}
                                {...actionProps}
                                note={note}
                                setHidden={setHidden}
                            />
                        ))}
                    </div>
                </div>

                {!parsedContent && (
                    <div className='flex items-center justify-center min-h-screen'>
                        <div className='cradle-spinner-dot-pulse'>
                            <div className='cradle-spinner-pulse-dot'></div>
                        </div>
                    </div>
                )}

                <div>
                    {note.metadata && Object.keys(note.metadata).length > 0 && (
                        <div className='mb-4'>
                            <div
                                className='flex items-center cursor-pointer p-2 cradle-interactive rounded hover:bg-opacity-50'
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMetadataExpanded(!metadataExpanded);
                                }}
                            >
                                <span className='cradle-label flex items-center gap-2'>
                                    {metadataExpanded ? (
                                        <NavArrowUp width='14' height='14' />
                                    ) : (
                                        <NavArrowDown width='14' height='14' />
                                    )}
                                    Metadata
                                </span>
                            </div>

                            {metadataExpanded && (
                                <div className='border border-cradle-border-primary bg-transparent p-4 mt-2'>
                                    <div className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-2'>
                                        {Object.entries(note.metadata).map(
                                            ([key, value]) => (
                                                <React.Fragment key={key}>
                                                    <div className='text-sm font-semibold cradle-text-secondary cradle-mono'>
                                                        {capitalizeString(key)}:
                                                    </div>
                                                    <div className='text-sm cradle-text-tertiary'>
                                                        {typeof value === 'object'
                                                            ? JSON.stringify(value)
                                                            : parseMarkdownInline(
                                                                  String(value),
                                                              )}
                                                    </div>
                                                </React.Fragment>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}
                            <Separator className="my-4" />
                        </div>
                    )}

                    <div
                        className='cursor-pointer'
                        onClick={(e) =>
                            navigate(`/notes/${note.id}`, {
                                event: e,
                                state: { from: location, state: location.state },
                            })
                        }
                    >
                        <ScrollArea className='max-h-[36rem] w-full min-w-0'>
                            <Preview htmlContent={parsedContent} />
                        </ScrollArea>
                    </div>
                </div>

                {note.entries && parsedContent && <ReferenceTree note={note} />}
            </div>
        </div>
    );
});

export default Note;
