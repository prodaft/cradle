import { MinusCircle } from 'iconoir-react';

export default function RemoveNote({ note, setSelectedNotes }) {
    const handleSelectNote = (e) => {
        setSelectedNotes((prev) => {
            return prev.filter((item) => item.id !== note.id);
        });
    };

    return (
        <button>
            <MinusCircle onClick={handleSelectNote} />
        </button>
    );
}
