import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-diff';
import 'prismjs/themes/prism-tomorrow.css';

/**
 * Activity component - Displays details of an activity log entry.
 *
 * @function Activity
 * @param {Object} props - The props object
 * @param {Object} props.log - Activity log object
 * @returns {Activity}
 * @constructor
 */
export default function Activity({ log }) {
    const navigate = useNavigate();
    const [formattedTimestamp, setFormattedTimestamp] = useState('');

    useEffect(() => {
        setFormattedTimestamp(new Date(log.timestamp).toLocaleString());
    }, [log.timestamp]);

    useEffect(() => {
        Prism.highlightAll();
    }, [log.details]);

    const handleNavigateToObject = () => {
        navigate(`/${log.content_type}/${log.object_id}`);
    };

    return (
        <div
            className='bg-white dark:bg-gray-800 dark:bg-opacity-70 p-4 backdrop-blur-lg rounded-lg m-2 shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer'
            onClick={handleNavigateToObject}
        >
            <div className='flex justify-between items-center mb-2'>
                <div className='text-gray-600 dark:text-gray-300 text-xs'>
                    {formattedTimestamp}
                </div>
                <div className='text-orange-600 dark:text-orange-500 text-xs font-bold uppercase'>
                    {log.type}
                </div>
            </div>
            <div className='text-gray-700 dark:text-gray-300 text-sm space-y-1'>
                <div>
                    <strong className='text-cradle2'>User:</strong> {log.user.username}
                </div>
                <div>
                    <strong className='text-cradle2'>Object:</strong> {log.object_repr}
                </div>
                {log.details && (
                    <div>
                        <strong className='text-cradle2 text-sm'>Details:</strong>
                        <pre className='break-words whitespace-pre-wrap'>
                            <code className='language-diff'>{log.details}</code>
                        </pre>
                    </div>
                )}
            </div>
            {log.src_log && (
                <div>
                    <strong className='text-cradle2 text-sm'>Caused by:</strong>
                    <Activity log={log.src_log} />
                </div>
            )}
        </div>
    );
}
