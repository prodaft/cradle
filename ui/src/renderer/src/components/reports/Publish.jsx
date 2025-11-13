import { useEffect, useRef, useState } from 'react';
import 'tailwindcss/tailwind.css';
import { useModal } from '@/contexts/ModalContext/ModalContext';
import { useNotif } from '@/contexts/NotificationContext/NotificationContext';
import useApi from '@/hooks/useApi/useApi';
import { useAPICall } from '@/hooks/useAPICall';
import Note from '../Note/Note';
import NoteSelector from '../NoteSelector/NoteSelector';
import PublishPreview from '../PublishPreview/PublishPreview';

import { closestCenter, DndContext, DragOverlay, useSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useSearchParams } from 'react-router-dom';
import { NoButtonsSensor } from '@/utils/dndUtils/dndUtils';
import FormModal from '../Modals/FormModal';

import useCradleNavigate from '@/hooks/useCradleNavigate/useCradleNavigate';

export default function Publish() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { notify } = useNotif();
    const [availableNotes, setAvailableNotes] = useState([]);
    const [selectedNotes, setSelectedNotes] = useState([]);
    const selectedNotesRef = useRef([]);
    const [activeNote, setActiveNote] = useState(null);
    const [publishOptions, setPublishOptions] = useState({ upload: [], download: [] });
    const [anonymize, setAnonymize] = useState(false);
    const { setModal } = useModal();
    const { notesApi, reportsApi } = useApi();

    const [isEditing, setIsEditing] = useState(false);
    const [reportId, setReportId] = useState(null);
    const [title, setTitle] = useState('');

    const { navigate, navigateLink } = useCradleNavigate();
    const { execute } = useAPICall();

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
            execute(() => reportsApi.reportsRetrieve({ id: reportParam }))
                .then((reportData) => {
                    setTitle(reportData.title);

                    if (reportData.noteIds && reportData.noteIds.length > 0) {
                        execute(() => Promise.all(
                            reportData.noteIds.map((id) =>
                                notesApi.notesRetrieve({ noteId: id }),
                            ),
                        ))
                            .then((notes) => {
                                setSelectedNotes(notes);
                            })
                            .catch(() => {});
                    }
                })
                .catch(() => {});
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
            execute(() => Promise.all(noteIds.map((id) => getNote(id))))
                .then((notes) => {
                    const validNotes = notes
                        .filter((note) => note.status === 200)
                        .map((note) => note.data);
                    if (notes.length !== validNotes.length) {
                        throw new Error('Some notes could not be loaded.');
                    }
                    setSelectedNotes(validNotes);
                })
                .catch(() => {});
        }
    }, [searchParams]);

    useEffect(() => {
        execute(() => reportsApi.reportsPublishRetrieve())
            .then((options) => {
                setPublishOptions(options);
            })
            .catch(() => {});
    }, [reportsApi, execute]);

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
            execute(() => reportsApi.reportsUpdate({
                id: reportId,
                editReportRequest: { noteIds, title: enteredTitle },
            }))
                .then(() => {
                    navigate(`/reports`);
                })
                .catch(() => {});
        } else {
            execute(() => reportsApi.reportsPublishCreate({
                publishReportRequest: {
                    strategy,
                    noteIds,
                    title: enteredTitle,
                    anonymized: anonymize,
                },
            }))
                .then(() => {
                    navigate(`/reports`);
                })
                .catch(() => {});
        }
    };



    return (
        <div className='w-full h-full overflow-y-hidden relative'>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <PanelGroup direction='horizontal' className='h-full'>
                    <Panel defaultSize={40} minSize={20} maxSize={60}>
                        <NoteSelector
                            selectedNotes={selectedNotes}
                            setSelectedNotes={setSelectedNotes}
                            notes={availableNotes}
                            setNotes={setAvailableNotes}
                            activeNote={activeNote}
                            setAlert={setAlert}
                        />
                    </Panel>
                    <PanelResizeHandle className='w-[2px] cradle-border-x hover:bg-[#FF8C00] hover:bg-opacity-50 transition-colors' />
                    <Panel defaultSize={60} minSize={40}>
                        <PublishPreview
                            selectedNotes={selectedNotes}
                            setSelectedNotes={setSelectedNotes}
                            activeNote={activeNote}
                            setAlert={setAlert}
                        />
                    </Panel>
                </PanelGroup>
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
