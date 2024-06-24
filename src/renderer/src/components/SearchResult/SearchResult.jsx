/**
 * Component to show search results
 * 
 * @function SearchResult
 * @param {Object} props - The props of the component.
 * @param {string} props.name - the name of the search result
 * @param {Function} props.onClick - the function to call when the result is clicked
 * @param {string} props.type - the type of the search result
 * @param {string} props.subtype - the subtype of the search result (Not shown if not provided)
 * @returns {SearchResult}
 * @constructor
 */
export default function SearchResult({ name, onClick, type, subtype }) {
    return (
        <div
            className='h-fit w-full bg-cradle3 px-3 py-6 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl cursor-pointer'
            onClick={onClick}
        >
            <h2 className='card-header w-full mx-2 text-white'>{name}</h2>
            <p className='text-zinc-300 mx-2'>
                {type}
                {subtype ? `: ${subtype}` : ''}
            </p>
        </div>
    );
}
