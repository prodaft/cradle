import FilesList from './FilesList';

/**
 * Files page component
 * Main page for managing and viewing all files
 */
export default function Files() {
    return (
        <div className='w-full h-full'>
            {/* Page Header */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        Files
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                        Browse & Manage Files
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className='flex flex-col space-y-4 p-4'>
                {/* Files List */}
                <FilesList />
            </div>
        </div>
    );
}
