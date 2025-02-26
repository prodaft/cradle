import React, { useState, useEffect, useRef } from 'react';
import { updateNote, getNote } from '../../services/notesService/notesService';
import {
    getPublishOptions,
    publishReport,
} from '../../services/publishService/publishService';
import 'tailwindcss/tailwind.css';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import FloatingTextInput from '../FloatingTextInput/FloatingTextInput';
import ResizableSplitPane from '../ResizableSplitPane/ResizableSplitPane';
import NoteSelector from '../NoteSelector/NoteSelector';
import PublishPreview from '../PublishPreview/PublishPreview';
import Note from '../Note/Note';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';

import { DndContext, closestCenter, DragOverlay, useSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { NoButtonsSensor } from '../../utils/dndUtils/dndUtils';
import { useSearchParams } from 'react-router-dom';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { Download, Upload } from 'iconoir-react';

import NavbarDropdown from '../NavbarDropdown/NavbarDropdown';

export default function Publish() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [availableNotes, setAvailableNotes] = useState([]);
    const [selectedNotes, setSelectedNotes] = useState([]);
    const selectedNotesRef = useRef([]);
    const [activeNote, setActiveNote] = useState(null);
    const [publishOptions, setPublishOptions] = useState({ upload: [], download: [] });
    const [showTitlePrompt, setShowTitlePrompt] = useState(false);
    const [publishStrategy, setPublishStrategy] = useState(null);

    const sensors = [useSensor(NoButtonsSensor)];

    useEffect(() => {
        selectedNotesRef.current = selectedNotes;
    }, [selectedNotes]);

    useEffect(() => {
        const queryParams = new URLSearchParams(searchParams);
        const notesParam = queryParams.get('notes');
        if (notesParam) {
            const noteIds = notesParam.split(',');
            Promise.all(noteIds.map((id) => getNote(id)))
                .then((notes) => {
                    const validNotes = notes
                        .filter((note) => note.status == 200)
                        .map((note) => note.data);
                    if (notes.length !== validNotes.length) {
                        throw new Error('Some notes could not be loaded.');
                    }
                    console.log(validNotes);
                    setSelectedNotes(validNotes);
                })
                .catch(displayError(setAlert));
        }
    }, []);


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
        setSearchParams(queryParams);
    }, [selectedNotes]);

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

        // If dropped onto the NoteSelector droppable area, remove from publish.
        if (over.id === 'note-selector') {
            setSelectedNotes((prev) => prev.filter((note) => note.id !== active.id));
            setActiveNote(null);
            return;
        }

        // Otherwise, we assume the drop happened in the PublishPreview area.
        const isAlreadySelected = selectedNotes.some((note) => note.id === active.id);
        if (!isAlreadySelected) {
            // The note is coming from availableNotes.
            const noteToAdd = availableNotes.find((note) => note.id === active.id);
            if (noteToAdd) {
                // Insert over the note that was dropped on.
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

    function publishReportWithStrategy(strategy) {
        return () => {
            setPublishStrategy(strategy);
            setShowTitlePrompt(true);
        };
    }

    const handleTitleSubmit = (title) => {
      const noteIds = selectedNotesRef.current.map((note) => note.id);
      publishReport(publishStrategy, noteIds,title).catch(displayError(setAlert));
    };

    const navbarContents = () => [
        <NavbarDropdown
            key='upload-publish'
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
    ];

    useNavbarContents(navbarContents, [publishOptions]);

    return (
        <div className='w-full h-full overflow-y-hidden relative'>
            <AlertDismissible alert={alert} setAlert={setAlert} />

            <FloatingTextInput
              title="Enter a title for your report"
              placeholder="Awesome Title"
              open={showTitlePrompt}
              setOpen={setShowTitlePrompt}
              onSubmit={handleTitleSubmit}
            />

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <ResizableSplitPane
                    initialSplitPosition={40} // matches the original 2/5 width
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
