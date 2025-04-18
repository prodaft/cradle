import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'iconoir-react';
import { DndContext, DragOverlay, useDraggable, useSensor } from '@dnd-kit/core';

// Components
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Pagination from '../Pagination/Pagination';
import SortableNote from '../SortableNote/SortableNote';
import AddNote from '../NoteActions/AddNote';
import Note from '../Note/Note';

// Services
import { searchNote } from '../../services/notesService/notesService';
import { NoButtonsSensor } from '../../utils/dndUtils/dndUtils';

/**
 * Wrapper component to make a Note draggable
 */
export default function DraggableNote(props) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: props.id,
    });

    return <Note ref={setNodeRef} {...attributes} {...listeners} {...props}></Note>;
}
