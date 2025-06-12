import { useState } from 'react';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FilesList from '../FilesList/FilesList';
import { Search } from 'iconoir-react';

/**
 * Files component
 * Displays files related to an artifact
 * Uses the FilesList component to display files
 *
 * @param {Object} props
 * @param {Object} props.obj - The artifact object
 * @param {Function} props.setAlert - Function to set alert messages
 * @returns {JSX.Element}
 */
export default function Files({ obj, setAlert }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [exactMatch, setExactMatch] = useState(false);
    const [searchFilters, setSearchFilters] = useState({
        linked_to: obj?.id || '',
        entity_type: obj?.type || '',
        keyword: '',
        mimetype: '',
    });

    // Error handler function
    const handleError = (error) => {
        displayError(setAlert, navigate)(error);
    };

    const handleSearchChange = (e) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        // Reset page to 1 when search is submitted
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', '1');
        setSearchParams(newParams);
    };

    // Prepare the query for FilesList
    const query = {
        ...searchFilters,
        linked_to_exact_match: exactMatch,
    };

    return (
        <div className='w-full h-full flex flex-col'>
            <div className='bg-cradle3 bg-opacity-20 p-4 backdrop-filter backdrop-blur-lg rounded-xl mb-4'>
                <form onSubmit={handleSearchSubmit} className='flex space-x-4'>
                    <input
                        type='text'
                        name='keyword'
                        value={searchFilters.keyword}
                        onChange={handleSearchChange}
                        placeholder='Search by name or hash'
                        className='input input-block'
                    />
                    <input
                        type='text'
                        name='mimetype'
                        value={searchFilters.mimetype}
                        onChange={handleSearchChange}
                        placeholder='Search by mimetype'
                        className='input input-block'
                    />
                    <div className='flex items-center space-x-2'>
                        <button type='submit' className='btn'>
                            <Search /> Search
                        </button>
                        {obj.type === 'entity' && (
                            <div className='flex items-center'>
                                <input
                                    type='checkbox'
                                    id='exactMatch'
                                    name='exactMatch'
                                    className='switch switch-ghost-primary h-5 w-14'
                                    checked={exactMatch}
                                    onChange={(e) => setExactMatch(e.target.checked)}
                                />
                                <label htmlFor='exactMatch' className='ml-2 text-sm'>
                                    Exact match
                                </label>
                            </div>
                        )}
                    </div>
                </form>
                <FilesList query={query} setAlert={setAlert} onError={handleError} />
            </div>
        </div>
    );
}
