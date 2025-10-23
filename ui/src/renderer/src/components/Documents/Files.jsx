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
