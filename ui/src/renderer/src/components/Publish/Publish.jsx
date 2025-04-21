import React, { useState, useEffect, useRef } from 'react';
import { updateNote, getNote } from '../../services/notesService/notesService';
import {
    getPublishOptions,
    publishReport,
    editReport,
    getReport,
} from '../../services/publishService/publishService';
import 'tailwindcss/tailwind.css';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import FloatingTextInput from '../FloatingTextInput/FloatingTextInput';
import ResizableSplitPane from '../ResizableSplitPane/ResizableSplitPane';
import NoteSelector from '../NoteSelector/NoteSelector';
import PublishPreview from '../PublishPreview/PublishPreview';
import Note from '../Note/Note';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import { useModal } from '../../contexts/ModalContext/ModalContext';

import { DndContext, closestCenter, DragOverlay, useSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { NoButtonsSensor } from '../../utils/dndUtils/dndUtils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { Download, Eye, EyeClosed, FloppyDisk, Upload } from 'iconoir-react';
import FormModal from '../Modals/FormModal';

import NavbarDropdown from '../NavbarDropdown/NavbarDropdown';
import NavbarButton from '../NavbarButton/NavbarButton';

export default function Publish() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [availableNotes, setAvailableNotes] = useState([]);
    const [selectedNotes, setSelectedNotes] = useState([]);
    const selectedNotesRef = useRef([]);
    const [activeNote, setActiveNote] = useState(null);
    const [publishOptions, setPublishOptions] = useState({ upload: [], download: [] });
    const [anonymize, setAnonymize] = useState(false);
    const { setModal } = useModal();

    const [isEditing, setIsEditing] = useState(false);
    const [reportId, setReportId] = useState(null);
    const [title, setTitle] = useState('');

    const navigate = useNavigate();

    const sensors = [useSensor(NoButtonsSensor)];

    useEffect(() => {
        selectedNotesRef.current = selectedNotes;
    }, [selectedNotes]);

    useEffect(() => {
        const queryParams = new URLSearchParams(searchParams);
        const reportParam = queryParams.get('report');
        if (reportParam && reportId != reportParam) {
            setIsEditing(true);
            setReportId(reportParam);
            getReport(reportParam)
                .then((response) => {
                    if (response.status === 200) {
                        const reportData = response.data;
                        setTitle(reportData.title);

                        if (reportData.note_ids && reportData.note_ids.length > 0) {
                            Promise.all(reportData.note_ids.map((id) => getNote(id)))
                                .then((notes) => {
                                    const validNotes = notes
                                        .filter((note) => note.status === 200)
                                        .map((note) => note.data);
                                    setSelectedNotes(validNotes);
                                })
                                .catch(displayError(setAlert));
                        }
                    }
                })
                .catch(displayError(setAlert));
        }
    }, [searchParams]);

    useEffect(() => {
        const queryParams = new URLSearchParams(searchParams);
        if (queryParams.get('report')) {
            return;
        }
        const notesParam = queryParams.get('notes');
        if (notesParam) {
            const noteIds = notesParam.split(',');
            Promise.all(noteIds.map((id) => getNote(id)))
                .then((notes) => {
                    const validNotes = notes
                        .filter((note) => note.status === 200)
                        .map((note) => note.data);
                    if (notes.length !== validNotes.length) {
                        throw new Error('Some notes could not be loaded.');
                    }
                    setSelectedNotes(validNotes.filter((note) => note.publishable));
                })
                .catch(displayError(setAlert));
        }
    }, [searchParams]);

    useEffect(() => {
        getPublishOptions()
            .then((response) => {
                if (response.status === 200) {
                    setPublishOptions(response.data);
                }
            })
            .catch(displayError(setAlert));
    }, []);

    useEffect(() => {
        const noteIds = selectedNotes.map((note) => note.id).join(',');
        const queryParams = new URLSearchParams(searchParams);
        if (noteIds) {
            queryParams.set('notes', noteIds);
        } else {
            queryParams.delete('notes');
        }
        setSearchParams(queryParams, { replace: true });
    }, [selectedNotes, setSearchParams, searchParams]);

    const handleDragStart = (event) => {
        const { active } = event;
        const noteFromSelected = selectedNotes.find((note) => note.id === active.id);
        if (noteFromSelected) {
            setActiveNote(noteFromSelected);
        } else {
            const noteFromAvailable = availableNotes.find(
                (note) => note.id === active.id,
            );
            if (noteFromAvailable) {
                setActiveNote(noteFromAvailable);
            }
        }
    };

    function handleDragEnd(event) {
        const { active, over } = event;
        if (!over) {
            setActiveNote(null);
            return;
        }

        if (over.id === 'note-selector') {
            setSelectedNotes((prev) => prev.filter((note) => note.id !== active.id));
            setActiveNote(null);
            return;
        }

        const isAlreadySelected = selectedNotes.some((note) => note.id === active.id);
        if (!isAlreadySelected) {
            const noteToAdd = availableNotes.find((note) => note.id === active.id);
            if (noteToAdd) {
                const dropIndex = selectedNotes.findIndex(
                    (note) => note.id === over.id,
                );
                if (dropIndex !== -1) {
                    setSelectedNotes((prev) => {
                        const updated = [...prev];
                        updated.splice(dropIndex, 0, noteToAdd);
                        return updated;
                    });
                } else {
                    setSelectedNotes((prev) => [...prev, noteToAdd]);
                }
            }
        } else {
            if (active.id !== over.id) {
                const oldIndex = selectedNotes.findIndex(
                    (note) => note.id === active.id,
                );
                const newIndex = selectedNotes.findIndex((note) => note.id === over.id);
                setSelectedNotes(arrayMove(selectedNotes, oldIndex, newIndex));
            }
        }
        setActiveNote(null);
    }

    const publishReportWithStrategy = (strategy) => () => {
        setModal(FormModal, {
            title: 'Enter Report Title',
            fields: [
                {
                    name: 'title',
                    label: 'Report Title',
                    type: 'text',
                    placeholder: 'Enter report title',
                },
            ],
            onSubmit: (data) => handleTitleSubmit(data.title, strategy),
        });
    };

    // When the title prompt is submitted, if editing then call editReport.
    const handleTitleSubmit = (enteredTitle, strategy) => {
        const noteIds = selectedNotesRef.current.map((note) => note.id);
        if (isEditing && reportId) {
            editReport(reportId, { note_ids: noteIds, title: enteredTitle })
                .then(() => {
                    navigate(`/connectivity/`);
                })
                .catch(displayError(setAlert));
        } else {
            publishReport(strategy, noteIds, enteredTitle, anonymize)
                .then(() => {
                    navigate(`/connectivity/`);
                })
                .catch(displayError(setAlert));
        }
    };

    const navbarContents = () => {
        if (isEditing) {
            return [
                <NavbarButton
                    key='edit-report'
                    icon={<FloppyDisk />}
                    text={'Edit Report'}
                    onClick={() => setShowTitlePrompt(true)}
                />,
            ];
        } else {
            return [
                <NavbarDropdown
                    key='-publish'
                    icon={<Upload />}
                    text={'Upload Report'}
                    contents={publishOptions.upload.map((option) => ({
                        label: option.label,
                        handler: publishReportWithStrategy(option.strategy),
                    }))}
                />,
                <NavbarDropdown
                    key='download-publish'
                    icon={<Download />}
                    text={'Download Report'}
                    contents={publishOptions.download.map((option) => ({
                        label: option.label,
                        handler: publishReportWithStrategy(option.strategy),
                    }))}
                />,
                <NavbarButton
                    key='anonymous-publish'
                    icon={anonymize ? <EyeClosed /> : <Eye />}
                    text={anonymize ? 'Anonymized' : 'Transparent'}
                    onClick={() => setAnonymize(!anonymize)}
                />,
            ];
        }
    };

    useNavbarContents(navbarContents, [publishOptions, anonymize, isEditing]);

    return (
        <div className='w-full h-full overflow-y-hidden relative'>
            <AlertDismissible alert={alert} setAlert={setAlert} />

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <ResizableSplitPane
                    initialSplitPosition={40}
                    leftContent={
                        <NoteSelector
                            selectedNotes={selectedNotes}
                            setSelectedNotes={setSelectedNotes}
                            notes={availableNotes}
                            setNotes={setAvailableNotes}
                            activeNote={activeNote}
                            setAlert={setAlert}
                        />
                    }
                    rightContent={
                        <PublishPreview
                            selectedNotes={selectedNotes}
                            setSelectedNotes={setSelectedNotes}
                            activeNote={activeNote}
                            setAlert={setAlert}
                        />
                    }
                />
                <DragOverlay>
                    {activeNote ? (
                        <Note
                            id={activeNote.id}
                            note={activeNote}
                            setAlert={setAlert}
                            actions={[]}
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
