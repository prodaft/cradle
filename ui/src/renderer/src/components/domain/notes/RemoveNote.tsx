import { MinusCircle } from 'iconoir-react';
import { MouseEvent } from 'react';
import { Button } from '@/components/ui/button';

interface Note {
    id: string;
    [key: string]: any;
}

interface RemoveNoteProps {
    note: Note;
    setSelectedNotes: React.Dispatch<React.SetStateAction<Note[]>>;
}

export default function RemoveNote({ note, setSelectedNotes }: RemoveNoteProps) {
    const handleSelectNote = (e: MouseEvent<SVGSVGElement>) => {
        setSelectedNotes((prev) => {
            return prev.filter((item) => item.id !== note.id);
        });
    };

    return (
        <Button variant='ghost' size='icon-sm' className='p-0'>
            <MinusCircle onClick={handleSelectNote} />
        </Button>
    );
}
