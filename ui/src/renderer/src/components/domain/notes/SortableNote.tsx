import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { NoteRetrieve } from '@services/cradle/models';
import { CSSProperties } from 'react';
import Note from './Note';

interface NoteAction {
    Component: React.ComponentType<{
        note: NoteRetrieve;
        setHidden: (hidden: boolean) => void;
        [key: string]: unknown;
    }>;
    props?: Record<string, unknown>;
}

interface SortableNoteProps {
    id: string;
    note: NoteRetrieve;
    ghost?: boolean;
    actions?: NoteAction[];
}

export default function SortableNote(props: SortableNoteProps) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: props.id,
    });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <Note
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            {...props}
        />
    );
}
