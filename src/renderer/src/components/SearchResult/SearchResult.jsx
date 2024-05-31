import {Link} from "react-router-dom";
import {Trash} from "iconoir-react/regular";

/**
 * Component to show search results
 * @param name - the name of the search result
 * @param onClick - the function to call when the result is clicked
 * @param type - the type of the search result
 * @param subtype - the subtype of the search result (Not shown if not provided)
 * @returns {SearchResult}
 * @constructor
 */
export default function SearchResult({name,onClick,type,subtype}) {
    return (
        <div className="h-fit w-full bg-cradle1 px-3 py-6 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl cursor-pointer" onClick={onClick}>
            <h2 className="card-header w-full mx-2">{name}</h2>
            <p className="opacity-50 mx-2">{type}{subtype ? `: ${subtype}` : ''}</p>
        </div>
    );
}