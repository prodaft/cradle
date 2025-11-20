import FilesContent from './FilesList';

/**
 * Files page component
 * Main page for managing and viewing all files
 *
 * @function Files
 * @returns {Files}
 * @constructor
 */
export default function Files() {
    return (
        <div className='w-full h-full'>
            <FilesContent />
        </div>
    );
}
