import FilesList from './FilesList';

/**
 * Files page component
 * Main page for managing and viewing all files
 */
export default function Files() {
    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div className='space-y-1'>
                    <h2 className='text-2xl font-bold tracking-tight'>Files</h2>
                    <p className='text-muted-foreground'>Browse & Manage Files</p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-4'>
                {/* Files List */}
                <FilesList />
            </div>
        </div>
    );
}
