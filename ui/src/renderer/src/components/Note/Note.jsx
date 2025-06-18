import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import { Link, useNavigate } from 'react-router-dom';
import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import Preview from '../Preview/Preview';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useLocation } from 'react-router-dom';
import ReferenceTree from '../ReferenceTree/ReferenceTree';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import {
    InfoCircle,
    WarningTriangle,
    CheckCircle,
    WarningCircle,
    CheckCircleSolid,
    InfoCircleSolid,
    WarningTriangleSolid,
    WarningCircleSolid,
    NavArrowDown,
    NavArrowUp,
} from 'iconoir-react';
import { capitalizeString } from '../../utils/dashboardUtils/dashboardUtils';

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
    const navigate = useNavigate();
    const [hidden, setHidden] = useState(false);
    const location = useLocation();
    const [parsedContent, setParsedContent] = useState('');
    const [metadataExpanded, setMetadataExpanded] = useState(true);

    const getStatusIcon = () => {
        if (!note.status) return null;

        switch (note.status) {
            case 'healthy':
                return (
                    <CheckCircleSolid
                        className='text-green-500'
                        width='18'
                        height='18'
                    />
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
                className='bg-cradle3 bg-opacity-10 z-10 p-4 backdrop-blur-lg rounded-xl m-3 shadow-md'
            >
                {/* Header row with timestamp and configurable controls */}
                <div className='flex flex-row justify-between'>
                    <div className='text-xs text-zinc-500 border-b-1 dark:border-b-zinc-800'>
                        {!note.editor && (
                            <span className='flex items-center'>
                                {note.status && (
                                    <span
                                        className={
                                            'inline-flex items-center align-middle tooltip-right tooltip tooltip-primary'
                                        }
                                        data-tooltip={
                                            note.status_message ||
                                            capitalizeString(note.status) ||
                                            null
                                        }
                                    >
                                        {getStatusIcon()}
                                    </span>
                                )}
                                <span className='text-xs text-zinc-500 px-2'>
                                    <strong>Created on:</strong>{' '}
                                    {formatDate(new Date(note.timestamp))}
                                </span>
                                <span className='text-xs text-zinc-700'>|</span>
                                <span className='text-xs text-zinc-500 pl-2'>
                                    <strong>Created by:</strong>{' '}
                                    {note?.author ? note.author.username : 'Unknown'}
                                </span>
                            </span>
                        )}
                        {note.editor && (
                            <span className='flex items-center'>
                                {note.status && (
                                    <span
                                        className={
                                            'inline-flex items-center align-middle tooltip-right tooltip tooltip-primary'
                                        }
                                        data-tooltip={
                                            note.status_message ||
                                            capitalizeString(note.status) ||
                                            null
                                        }
                                    >
                                        {getStatusIcon()}
                                    </span>
                                )}
                                <span className='text-xs text-zinc-500 px-2'>
                                    <strong>Edited on:</strong>{' '}
                                    {formatDate(new Date(note.edit_timestamp))}
                                </span>
                                <span className='text-xs text-zinc-700'>|</span>
                                <span className='text-xs text-zinc-500 pl-2'>
                                    <strong>Edited by:</strong>{' '}
                                    {note?.editor ? note.editor.username : 'Unknown'}
                                </span>
                            </span>
                        )}
                    </div>
                    <div className='flex items-center'>
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

                {note.metadata && Object.keys(note.metadata).length > 0 && (
                    <div className=''>
                        <div
                            className='flex items-center cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
                            onClick={(e) => {
                                e.stopPropagation();
                                setMetadataExpanded(!metadataExpanded);
                            }}
                        >
                            <span className='text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center'>
                                {metadataExpanded ? (
                                    <NavArrowUp
                                        className='inline mr-1'
                                        width='16'
                                        height='16'
                                    />
                                ) : (
                                    <NavArrowDown
                                        className='inline mr-1'
                                        width='16'
                                        height='16'
                                    />
                                )}
                                Metadata
                            </span>
                        </div>

                        {metadataExpanded && (
                            <div className='bg-gray-50 dark:bg-gray-800 rounded-md p-2 mt-1'>
                                <div className='grid grid-cols-[auto_1fr] gap-x-1 gap-y-2'>
                                    {Object.entries(note.metadata).map(
                                        ([key, value]) => (
                                            <React.Fragment key={key}>
                                                <div className='text-sm font-bold text-gray-700 dark:text-gray-300 pr-2'>
                                                    {capitalizeString(key)}:
                                                </div>
                                                <div className='text-sm text-gray-600 dark:text-gray-400'>
                                                    {typeof value === 'object'
                                                        ? JSON.stringify(value)
                                                        : String(value)}
                                                </div>
                                            </React.Fragment>
                                        ),
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div
                    className='bg-transparent h-fit p-2 backdrop-filter overflow-hidden flex-grow flex flex-col cursor-pointer'
                    onClick={() =>
                        navigate(`/notes/${note.id}`, {
                            state: { from: location, state: location.state },
                        })
                    }
                >
                    <div className='max-h-[36rem] overflow-y-auto opacity-100'>
                        <Preview htmlContent={parsedContent} />
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
