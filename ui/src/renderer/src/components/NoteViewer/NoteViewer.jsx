import { Code, Download, EditPencil, RefreshCircle } from 'iconoir-react';
import { StatsReport, Trash } from 'iconoir-react/regular';
import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import { authAxios } from '../../services/axiosInstance/axiosInstance';
import {
    deleteNote,
    getNote,
    setPublishable,
} from '../../services/notesService/notesService';
import { truncateText } from '../../utils/dashboardUtils/dashboardUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { createDownloadPath, parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import ListView from '../ListView/ListView';
import NavbarButton from '../NavbarButton/NavbarButton';
import NavbarSwitch from '../NavbarSwitch/NavbarSwitch';
import Preview from '../Preview/Preview';
import ReferenceTree from '../ReferenceTree/ReferenceTree';

import Prism from 'prismjs';
import 'prismjs/plugins/autoloader/prism-autoloader.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import '../../utils/customParser/prism-config.js';
import { addCopyButtonsToCodeBlocks } from '../../utils/prismCopyButton';

import {
    InfoCircleSolid,
    NavArrowDown,
    NavArrowUp,
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
import { Tab, Tabs } from '../Tabs/Tabs';

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
    const [metadataExpanded, setMetadataExpanded] = useState(true);
    const { setModal } = useModal();
    const { managementApi } = useApi();

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
    }, [id, navigate, setAlert]);

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
        deleteNote(id)
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
    }, [id, navigate]);

    const navbarContents = id?.startsWith('guide_')
        ? []
        : [
            isPublishable && (
                <NavbarButton
                    icon={<StatsReport />}
                    text='Publish Report'
                    data-testid='publish-btn'
                    key='publish-btn'
                    onClick={navigateLink(`/publish?notes=${id}`)}
                />
            ),
            <NavbarSwitch
                key='publishable-btn'
                text='Publishable'
                checked={isPublishable}
                onChange={togglePublishable}
                testid='publishable-btn'
            />,
            isAdmin() && (
                <NavbarButton
                    key='relink-btn'
                    text='Relink Note'
                    icon={<RefreshCircle />}
                    onClick={() =>
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
                        })
                    }
                    tesid='relink-btn'
                />
            ),
            <NavbarButton
                key='edit-btn'
                text='Edit Note'
                icon={<EditPencil />}
                onClick={navigateLink(`/notes/${id}/edit`, { state: { from } })}
                tesid='edit-btn'
            />,
            <NavbarButton
                key='delete-btn'
                text='Delete Note'
                icon={<Trash />}
                onClick={() =>
                    setModal(ConfirmDeletionModal, {
                        onConfirm: handleDelete,
                        text: 'Are you sure you want to delete this note? This action is irreversible.',
                    })
                }
                tesid='delete-btn'
            />,
        ];

    navbarContents.push(
        <NavbarButton
            key='toggle-view-btn'
            text='Toggle View'
            icon={<Code />}
            onClick={toggleView}
            tesid='toggle-view-btn'
        />,
    );

    useNavbarContents(navbarContents, [
        toggleView,
        id,
        isPublishable,
        togglePublishable,
        handleDelete,
        alert,
        setAlert,
    ]);

    useEffect(() => {
        Prism.highlightAll();
        if (isRaw) {
            // Add copy buttons to raw markdown view
            const container = document.querySelector('.language-markdown');
            if (container && container.parentElement) {
                addCopyButtonsToCodeBlocks(container.parentElement.parentElement, null);
            }
        }
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
            <div className='w-[100%] h-full flex flex-col space-y-3'>
                <Tabs
                    defaultTab={0}
                    queryParam={'tab'}
                    tabClasses='tabs-underline w-full'
                    perTabClass={`justify-center ${note.files && note.files.length > 0 ? (isAdmin() ? 'w-[25%]' : 'w-[33%]') : isAdmin() ? 'w-[33%]' : 'w-[50%]'}`}
                >
                    <Tab title='Content'>
                        <div className='w-full h-full overflow-hidden flex flex-col items-center px-4 pb-4 pt-1'>
                            <div className='h-full w-full rounded-md bg-cradle3 bg-opacity-20 backdrop-blur-lg backdrop-filter px-4 pb-4 pt-1 overflow-y-auto'>
                                <div className='text-sm text-zinc-500 p-2 border-b-2 dark:border-b-zinc-800'>
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
                                    <span className='text-sm text-zinc-500 p-2'>
                                        <strong>Created on:</strong>{' '}
                                        {formatDate(new Date(note.timestamp))}
                                    </span>
                                    <span className='text-sm text-zinc-700'>|</span>
                                    <span className='text-sm text-zinc-500 p-2'>
                                        <strong>Created by:</strong>{' '}
                                        {note?.author
                                            ? note.author.username
                                            : 'Unknown'}
                                    </span>
                                    {note.editor && (
                                        <span>
                                            <span className='text-sm text-zinc-700'>
                                                |
                                            </span>
                                            <span className='text-sm text-zinc-500 p-2'>
                                                <strong>Edited on:</strong>{' '}
                                                {formatDate(
                                                    new Date(note.edit_timestamp),
                                                )}
                                            </span>
                                            <span className='text-sm text-zinc-700'>
                                                |
                                            </span>
                                            <span className='text-sm text-zinc-500 p-2'>
                                                <strong>Edited by:</strong>{' '}
                                                {note?.editor
                                                    ? note.editor.username
                                                    : 'Unknown'}
                                            </span>
                                        </span>
                                    )}
                                    {note.last_linked && (
                                        <span>
                                            <span className='text-sm text-zinc-700'>
                                                |
                                            </span>
                                            <span className='text-sm text-zinc-500 p-2'>
                                                <strong>Linked on:</strong>{' '}
                                                {formatDate(new Date(note.last_linked))}
                                            </span>
                                        </span>
                                    )}
                                </div>

                                {isRaw ? (
                                    <pre
                                        className='line-numbers h-full w-full p-4 bg-transparent prose-md max-w-none dark:prose-invert break-all overflow-y-auto rounded-lg flex-1 overflow-x-hidden whitespace-pre-wrap'
                                        data-start='1'
                                    >
                                        <code className='language-markdown'>
                                            {note.content}
                                        </code>
                                    </pre>
                                ) : (
                                    <div className='mt-2'>
                                        <div className='flex-grow'>
                                            {note.metadata &&
                                                Object.keys(note.metadata).length >
                                                0 && (
                                                    <div className='mt-2'>
                                                        <div
                                                            className='flex items-center cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMetadataExpanded(
                                                                    !metadataExpanded,
                                                                );
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
                                                                    {Object.entries(
                                                                        note.metadata,
                                                                    ).map(
                                                                        ([
                                                                            key,
                                                                            value,
                                                                        ]) => (
                                                                            <React.Fragment
                                                                                key={
                                                                                    key
                                                                                }
                                                                            >
                                                                                <div className='text-sm font-bold text-gray-700 dark:text-gray-300 pr-2'>
                                                                                    {capitalizeString(
                                                                                        key,
                                                                                    )}
                                                                                    :
                                                                                </div>
                                                                                <div className='text-sm text-gray-600 dark:text-gray-400'>
                                                                                    {typeof value ===
                                                                                        'object'
                                                                                        ? JSON.stringify(
                                                                                            value,
                                                                                        )
                                                                                        : parseMarkdownInline(
                                                                                            String(
                                                                                                value,
                                                                                            ),
                                                                                        )}
                                                                                </div>
                                                                            </React.Fragment>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                        </div>
                                        <Preview htmlContent={parsedContent} />

                                        <ReferenceTree
                                            note={note}
                                            setAlert={setAlert}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </Tab>
                    <Tab title='Graph'>
                        <GraphExplorer GraphSearchComponent={NoteGraphSearch(note.id)} />
                    </Tab>
                    {note.files && note.files.length > 0 && (
                        <Tab title='Files'>
                            <div className='w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-scroll'>
                                <div className='w-[95%] h-full flex flex-col p-6'>
                                    <ListView
                                        data={note.files}
                                        columns={[
                                            { key: 'name', label: 'Name', className: 'w-64' },
                                            { key: 'uploadedAt', label: 'Uploaded At', className: 'w-32' },
                                            { key: 'entities', label: 'Entities', className: 'w-32' },
                                            { key: 'mimetype', label: 'MimeType', className: 'w-32' },
                                            { key: 'md5', label: 'MD5' },
                                            { key: 'sha1', label: 'SHA1' },
                                            { key: 'sha256', label: 'SHA256' },
                                            { key: 'actions', label: 'Actions', className: 'w-32' },
                                        ]}
                                        renderRow={(file, index) => (
                                            <tr key={file.id || index}>
                                                <td className='truncate w-32'>
                                                    {truncateText(file.file_name, 32)}
                                                </td>
                                                <td className=''>
                                                    {formatDate(new Date(file.timestamp))}
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
                                        forceCardView={!profile?.compact_mode}
                                        emptyMessage="No files found!"
                                        tableClassName="table"
                                    />
                                </div>
                            </div>
                        </Tab>
                    )}
                    {isAdmin() && (
                        <Tab title='History' classes='pt-2'>
                            <ActivityList content_type='note' objectId={id} />
                        </Tab>
                    )}
                </Tabs>
            </div>
        </>
    );
}
