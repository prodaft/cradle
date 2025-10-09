import { Search } from 'iconoir-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { displayError } from '../../utils/responseUtils/responseUtils';
import FilesList from '../FilesList/FilesList';

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
    const { navigate, navigateLink } = useCradleNavigate();
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
            <div className='cradle-card cradle-card-compact mb-4'>
                <div className='cradle-card-header'>
                    <span>Search Files</span>
                </div>
                <div className='cradle-card-body'>
                    <form onSubmit={handleSearchSubmit} className='space-y-4'>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                            <div className='flex flex-col gap-2'>
                                <label className='cradle-label'>Keyword</label>
                                <input
                                    type='text'
                                    name='keyword'
                                    value={searchFilters.keyword}
                                    onChange={handleSearchChange}
                                    placeholder='Search by name or hash...'
                                    className='cradle-search'
                                />
                            </div>
                            <div className='flex flex-col gap-2'>
                                <label className='cradle-label'>MIME Type</label>
                                <input
                                    type='text'
                                    name='mimetype'
                                    value={searchFilters.mimetype}
                                    onChange={handleSearchChange}
                                    placeholder='Search by mimetype...'
                                    className='cradle-search'
                                />
                            </div>
                        </div>
                        
                        {obj.type === 'entity' && (
                            <div className='flex items-center space-x-2'>
                                <input
                                    type='checkbox'
                                    id='exactMatch'
                                    name='exactMatch'
                                    className='switch switch-ghost-primary h-5 w-14'
                                    checked={exactMatch}
                                    onChange={(e) => setExactMatch(e.target.checked)}
                                />
                                <label htmlFor='exactMatch' className='text-sm'>
                                    Exact match
                                </label>
                            </div>
                        )}
                        
                        <div className='cradle-separator'></div>
                        
                        <button type='submit' className='cradle-btn cradle-btn-primary w-full md:w-auto px-8'>
                            <Search className='inline-block mr-2' size={16} /> Search Files
                        </button>
                    </form>
                </div>
            </div>
            
            <FilesList query={query} setAlert={setAlert} onError={handleError} />
        </div>
    );
}
