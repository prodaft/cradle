import { Search } from 'iconoir-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { displayError } from '../../utils/responseUtils/responseUtils';
import FilesList from '../FilesList/FilesList';

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
    const { navigate, navigateLink } = useCradleNavigate();
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
        <div className='w-full h-full flex flex-col space-y-4'>
            {/* Header Section - Minimal Design */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        All Files
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                        Search & Manage Your Files
                    </p>
                </div>
            </div>

            {/* Compact Search and Actions Bar */}
            <div className='px-4'>
                <form 
                    onSubmit={handleSearchSubmit} 
                    className='cradle-card cradle-card-compact'
                >
                    <div className='cradle-card-body p-3'>
                        <div className='flex flex-wrap items-end gap-3'>
                            {/* Keyword Filter */}
                            <div className='flex flex-col gap-1 min-w-[200px] flex-1'>
                                <label className='cradle-label text-xs'>Keyword</label>
                                <input
                                    type='text'
                                    name='keyword'
                                    value={searchFilters.keyword}
                                    onChange={handleSearchChange}
                                    placeholder='Search by name or hash...'
                                    className='cradle-search text-sm py-1.5 px-2'
                                />
                            </div>

                            {/* MIME Type Filter */}
                            <div className='flex flex-col gap-1 min-w-[200px] flex-1'>
                                <label className='cradle-label text-xs'>MIME Type</label>
                                <input
                                    type='text'
                                    name='mimetype'
                                    value={searchFilters.mimetype}
                                    onChange={handleSearchChange}
                                    placeholder='Search by mimetype...'
                                    className='cradle-search text-sm py-1.5 px-2'
                                />
                            </div>

                            {/* Search Button */}
                            <button type='submit' className='cradle-btn cradle-btn-primary cradle-btn-sm px-6'>
                                <Search className='inline-block mr-1' size={14} /> Search
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Results Section */}
            <div className='px-4'>
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
