import { useDraggable } from '@dnd-kit/core';

// Components
import Note from '../Note/Note';

// Services

/**
 * Wrapper component to make a Note draggable
 */
export default function DraggableNote(props) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: props.id,
    });

    return <Note ref={setNodeRef} {...attributes} {...listeners} {...props}></Note>;
}
