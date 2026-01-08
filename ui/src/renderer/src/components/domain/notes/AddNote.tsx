import type { NoteRetrieve } from '@services/cradle/models';
import { PlusCircle } from 'iconoir-react';
import { Button } from '@/components/ui/button';

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
        <Button
            variant='ghost'
            size='icon-sm'
            onClick={handleSelectNote}
        >
            <PlusCircle />
        </Button>
    );
}
