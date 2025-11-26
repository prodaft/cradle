import type { NoteRetrieve } from '@services/cradle/models';
import { PlusCircle } from 'iconoir-react';

interface AddNoteProps {
    note: NoteRetrieve;
    setSelectedNotes: React.Dispatch<React.SetStateAction<NoteRetrieve[]>>;
}

export default function AddNote({ note, setSelectedNotes }: AddNoteProps) {
    const handleSelectNote = () => {
        setSelectedNotes((prev) => {
            return [...prev, note];
        });
    };

    return (
        <button className=''>
            <PlusCircle onClick={handleSelectNote} />
        </button>
    );
}
