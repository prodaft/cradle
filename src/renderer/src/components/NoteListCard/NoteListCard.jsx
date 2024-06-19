export default function NoteListCard({ title, notes = [] }) {
    return (
        <div className='card overflow-auto !max-w-none'>
            <div className='card-body'>
                <h2 className='card-header'>{title}</h2>
                {notes.map((note, index) => {
                    const name = `${index + 1}. ${note}`; // todo note.name
                    return (
                        <div className='my-2 border' key={index}>
                            <h5 className='card-title'>{name}</h5>
                            <p className='card-text'>{note.timestamp || ''}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
