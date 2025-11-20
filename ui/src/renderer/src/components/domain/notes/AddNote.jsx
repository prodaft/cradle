import { PlusCircle } from 'iconoir-react';

export default function AddNote({ note, setSelectedNotes }) {
    const handleSelectNote = (e) => {
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
