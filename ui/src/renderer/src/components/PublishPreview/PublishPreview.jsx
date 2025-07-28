import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import RemoveNote from '../NoteActions/RemoveNote';
import SortableNote from '../SortableNote/SortableNote';

export default function PublishPreview({
    selectedNotes,
    setSelectedNotes,
    activeNote,
    setAlert,
}) {
    const isEmpty = selectedNotes.length === 0;
    const { setNodeRef } = useDroppable({ id: 'publish-organizer' });

    return (
        <div
            ref={setNodeRef}
            className='w-full h-full justify-center items-center overflow-x-hidden'
        >
            <SortableContext
                items={selectedNotes.map((note) => note.id)}
                strategy={verticalListSortingStrategy}
            >
                {isEmpty ? (
                    <div className='text-gray-500 text-center p-4'>
                        <p>Drop notes here</p>
                    </div>
                ) : (
                    selectedNotes.map((note) => (
                        <SortableNote
                            id={note.id}
                            key={note.id}
                            note={note}
                            setAlert={setAlert}
                            ghost={activeNote && activeNote.id === note.id}
                            actions={[
                                { Component: RemoveNote, props: { setSelectedNotes } },
                            ]}
                        />
                    ))
                )}
            </SortableContext>
        </div>
    );
}
