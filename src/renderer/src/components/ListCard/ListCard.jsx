export default function ListCard({ title, items = [] }) {
    return (
        <div className='card bg-gray-2 overflow-auto !max-w-none'>
            <div className='card-body'>
                <h2 className='card-header'>{title}</h2>
                {items.map((item, index) => {
                    const name = `${index + 1}. ${item}`; // todo item.name
                    return (
                        <div
                            key={index}
                            className='opacity-90 hover:opacity-70 active:opacity-50 hover:cursor-pointer card p-2 
                            bg-gray-4 hover:bg-gray-6 active:bg-gray-8 !max-w-none'
                            onClick={() => {
                                console.log('clicked', item);
                            }}
                        >
                            <p className='card-title'>{name}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
