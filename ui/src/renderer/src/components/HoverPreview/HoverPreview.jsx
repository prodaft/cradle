import { useState, useEffect } from 'react';
import Preview from '../Preview/Preview';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';

export const HoverPreview = ({ note, position, onClose }) => {
    const [parsedContent, setParsedContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        parseContent(note.content, note.files)
            .then((result) => {
                setParsedContent(result.html);
                setLoading(false);
            })
            .catch(() => {
                setParsedContent('<p>Error loading preview</p>');
                setLoading(false);
            });
    }, [note.content, note.files]);

    // Calculate position to keep preview in viewport
    const getPreviewStyle = () => {
        const previewWidth = 450;
        const previewHeight = 450;
        const padding = 20;

        let left = position.x + 10;
        let top = position.y + 10;

        // Adjust horizontal position if it would go off-screen
        if (left + previewWidth > window.innerWidth - padding) {
            left = position.x - previewWidth - 10;
        }

        // Adjust vertical position if it would go off-screen
        if (top + previewHeight > window.innerHeight - padding) {
            top = window.innerHeight - previewHeight - padding;
        }

        return {
            position: 'fixed',
            left: `${left}px`,
            top: `${top}px`,
            zIndex: 1000,
        };
    };

    return (
        <div
            className='bg-cradle3 bg-opacity-60 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-128 max-h-128 overflow-hidden'
            style={getPreviewStyle()}
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={onClose}
        >
            {/*
            <div className='mb-2'>
                <h3 className='font-semibold text-lg truncate'>
                    {note.metadata?.title || 'Untitled'}
                </h3>
                {note.metadata?.description && (
                    <p className='text-sm text-gray-600 dark:text-gray-400 truncate'>
                        {note.metadata.description}
                    </p>
                )}
            </div>
            */}

            <div classNameCommentedOut='border-gray-200 dark:border-gray-700 pt-2'>
                {loading ? (
                    <div className='flex items-center justify-center h-128'>
                        <div className='spinner-dot-pulse'>
                            <div className='spinner-pulse-dot'></div>
                        </div>
                    </div>
                ) : (
                    <div className='max-h-128 overflow-y-auto'>
                        <Preview htmlContent={parsedContent} />
                    </div>
                )}
            </div>

            {/*
            <div className='mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500'>
                {note.editor ? (
                    <span>Edited {formatDate(new Date(note.edit_timestamp))}</span>
                ) : (
                    <span>Created {formatDate(new Date(note.timestamp))}</span>
                )}
            </div>
            */}
        </div>
    );
};
