import { Code, Download, EditPencil, RefreshCircle, User, Clock, Link, Page, HistoricShield, MoreVert, Check } from 'iconoir-react';
import { StatsReport, Trash } from 'iconoir-react/regular';
import { Graph } from '@phosphor-icons/react';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import { usePaneTabs } from '../../contexts/PaneTabsContext/PaneTabsContext';
import { useLayout } from '../../contexts/LayoutContext/LayoutContext';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import { authAxios } from '../../services/axiosInstance/axiosInstance';
import {
    deleteNote,
    getNote,
    setPublishable,
} from '../../services/notesService/notesService';
import { deleteFleetingNote } from '../../services/fleetingNotesService/fleetingNotesService';
import { truncateText } from '../../utils/dashboardUtils/dashboardUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { createDownloadPath, parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import ListView from '../ListView/ListView';
import Preview from '../Preview/Preview';
import ReferenceTree from '../ReferenceTree/ReferenceTree';

import Prism from 'prismjs';
import 'prismjs/plugins/autoloader/prism-autoloader.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import '../../utils/customParser/prism-config.js';
import { addCopyButtonsToCodeBlocks, removeCopyButtonsFromCodeBlocks } from '../../utils/prismCopyButton';

import {
    InfoCircleSolid,
    WarningCircleSolid,
    WarningTriangleSolid,
} from 'iconoir-react';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import useApi from '../../hooks/useApi/useApi.js';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { parseMarkdownInline } from '../../utils/customParser/customParser';
import { capitalizeString } from '../../utils/dashboardUtils/dashboardUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import ActivityList from '../ActivityList/ActivityList';
import FileItem from '../FileItem/FileItem';
import GraphExplorer from '../GraphExplorer/GraphExplorer.jsx';
import NoteGraphSearch from '../GraphQuery/NoteGraphSearch.jsx';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal';

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
    const [isPublishable, setIsPublishable] = useState(false);
    const [isRaw, setIsRaw] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [parsedContent, setParsedContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState(0); // 0: Content, 1: Graph, 2: History
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const rawContentRef = useRef(null);
    const { setModal } = useModal();
    const { managementApi } = useApi();
    const { updateCurrentTabTitle } = usePaneTabs();
    const { activePaneId } = useLayout();

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
        setIsLoading(true);
        getNote(id, false)
            .then((response) => {
                const responseNote = response.data;
                setNote(responseNote);
                setIsPublishable(responseNote.publishable);
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
    }, [id, navigate, setAlert, updateCurrentTabTitle, activePaneId]);

    const toggleView = useCallback(() => {
        setIsRaw((prevIsRaw) => !prevIsRaw);
    }, []);

    useEffect(() => {
        const newNote = { ...note, publishable: isPublishable };
        setNote(newNote);
    }, [isPublishable]);

    const togglePublishable = useCallback(() => {
        setPublishable(id, !isPublishable)
            .then(() => {
                setIsPublishable((prev) => !prev);
            })
            .catch(displayError(setAlert, navigate));
    }, [id, isPublishable]);

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

    // Clear navbar contents - buttons will be in tabs area
    useNavbarContents([], []);

    useEffect(() => {
        Prism.highlightAll();
        if (isRaw && rawContentRef.current) {
            // Add copy buttons to raw markdown view
            addCopyButtonsToCodeBlocks(rawContentRef.current, null);
        }
        
        // Cleanup function to remove copy buttons when component unmounts or view changes
        return () => {
            if (rawContentRef.current) {
                removeCopyButtonsFromCodeBlocks(rawContentRef.current);
            }
        };
    }, [isRaw, note.content]);

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
                        {note.status && (
                            <span
                                className='inline-flex items-center tooltip tooltip-bottom tooltip-primary'
                                data-tooltip={
                                    note.status_message ||
                                    capitalizeString(note.status) ||
                                    null
                                }
                            >
                                {getStatusIcon()}
                            </span>
                        )}
                        <span
                            className='inline-flex items-center gap-1.5 tooltip tooltip-bottom tooltip-primary'
                            data-tooltip='Created'
                        >
                            <Clock width='16' height='16' />
                            <span className='cradle-text-tertiary'>
                                {formatDate(new Date(note.timestamp))}
                            </span>
                        </span>
                        <span
                            className='inline-flex items-center gap-1.5 tooltip tooltip-bottom tooltip-primary'
                            data-tooltip='Creator'
                        >
                            <User width='16' height='16' />
                            <span className='cradle-text-secondary'>
                                {note?.author ? note.author.username : 'Unknown'}
                            </span>
                        </span>
                        {note.editor && (
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
                                {isPublishable && (
                                    <button
                                        onClick={navigateLink(`/publish?notes=${id}`)}
                                        className='p-2 w-8 h-8 flex items-center justify-center cradle-text-tertiary hover:cradle-text-primary cradle-border hover:border-[#FF8C00] tooltip tooltip-bottom tooltip-primary'
                                        data-tooltip='Publish Report'
                                        data-testid='publish-btn'
                                    >
                                        <StatsReport width='20' height='20' />
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
                                                <div className='py-1' role='menu'>
                                                    {/* View Options */}
                                                    <button
                                                        onClick={() => {
                                                            setShowActionsMenu(false);
                                                            setActiveView(0);
                                                        }}
                                                        className='w-full text-left px-4 py-2 text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2'
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
                                                        className='w-full text-left px-4 py-2 text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2'
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
                                                            className='w-full text-left px-4 py-2 text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2'
                                                            data-testid='history-tab-menu-item'
                                                        >
                                                            <HistoricShield width='16' height='16' />
                                                            <span className='flex-1'>History</span>
                                                            {activeView === 2 && <Check width='16' height='16' />}
                                                        </button>
                                                    )}
                                                    
                                                    {/* Divider */}
                                                    <div className='my-1 h-px bg-cradle-border-primary'></div>
                                                    
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
                                                            className='w-full text-left px-4 py-2 text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2 '
                                                            data-testid='relink-menu-item'
                                                        >
                                                            <RefreshCircle width='16' height='16' />
                                                            Relink Note
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setShowActionsMenu(false);
                                                            toggleView();
                                                        }}
                                                        className='w-full text-left px-4 py-2 text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2 '
                                                        data-testid='toggle-view-menu-item'
                                                    >
                                                        <Code width='16' height='16' />
                                                        <span className='flex-1'>Source mode</span>
                                                        {isRaw && <Check width='16' height='16' />}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            setShowActionsMenu(false);
                                                            navigateLink(`/notes/${id}/edit`, { state: { from } })(e);
                                                        }}
                                                        className='w-full text-left px-4 py-2 text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2 '
                                                        data-testid='edit-menu-item'
                                                    >
                                                        <EditPencil width='16' height='16' />
                                                        Edit Note
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowActionsMenu(false);
                                                            setModal(ConfirmDeletionModal, {
                                                                onConfirm: handleDelete,
                                                                text: 'Are you sure you want to delete this note? This action is irreversible.',
                                                            });
                                                        }}
                                                        className='w-full text-left px-4 py-2 text-sm text-red-500 hover:cradle-bg-secondary flex items-center gap-2'
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

                {/* View content */}
                <div className='flex-1 overflow-hidden'>
                    {/* Content View */}
                    {activeView === 0 && (
                        <div className='w-full h-full overflow-hidden flex flex-col px-4 pb-4'>
                            <div className='h-full w-full px-4 pb-4 pt-4 overflow-y-auto'>
                                {isRaw ? (
                                    <pre
                                        ref={rawContentRef}
                                        className='line-numbers h-full w-full p-4 bg-transparent prose-md max-w-none dark:prose-invert break-words overflow-y-auto rounded-lg flex-1 overflow-x-hidden whitespace-pre-wrap'
                                        data-start='1'
                                    >
                                        <code className='language-markdown'>
                                            {note.content}
                                        </code>
                                    </pre>
                                ) : (
                                    <div className='mt-2'>
                                        <Preview htmlContent={parsedContent} />

                                        <ReferenceTree
                                            note={note}
                                            setAlert={setAlert}
                                        />
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
                                            { key: 'md5', label: 'MD5' },
                                            { key: 'sha1', label: 'SHA1' },
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
                                                    {file.md5_hash ? (
                                                        <span
                                                            className='cursor-pointer hover:bg-zinc-400 hover:dark:bg-zinc-800 px-1 rounded'
                                                            onClick={() => copyToClipboard(file.md5_hash)}
                                                            title='Click to copy'
                                                        >
                                                            {file.md5_hash.substring(0, 16)}...
                                                        </span>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td className=''>
                                                    {file.sha1_hash ? (
                                                        <span
                                                            className='cursor-pointer hover:bg-zinc-400 hover:dark:bg-zinc-800 px-1 rounded'
                                                            onClick={() => copyToClipboard(file.sha1_hash)}
                                                            title='Click to copy'
                                                        >
                                                            {file.sha1_hash.substring(0, 32)}...
                                                        </span>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td className=''>
                                                    {file.sha256_hash ? (
                                                        <span
                                                            className='cursor-pointer hover:bg-zinc-400 hover:dark:bg-zinc-800 px-1 rounded'
                                                            onClick={() => copyToClipboard(file.sha256_hash)}
                                                            title='Click to copy'
                                                        >
                                                            {file.sha256_hash.substring(0, 32)}...
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
        </>
    );
}
