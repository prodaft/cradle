import { useState } from 'react';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FilesList from '../FilesList/FilesList';
import { Search } from 'iconoir-react';

/**
 * Files component for Documents section
 * Displays files not linked to any specific artifact
 * Uses the FilesList component to display files
 *
 * @param {Object} props
 * @param {Function} props.setAlert - Function to set alert messages
 * @returns {JSX.Element}
 */
export default function Files({ setAlert }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchFilters, setSearchFiltersFoo] = useState({
        keyword: '',
        mimetype: '',
    });

    const setSearchFilters = (filters) => {
        setSearchFiltersFoo(filters);
        console.log('Search filters updated:', filters);
    };

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

    return (
        <div className='w-full h-full flex flex-col space-y-3'>
            <div className='flex justify-between items-center w-full border-b border-gray-700 px-4 pb-3'>
                <h1 className='text-4xl font-bold w-full break-all'>All Files</h1>
            </div>
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
                    </div>
                </form>
                {searchFilters && (
                    <FilesList
                        query={searchFilters}
                        setAlert={setAlert}
                        onError={handleError}
                    />
                )}
            </div>
        </div>
    );
}
