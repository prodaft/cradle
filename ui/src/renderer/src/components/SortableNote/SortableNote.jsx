import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Note from '../Note/Note';

export default function SortableNote(props) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: props.id,
    });

    const style = {
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
        ></Note>
    );
}
