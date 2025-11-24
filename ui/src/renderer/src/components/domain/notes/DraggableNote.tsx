import { useDraggable } from '@dnd-kit/core';
import type { NoteRetrieve } from '@services/cradle/models';
import Note from './Note';

interface NoteAction {
    Component: React.ComponentType<{
        note: NoteRetrieve;
        setHidden: (hidden: boolean) => void;
        [key: string]: unknown;
    }>;
    props?: Record<string, unknown>;
}

interface DraggableNoteProps {
    id: string;
    note: NoteRetrieve;
    ghost?: boolean;
    actions?: NoteAction[];
}

/**
 * Wrapper component to make a Note draggable
 */
export default function DraggableNote(props: DraggableNoteProps) {
    const { attributes, listeners, setNodeRef } = useDraggable({
        id: props.id,
    });

    return <Note ref={setNodeRef} {...attributes} {...listeners} {...props} />;
}
