import { PlusCircle } from 'iconoir-react';

export default function AddNote({ note, setSelectedNotes }) {
    const handleSelectNote = (e) => {
        setSelectedNotes((prev) => {
            return [...prev, note];
        });
    };

    return (
        <button className='pl-10'>
            <PlusCircle onClick={handleSelectNote} />
        </button>
    );
}
