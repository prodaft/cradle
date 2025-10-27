import { Graph, TreeView } from '@phosphor-icons/react';
import { Check, Clock, CloudUpload, Code, Download, HistoricShield, Link, MoreVert, Page, RefreshCircle, User } from 'iconoir-react';
import { FloppyDisk, LightBulb, Trash } from 'iconoir-react/regular';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext/LayoutContext';
import { usePaneTabs } from '../../contexts/PaneTabsContext/PaneTabsContext';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import { authAxios } from '../../services/axiosInstance/axiosInstance';
import {
    deleteFleetingNote,
    getFleetingNoteById,
    saveFleetingNoteAsFinal,
    updateFleetingNote
} from '../../services/fleetingNotesService/fleetingNotesService';
import {
    deleteNote,
    getNote,
    updateNote,
} from '../../services/notesService/notesService';
import { truncateText } from '../../utils/dashboardUtils/dashboardUtils';
import { CradleEditor } from '../../utils/editorUtils/editorUtils';
import extractHeaderHierarchy from '../../utils/editorUtils/markdownOutliner';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { createDownloadPath, parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import ListView from '../ListView/ListView';
import NoteOutline from '../NoteOutline/NoteOutline';
import ReferenceTree from '../ReferenceTree/ReferenceTree';
import RichEditor from '../RichEditor/RichEditor';

import 'prismjs/plugins/autoloader/prism-autoloader.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import '../../utils/customParser/prism-config.js';

import {
    InfoCircleSolid,
    WarningCircleSolid,
    WarningTriangleSolid,
} from 'iconoir-react';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import useApi from '../../hooks/useApi/useApi.js';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { capitalizeString } from '../../utils/dashboardUtils/dashboardUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import ActivityList from '../ActivityList/ActivityList';
import Editor from '../Editor/Editor.jsx';
import FileInput from '../FileInput/FileInput';
import FileItem from '../FileItem/FileItem';
import GraphExplorer from '../GraphExplorer/GraphExplorer.jsx';
import NoteGraphSearch from '../GraphQuery/NoteGraphSearch.jsx';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal';
import ReportGenerationModal from '../Modals/ReportGenerationModal';

/**
 * NoteViewer component
 * Fetches and displays the content of a note
 * Adds a button to Navbar to toggle between raw and parsed content
 *
 * @function NoteViewer
 * @returns {NoteViewer}
 * @constructor
 */
export default function NoteViewer() {
    const { id } = useParams();
    const { navigate, navigateLink } = useCradleNavigate();
    const location = useLocation();
    const { isAdmin, profile } = useProfile();
    const { from, state } = location.state || { from: { pathname: '/' } };
    const [note, setNote] = useState({});
    const [richEditor, setRichEditor] = useState(
        localStorage.getItem('richEditor') ? localStorage.getItem('richEditor') === 'true' : true
    );
    const [markdownContent, setMarkdownContent] = useState('');
    const [fileData, setFileData] = useState([]);
    const [currentLine, setCurrentLine] = useState(1);
    const [initialMarkdown, setInitialMarkdown] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [parsedContent, setParsedContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState(0); // 0: Content, 1: Graph, 2: History
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [isFleeting, setIsFleeting] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [showFileUpload, setShowFileUpload] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showOutline, setShowOutline] = useState(() => {
        const saved = localStorage.getItem('showOutline');
        return saved === 'true' ? true : false;
    });
    const [noteOutline, setNoteOutline] = useState([]);
    const [lspLoaded, setLspLoaded] = useState(false);
    const rawContentRef = useRef(null);
    const editorRef = useRef(null);
    const { setModal } = useModal();
    const { managementApi } = useApi();
    const { updateCurrentTabTitle } = usePaneTabs();
    const { activePaneId } = useLayout();

    // Initialize editor utils for autolink functionality
    const editorUtils = React.useMemo(() => {
        CradleEditor.clearCache();
        return new CradleEditor({}, setLspLoaded, displayError(setAlert));
    }, [setAlert]);

    const copyToClipboard = (text) => {
        navigator.clipboard
            .writeText(text)
            .catch((error) => {
                console.error('Failed to copy text: ', error);
            })
            .then(() => {
                setAlert({
                    show: true,
                    message: 'Copied to clipboard',
                    color: 'green',
                });
            });
    };

    const toggleOutline = useCallback(() => {
        const newValue = !showOutline;
        setShowOutline(newValue);
        localStorage.setItem('showOutline', newValue);
    }, [showOutline]);

    const smartLink = useCallback(
        (onlyTimestamps) => {
            if (!editorRef.current) {
                return;
            }

            // Get the editor view - handle both Editor (editorRef.current.view) and RichEditor (editorRef.current.view)
            const view = editorRef.current.view || editorRef.current;
            if (!view || !view.state) {
                return;
            }

            const doc = view.state;
            let to = doc.selection.main.to;
            let from = doc.selection.main.from;
            let content = doc.doc.toString();

            if (to === from) {
                from = 0;
                to = content.length;
            }

            // Call autoFormatLinks
            const [changes, linked] = editorUtils.autoFormatLinks(
                view,
                from,
                to,
                onlyTimestamps,
            );
            // Update the editor content first
            view.dispatch({
                from: 0,
                to: content.length,
                changes: { from: 0, to: content.length, insert: linked },
            });

            // Then update the state
            setMarkdownContent(linked);
            setAlert({
                show: true,
                message: `${changes > 0 ? changes : 'No'} link${changes == 1 ? '' : 's'} ${onlyTimestamps ? 'timestamped.' : 'found in text.'}`,
                color: changes > 0 ? 'green' : 'gray',
            });
        },
        [editorUtils, setMarkdownContent, setAlert],
    );

    const getSaveStatus = () => {
        if (!markdownContent || markdownContent.trim().length === 0) {
            return 'empty'; // Cannot save empty note
        }
        if (saving) {
            return 'saving'; // Currently saving
        }
        if (hasUnsavedChanges) {
            return 'unsaved'; // Has unsaved changes
        }
        return 'saved'; // All changes saved
    };

    const getStatusIcon = () => {
        if (!note.status) return null;

        switch (note.status) {
            case 'healthy':
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500">
                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
        setIsLoading(true);

        // Try to load as regular note first, then fallback to fleeting note if it fails
        const loadNote = async () => {
            try {
                // First try to load as a regular note
                const response = await getNote(id, false);
                const responseNote = response.data;

                // Check if this is a fleeting note using the fleeting field
                const isFleetingNote = responseNote.fleeting === true;
                setIsFleeting(isFleetingNote);

                // Debug logging
                console.log('NoteViewer - Note type detection:', {
                    id: id,
                    isFleetingNote: isFleetingNote,
                    fleeting: responseNote.fleeting,
                    hasAuthor: !!responseNote.author,
                    hasEditor: !!responseNote.editor,
                    hasEntries: !!responseNote.entries
                });

                return response;
            } catch (error) {
                // If regular note fails, try as fleeting note
                console.log('NoteViewer - Regular note failed, trying fleeting note:', error);
                const response = await getFleetingNoteById(id);
                setIsFleeting(true);
                return response;
            }
        };

        loadNote()
            .then((response) => {
                const responseNote = response.data;
                setNote(responseNote);
                setMarkdownContent(responseNote.content);
                setInitialMarkdown(responseNote.content);
                setFileData(responseNote.files || []);
                setHasUnsavedChanges(false);
                // Update tab title with note title
                if (responseNote.title && activePaneId) {
                    updateCurrentTabTitle(activePaneId, responseNote.title);
                }
                return responseNote;
            })
            .then((note) => {
                return parseContent(note.content, note.files, true).then((result) =>
                    setParsedContent(result.html),
                );
            })
            .catch(displayError(setAlert, navigate))
            .finally(() => {
                // Turn off loading spinner regardless of success or failure
                setIsLoading(false);
            });
    }, [id, navigate, setAlert, updateCurrentTabTitle, activePaneId, profile]);

    const toggleView = useCallback(() => {
        setRichEditor((prevRichEditor) => !prevRichEditor);
    }, []);

    const handleDelete = useCallback(() => {
        // Use the appropriate delete function based on whether the note is fleeting
        const deleteFunction = note.fleeting ? deleteFleetingNote : deleteNote;
        deleteFunction(id)
            .then(() => {
                if (!state) {
                    navigate(from, { replace: true });
                    return;
                }
                if (!state.notes) {
                    navigate(from, { replace: true, state: state });
                    return;
                }
                const stateNotes = state.notes.filter((note) => note.id !== id);
                const newState = { ...state, notes: stateNotes };
                navigate(from, { replace: true, state: newState });
            })
            .catch(displayError(setAlert, navigate));
    }, [id, navigate, note.fleeting]);

    const handleSaveNote = useCallback(async () => {
        if (!markdownContent || markdownContent.trim().length === 0) {
            setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
            return;
        }

        setSaving(true);
        try {
            let response;
            if (isFleeting) {
                // Update existing fleeting note
                response = await updateFleetingNote(id, markdownContent, fileData);
            } else {
                // Update regular note
                response = await updateNote(id, {
                    content: markdownContent,
                    files: fileData,
                });
            }

            if (response.status === 200) {
                setInitialMarkdown(markdownContent);
                setHasUnsavedChanges(false);
                setAlert({
                    show: true,
                    message: 'Changes saved successfully.',
                    color: 'green',
                });
                // Update the parsed content for preview
                parseContent(markdownContent, fileData, true).then((result) =>
                    setParsedContent(result.html),
                );
            }
        } catch (error) {
            displayError(setAlert, navigate)(error);
        } finally {
            setSaving(false);
        }
    }, [id, markdownContent, fileData, navigate, isFleeting]);

    const handleSaveAsFinal = useCallback(async () => {
        if (!markdownContent || markdownContent.trim().length === 0) {
            setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
            return;
        }

        setSaving(true);
        try {
            const response = await saveFleetingNoteAsFinal(id);

            if (response.status === 200) {
                setAlert({
                    show: true,
                    message: 'Note finalized successfully.',
                    color: 'green',
                });
                // Navigate to the regular note view
                navigate(`/notes/${response.data.id}`, { replace: true });
            }
        } catch (error) {
            displayError(setAlert, navigate)(error);
        } finally {
            setSaving(false);
        }
    }, [id, markdownContent, fileData, navigate]);


    // Track changes for both note types
    useEffect(() => {
        if (!markdownContent || markdownContent === initialMarkdown) {
            setHasUnsavedChanges(false);
            return;
        }

        setHasUnsavedChanges(true);
    }, [markdownContent, initialMarkdown]);

    // Auto-save for fleeting notes only
    useEffect(() => {
        if (!isFleeting || !markdownContent || markdownContent === initialMarkdown) {
            return;
        }

        const autosaveTimer = setTimeout(() => {
            handleSaveNote();
        }, 1000); // Auto-save after 1 second of inactivity

        return () => {
            clearTimeout(autosaveTimer);
        };
    }, [markdownContent, fileData, isFleeting, initialMarkdown, handleSaveNote]);

    useEffect(() => {
        localStorage.setItem('richEditor', richEditor);
    }, [richEditor]);

    // Compute note outline from markdown content
    useEffect(() => {
        const content = markdownContent || '';
        setNoteOutline(extractHeaderHierarchy(content, () => { }));
    }, [markdownContent]);

    // Conditionally render spinner or component
    if (isLoading) {
        return (
            <div className='flex items-center justify-center h-full w-full py-8'>
                <div className='animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900' />
            </div>
        );
    }

    return (
        <>
            <AlertDismissible
                alert={alert}
                setAlert={setAlert}
                onClose={() => setAlert('')}
            />
            <div className='w-[100%] h-full flex flex-col'>
                {/* Custom header with metadata and tab/action buttons */}
                <div className='w-full cradle-border-b px-4 py-3 flex items-center justify-between'>
                    {/* Left side - Metadata with icons */}
                    <div className='flex items-center gap-4 cradle-mono text-xs cradle-text-tertiary'>
                        <span
                            className='inline-flex items-center gap-1.5 tooltip tooltip-bottom tooltip-primary'
                            data-tooltip='Created'
                        >
                            <Clock width='16' height='16' />
                            <span className='cradle-text-tertiary'>
                                {formatDate(new Date(note.timestamp))}
                            </span>
                        </span>
                        {!isFleeting && (
                            <span
                                className='inline-flex items-center gap-1.5 tooltip tooltip-bottom tooltip-primary'
                                data-tooltip='Creator'
                            >
                                <User width='16' height='16' />
                                <span className='cradle-text-secondary'>
                                    {note?.author ? note.author.username : 'Unknown'}
                                </span>
                            </span>
                        )}
                        {!isFleeting && note.editor && (
                            <>
                                <span
                                    className='inline-flex items-center gap-1.5 tooltip tooltip-bottom tooltip-primary'
                                    data-tooltip='Edited'
                                >
                                    <Clock width='16' height='16' />
                                    <span className='cradle-text-tertiary'>
                                        {formatDate(new Date(note.edit_timestamp))}
                                    </span>
                                </span>
                                <span
                                    className='inline-flex items-center gap-1.5 tooltip tooltip-bottom tooltip-primary'
                                    data-tooltip='Editor'
                                >
                                    <User width='16' height='16' />
                                    <span className='cradle-text-secondary'>
                                        {note?.editor ? note.editor.username : 'Unknown'}
                                    </span>
                                </span>
                            </>
                        )}
                        {note.last_linked && (
                            <>
                                <span
                                    className='inline-flex items-center gap-1.5 tooltip tooltip-bottom tooltip-primary'
                                    data-tooltip='Last Linked'
                                >
                                    <Link width='16' height='16' />
                                    <span className='cradle-text-tertiary'>
                                        {formatDate(new Date(note.last_linked))}
                                    </span>
                                </span>
                            </>
                        )}
                    </div>

                    {/* Right side - Action buttons */}
                    <div className='flex items-center gap-2'>
                        {/* Action buttons */}
                        {!id?.startsWith('guide_') && (
                            <>
                                {/* Save status indicator button */}
                                <button
                                    className='p-2 w-8 h-8 flex items-center justify-center cradle-text-tertiary hover:cradle-text-primary cradle-border hover:border-[#FF8C00] tooltip tooltip-bottom tooltip-primary'
                                    data-tooltip={
                                        getSaveStatus() === 'saved' ? 'All changes saved' :
                                            getSaveStatus() === 'saving' ? 'Saving...' :
                                                getSaveStatus() === 'unsaved' ? 'Unsaved changes' :
                                                    'Cannot save empty note'
                                    }
                                    data-testid='save-status-dot'
                                >
                                    <div
                                        className={`w-2 h-2 rounded-full ${getSaveStatus() === 'saved' ? 'bg-green-500' :
                                            getSaveStatus() === 'saving' ? 'bg-yellow-500' :
                                                getSaveStatus() === 'unsaved' ? 'bg-red-500' :
                                                    'bg-gray-400'
                                            }`}
                                    />
                                </button>
                                {/* Status indicator button */}
                                {note.status && (
                                    <button
                                        className='p-2 w-8 h-8 flex items-center justify-center cradle-text-tertiary hover:cradle-text-primary cradle-border hover:border-[#FF8C00] tooltip tooltip-bottom tooltip-primary'
                                        data-tooltip={
                                            note.status_message ||
                                            capitalizeString(note.status) ||
                                            null
                                        }
                                    >
                                        {getStatusIcon()}
                                    </button>
                                )}
                                {/* Three-dots menu for note actions */}
                                <div className='relative'>
                                    <button
                                        onClick={() => setShowActionsMenu(!showActionsMenu)}
                                        className='p-2 w-8 h-8 flex items-center justify-center cradle-text-tertiary hover:cradle-text-primary cradle-border hover:border-[#FF8C00] tooltip tooltip-bottom tooltip-primary'
                                        data-tooltip='More Actions'
                                        data-testid='more-actions-btn'
                                    >
                                        <MoreVert width='20' height='20' />
                                    </button>
                                    {showActionsMenu && (
                                        <>
                                            <div
                                                className='fixed inset-0 z-10'
                                                onClick={() => setShowActionsMenu(false)}
                                            />
                                            <div className='absolute right-0 mt-2 w-48 cradle-bg-elevated cradle-border z-20'>
                                                <div role='menu'>
                                                    {/* View Options */}
                                                    <button
                                                        onClick={() => {
                                                            setShowActionsMenu(false);
                                                            setActiveView(0);
                                                        }}
                                                        className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                                        data-testid='content-tab-menu-item'
                                                    >
                                                        <Page width='16' height='16' />
                                                        <span className='flex-1'>Content</span>
                                                        {activeView === 0 && <Check width='16' height='16' />}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowActionsMenu(false);
                                                            setActiveView(1);
                                                        }}
                                                        className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                                        data-testid='graph-tab-menu-item'
                                                    >
                                                        <Graph width='16' height='16' />
                                                        <span className='flex-1'>Graph</span>
                                                        {activeView === 1 && <Check width='16' height='16' />}
                                                    </button>
                                                    {isAdmin() && (
                                                        <button
                                                            onClick={() => {
                                                                setShowActionsMenu(false);
                                                                setActiveView(2);
                                                            }}
                                                            className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                                            data-testid='history-tab-menu-item'
                                                        >
                                                            <HistoricShield width='16' height='16' />
                                                            <span className='flex-1'>History</span>
                                                            {activeView === 2 && <Check width='16' height='16' />}
                                                        </button>
                                                    )}

                                                    {/* Divider */}
                                                    <div className='my-1 h-px bg-cradle-border-primary'></div>

                                                    {/* Editor Actions - Available for both source and rich editor */}
                                                    {activeView === 0 && (
                                                        <>
                                                            {/* Outline toggle - only for source editor */}
                                                            {!richEditor && (
                                                                <button
                                                                    onClick={() => {
                                                                        setShowActionsMenu(false);
                                                                        toggleOutline();
                                                                    }}
                                                                    className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                                                    data-testid='toggle-outline-menu-item'
                                                                >
                                                                    <TreeView width='16' height='16' />
                                                                    <span className='flex-1'>Toggle Outline</span>
                                                                    {showOutline && <Check width='16' height='16' />}
                                                                </button>
                                                            )}
                                                            {/* Autolink - available for both editors */}
                                                            {lspLoaded && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setShowActionsMenu(false);
                                                                            smartLink(true);
                                                                        }}
                                                                        className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                                                        data-testid='timestamp-links-menu-item'
                                                                    >
                                                                        <LightBulb width='16' height='16' />
                                                                        <span className='flex-1'>Add Timestamps To Links</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setShowActionsMenu(false);
                                                                            smartLink(false);
                                                                        }}
                                                                        className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                                                        data-testid='find-links-menu-item'
                                                                    >
                                                                        <LightBulb width='16' height='16' />
                                                                        <span className='flex-1'>Find Links in Text</span>
                                                                    </button>
                                                                </>
                                                            )}
                                                            <div className='my-1 h-px bg-cradle-border-primary'></div>
                                                        </>
                                                    )}

                                                    {/* Actions */}
                                                    {isAdmin() && (
                                                        <button
                                                            onClick={() => {
                                                                setShowActionsMenu(false);
                                                                managementApi.managementActionsCreate({
                                                                    actionName: 'relinkNotes',
                                                                    requestBody: {
                                                                        note_id: id,
                                                                    },
                                                                }).then(() => {
                                                                    setAlert({
                                                                        show: true,
                                                                        message: 'Relinking note...',
                                                                        color: 'green',
                                                                    });
                                                                });
                                                            }}
                                                            className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2 '
                                                            data-testid='relink-menu-item'
                                                        >
                                                            <RefreshCircle width='16' height='16' />
                                                            Relink Note
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setShowActionsMenu(false);
                                                            setShowFileUpload(!showFileUpload);
                                                        }}
                                                        className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                                        data-testid='upload-files-menu-item'
                                                    >
                                                        <CloudUpload width='16' height='16' />
                                                        <span className='flex-1'>Upload Files</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowActionsMenu(false);
                                                            toggleView();
                                                        }}
                                                        className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2 '
                                                        data-testid='toggle-view-menu-item'
                                                    >
                                                        <Code width='16' height='16' />
                                                        <span className='flex-1'>Source mode</span>
                                                        {!richEditor && <Check width='16' height='16' />}
                                                    </button>
                                                    {isFleeting && (
                                                        <button
                                                            onClick={() => {
                                                                setShowActionsMenu(false);
                                                                handleSaveAsFinal();
                                                            }}
                                                            className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                                            data-testid='save-as-final-menu-item'
                                                        >
                                                            <FloppyDisk width='16' height='16' />
                                                            <span className='flex-1'>Save As Final</span>
                                                            {saving && <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900' />}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setShowActionsMenu(false);
                                                            setModal(ConfirmDeletionModal, {
                                                                onConfirm: handleDelete,
                                                                text: 'Are you sure you want to delete this note? This action is irreversible.',
                                                            });
                                                        }}
                                                        className='w-full text-left px-4 py-2 text-sm text-red-500 cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                                        data-testid='delete-menu-item'
                                                    >
                                                        <Trash width='16' height='16' />
                                                        Delete Note
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* File Upload Section */}
                {showFileUpload && (
                    <div className='w-full px-4 py-2 cradle-border-b bg-gray-50 dark:bg-gray-800'>
                        <FileInput
                            fileData={fileData}
                            setFileData={setFileData}
                            pendingFiles={pendingFiles}
                            setPendingFiles={setPendingFiles}
                        />
                    </div>
                )}

                {/* View content */}
                <div className='flex-1 overflow-hidden'>
                    {/* Content View */}
                    {activeView === 0 && (
                        <div className='w-full h-full overflow-hidden flex flex-col px-4 pb-4'>
                            <div className='h-full w-full px-4 pb-4 pt-4 overflow-y-auto'>
                                {!richEditor ? (
                                    <div className='mt-2 h-full flex flex-row'>
                                        {/* Outline sidebar */}
                                        {showOutline && (
                                            <div className='w-1/5 pr-2 overflow-y-auto'>
                                                <NoteOutline
                                                    data={noteOutline}
                                                    title='Note Outline'
                                                    showSeparators={true}
                                                />
                                            </div>
                                        )}
                                        {/* Source Editor */}
                                        <div className={showOutline ? 'w-4/5 flex-1 min-h-0' : 'flex-1 min-h-0'}>
                                            <Editor
                                                ref={editorRef}
                                                noteid={id}
                                                markdownContent={markdownContent}
                                                setMarkdownContent={setMarkdownContent}
                                                fileData={fileData}
                                                setFileData={setFileData}
                                                setAlert={setAlert}
                                                saveNote={handleSaveNote}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className='mt-2 h-full flex flex-col'>
                                        {/* Embedded Rich Editor */}
                                        <div className='flex-1 min-h-0'>
                                            <RichEditor
                                                ref={editorRef}
                                                noteid={id}
                                                markdownContent={markdownContent}
                                                setMarkdownContent={setMarkdownContent}
                                                fileData={fileData}
                                                setFileData={setFileData}
                                                currentLine={currentLine}
                                                setCurrentLine={setCurrentLine}
                                                setAlert={setAlert}
                                                saveNote={handleSaveNote}
                                            />
                                        </div>

                                        {/* Reference Tree below the editor */}
                                        <div className='mt-4'>
                                            <ReferenceTree
                                                note={note}
                                                setAlert={setAlert}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Graph View */}
                    {activeView === 1 && (
                        <GraphExplorer GraphSearchComponent={NoteGraphSearch(note.id)} />
                    )}

                    {/* Files View (removed as per new design) */}
                    {note.files && note.files.length > 0 && activeView === 999 && (
                        <div>
                            <div className='w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-scroll'>
                                <div className='w-[95%] h-full flex flex-col p-6'>
                                    <ListView
                                        data={note.files}
                                        columns={[
                                            { key: 'name', label: 'Name', className: 'w-64' },
                                            { key: 'entities', label: 'Entities', className: 'w-32' },
                                            { key: 'mimetype', label: 'MimeType', className: 'w-32' },
                                            { key: 'sha256', label: 'SHA256' },
                                            { key: 'uploadedAt', label: 'Uploaded At', className: 'w-32' },
                                            { key: 'actions', label: 'Actions', className: 'w-32' },
                                        ]}
                                        renderRow={(file, index) => (
                                            <tr key={file.id || index}>
                                                <td className='truncate w-32'>
                                                    {truncateText(file.file_name, 32)}
                                                </td>
                                                <td className=''>
                                                    <div className='flex flex-wrap gap-1'>
                                                        {file.entities?.slice(0, 3).map((entity) => (
                                                            <span
                                                                key={entity.name}
                                                                className='badge badge-xs px-1 text-white'
                                                                style={{
                                                                    backgroundColor: entity.color || '#ccc',
                                                                }}
                                                            >
                                                                {entity.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className='truncate w-32'>
                                                    {truncateText(file.mimetype, 32)}
                                                </td>
                                                <td className=''>
                                                    {file.sha256_hash ? (
                                                        <span
                                                            className='cursor-pointer hover:bg-zinc-400 hover:dark:bg-zinc-800 px-1 rounded'
                                                            onClick={() => copyToClipboard(file.sha256_hash)}
                                                            title='Click to copy'
                                                        >
                                                            {file.sha256_hash.substring(0, 21)}...
                                                        </span>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td className=''>
                                                    {formatDate(new Date(file.timestamp))}
                                                </td>
                                                <td className='w-32'>
                                                    <div className='flex space-x-1'>
                                                        {file.bucket_name && file.minio_file_name && (
                                                            <button
                                                                onClick={() => {
                                                                    const url = createDownloadPath({
                                                                        bucket_name: file.bucket_name,
                                                                        minio_file_name: file.minio_file_name,
                                                                    });

                                                                    authAxios
                                                                        .get(url)
                                                                        .then((response) => {
                                                                            const { presigned } = response.data;
                                                                            const link = document.createElement('a');
                                                                            link.href = presigned;
                                                                            const fileName =
                                                                                file.minio_file_name.split('/').pop() ||
                                                                                file.minio_file_name;
                                                                            link.download = fileName;
                                                                            document.body.appendChild(link);
                                                                            link.click();
                                                                            document.body.removeChild(link);
                                                                        })
                                                                        .catch((error) => {
                                                                            setAlert({
                                                                                show: true,
                                                                                message: 'Failed to download file. Please try again.',
                                                                                color: 'red',
                                                                            });
                                                                        });
                                                                }}
                                                                className='btn btn-ghost btn-xs text-green-600 hover:text-green-500'
                                                                title='Download'
                                                            >
                                                                <Download className='w-4 h-4' aria-hidden='true' />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        renderCard={(file) => (
                                            <FileItem
                                                key={file.id}
                                                file={file}
                                                setAlert={setAlert}
                                            />
                                        )}
                                        loading={false}
                                        forceCardView={false}
                                        emptyMessage="No files found!"
                                        tableClassName="table"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* History View */}
                    {isAdmin() && activeView === 2 && (
                        <div className='pt-2'>
                            <ActivityList content_type='note' objectId={id} />
                        </div>
                    )}
                </div>

            </div>

            {/* Report Generation Modal */}
            <ReportGenerationModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                noteId={id}
                noteTitle={note.title}
                setAlert={setAlert}
            />
        </>
    );
}
