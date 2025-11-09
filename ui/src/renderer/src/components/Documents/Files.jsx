import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNotif } from '../../contexts/NotificationContext/NotificationContext';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { handleAPIError } from '../../utils/apiErrorHandler';
import FilesList from '../FilesList/FilesList';

/**
 * Files component for Documents section
 * Displays files not linked to any specific artifact
 * Uses the FilesList component to display files
 *
 * @returns {JSX.Element}
 */
export default function Files() {
    const { notify } = useNotif();
    const { navigate, navigateLink } = useCradleNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchFilters, setSearchFilters] = useState({
        keyword: '',
        mimetype: '',
    });

    // Error handler function
    const handleError = (error) => {
        handleAPIError(error, notify);
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
                        onError={handleError}
                    />
                )}
            </div>
        </div>
    );
}
