import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import React from 'react';
import {
    deleteNote,
    getNote,
    setPublishable,
} from '../../services/notesService/notesService';
import Preview from '../Preview/Preview';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import { ClockRotateRight, Code, EditPencil } from 'iconoir-react';
import NavbarButton from '../NavbarButton/NavbarButton';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { Trash, StatsReport } from 'iconoir-react/regular';
import NavbarSwitch from '../NavbarSwitch/NavbarSwitch';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import ReferenceTree from '../ReferenceTree/ReferenceTree';
import Prism from 'prismjs';
import 'prismjs/components/prism-markdown';
import {
    CheckCircleSolid,
    InfoCircleSolid,
    WarningTriangleSolid,
    WarningCircleSolid,
    NavArrowDown,
    NavArrowUp,
} from 'iconoir-react';
import { capitalizeString } from '../../utils/dashboardUtils/dashboardUtils';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal';
import { Tab, Tabs } from '../Tabs/Tabs';
import ActivityList from '../ActivityList/ActivityList';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import FileItem from '../FileItem/FileItem';

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
    const navigate = useNavigate();
    const location = useLocation();
    const { isAdmin } = useProfile();
    const { from, state } = location.state || { from: { pathname: '/' } };
    const [note, setNote] = useState({});
    const [isPublishable, setIsPublishable] = useState(false);
    const [isRaw, setIsRaw] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [parsedContent, setParsedContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [metadataExpanded, setMetadataExpanded] = useState(true);
    const { setModal } = useModal();

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
        setIsLoading(true);
        getNote(id, false)
            .then((response) => {
                const responseNote = response.data;
                setNote(responseNote);
                setIsPublishable(responseNote.publishable);
                return responseNote;
            })
            .then((note) => {
                return parseContent(note.content, note.files).then((result) =>
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
                      onClick={() => navigate(`/publish?notes=${id}`)}
                  />
              ),
              <NavbarSwitch
                  key='publishable-btn'
                  text='Publishable'
                  checked={isPublishable}
                  onChange={togglePublishable}
                  testid='publishable-btn'
              />,
              <NavbarButton
                  key='edit-btn'
                  text='Edit Note'
                  icon={<EditPencil />}
                  onClick={() => navigate(`/notes/${id}/edit`)}
                  tesid='delete-btn'
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
        if (isRaw) {
            Prism.highlightAll();
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
            <div className='w-[100%] h-full flex flex-col p-2 space-y-3'>
                <Tabs
                    defaultTab={0}
                    queryParam={'tab'}
                    tabClasses='tabs-underline w-full'
                    perTabClass={`justify-center ${note.files && note.files.length > 0 ? (isAdmin() ? 'w-[33%]' : 'w-[50%]') : isAdmin() ? 'w-[50%]' : 'w-full'}`}
                >
                    <Tab title='Content' classes='pt-2'>
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
                                        className='h-full w-full p-4 bg-transparent prose-md max-w-none dark:prose-invert break-all
              overflow-y-auto rounded-lg flex-1 overflow-x-hidden whitespace-pre-wrap'
                                    >
                                        <code className='language-js'>
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
                                                                                        : String(
                                                                                              value,
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
                    {note.files && note.files.length > 0 && (
                        <Tab title='Files' classes='pt-2'>
                            <div className='w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-scroll'>
                                <div className='w-[95%] h-full flex flex-col p-6 space-y-3'>
                                    {note.files.map((file) => (
                                        <FileItem
                                            key={file.id}
                                            file={file}
                                            setAlert={setAlert}
                                        />
                                    ))}
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
