import FilesList from './FilesList';
import { useState } from 'react';

/**
 * Files page component
 * Main page for managing and viewing all files
 */
export default function Files() {
    const [fileCount, setFileCount] = useState({ current: 0, total: 0 });

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
                <div className="flex items-center gap-1.5 px-3 h-7 text-xs font-mono rounded-full border border-[#FF8C00]/30 bg-[#FF8C00]/10 text-[#FF8C00]">
                    <span className="font-semibold">
                        {fileCount.current === fileCount.total || (fileCount.current === 0 && fileCount.total === 0)
                            ? fileCount.total
                            : `${fileCount.current}/${fileCount.total}`}
                    </span>
                    <span className="opacity-70">files</span>
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
