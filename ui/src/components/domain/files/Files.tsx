import { useState } from 'react';
import FilesList from './FilesList';

/**
 * Files page component
 * Main page for managing and viewing all files
 */
export default function Files() {
    const [fileCount, setFileCount] = useState({ current: 0, total: 0 });

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
            <div className='flex flex-col space-y-4 p-4'>
                {/* Files List */}
                <FilesList onCountChange={setFileCount} />
            </div>
        </div>
    );
}
