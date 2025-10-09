import {
    InfoCircleSolid,
    NavArrowDown,
    NavArrowUp,
    WarningCircleSolid,
    WarningTriangleSolid,
    DesignNib,
} from 'iconoir-react';
import React, { forwardRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { parseMarkdownInline } from '../../utils/customParser/customParser';
import { capitalizeString } from '../../utils/dashboardUtils/dashboardUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import Preview from '../Preview/Preview';
import ReferenceTree from '../ReferenceTree/ReferenceTree';

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
const Note = forwardRef(function (
    { id, note, setAlert, actions = [], ghost = false, ...props },
    ref,
) {
    const { navigate, navigateLink } = useCradleNavigate();
    const [hidden, setHidden] = useState(false);
    const location = useLocation();
    const [parsedContent, setParsedContent] = useState('');
    const [metadataExpanded, setMetadataExpanded] = useState(true);

    const getStatusIcon = () => {
        if (!note.status) return null;

        switch (note.status) {
            case 'healthy':
                return null;
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
        parseContent(note.content, note.files)
            .then((result) => setParsedContent(result.html))
            .catch(displayError(setAlert, navigate));
    }, [note.content, note.files, setAlert, navigate]);

    const style = {
        opacity: ghost ? 0.5 : 1,
    };

    if (hidden) return null;

    return (
        <div ref={ref} {...props}>
            <div
                style={style}
                className='mb-4'
            >
                {/* Header row with timestamp and configurable controls */}
                <div className='flex items-center justify-between border-b border-cradle-border-primary pb-3 mb-4'>
                    <div className='flex items-center gap-3 cradle-mono text-xs'>
                        {note.fleeting && (
                            <span
                                className='inline-flex items-center align-middle tooltip-right tooltip tooltip-primary'
                                data-tooltip='Fleeting Note'
                            >
                                <DesignNib className='text-[#FF8C00]' width='18' height='18' />
                            </span>
                        )}
                        {note.status && (
                            <span
                                className='inline-flex items-center align-middle tooltip-right tooltip tooltip-primary'
                                data-tooltip={
                                    note.status_message ||
                                    capitalizeString(note.status) ||
                                    null
                                }
                            >
                                {getStatusIcon()}
                            </span>
                        )}
                        {!note.editor && (
                            <>
                                <span className='cradle-text-tertiary'>
                                    {formatDate(new Date(note.timestamp))}
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
                                    {formatDate(new Date(note.edit_timestamp))}
                                </span>
                                <span className='cradle-text-muted'>·</span>
                                <span className='cradle-text-secondary'>
                                    {note?.editor ? note.editor.username : 'Unknown'}
                                </span>
                            </>
                        )}
                    </div>
                    <div className='flex items-center gap-2'>
                        {actions.map(({ Component, props }, index) => (
                            <Component
                                key={index}
                                {...props}
                                note={note}
                                setHidden={setHidden}
                            />
                        ))}
                    </div>
                </div>

                {!parsedContent && (
                    <div className='flex items-center justify-center min-h-screen'>
                        <div className='spinner-dot-pulse'>
                            <div className='spinner-pulse-dot'></div>
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
                            <div className='cradle-separator my-4'></div>
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
                        <div className='max-h-[36rem] overflow-y-auto cradle-scrollbar'>
                            <Preview htmlContent={parsedContent} />
                        </div>
                    </div>
                </div>

                {note.entry_classes && parsedContent && (
                    <ReferenceTree note={note} setAlert={setAlert} />
                )}
            </div>
        </div>
    );
});

export default Note;
