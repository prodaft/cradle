export default function EntryListCard({ title, entities = [] }) {
    return (
        <div className='card overflow-auto !max-w-none'>
            <div className='card-body'>
                <h2 className='card-header'>{title}</h2>
                {entities.map((entity, index) => {
                    const name = `${index + 1}. ${entity}`; // todo entity.name
                    return (
                        <div
                            key={index}
                            className='my-2 hover:opacity-80 hover:cursor-pointer'
                            onClick={() => {
                                console.log('clicked', entity);
                            }}
                        >
                            <h5 className='card-title'>{name}</h5>
                            <p className='card-text'>{entity.timestamp || ''}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
