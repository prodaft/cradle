import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

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
        // Format the timestamp for display
        setFormattedTimestamp(new Date(log.timestamp).toLocaleString());
    }, [log.timestamp]);

    const handleNavigateToObject = () => {
        navigate(`/${log.content_type}/${log.object_id}`);
    };

    return (
        <div
            className='bg-cradle3 bg-opacity-30 p-4 backdrop-blur-lg rounded-xl m-3 shadow-md cursor-pointer'
            onClick={handleNavigateToObject}
        >
            <div className='flex flex-row justify-between items-center mb-2'>
                <div className='text-zinc-300 text-xs'>{formattedTimestamp}</div>
                <div className='text-orange-500 text-xs font-bold uppercase'>
                    {log.type}
                </div>
            </div>
            <div className='bg-transparent h-fit p-2 text-zinc-300'>
                <table className='table-auto text-s'>
                    <tbody>
                        <tr>
                            <td className='font-semibold pr-2 text-right text-cradle2'>
                                User:
                            </td>
                            <td className='text-zinc-300'>{log.user.username}</td>
                        </tr>
                        <tr>
                            <td className='font-semibold pr-2 text-right text-cradle2'>
                                Object:
                            </td>
                            <td className='text-zinc-300'>{log.object_repr}</td>
                        </tr>
                        {log.details && (
                            <tr>
                                <td className='font-semibold pr-2 text-right text-cradle2'>
                                    Details:
                                </td>
                                <td className='bg-cradle3 bg-opacity-30 p-2 break-words whitespace-pre-wrap backdrop-blur-lg rounded-xl m-3 shadow-md cursor-pointer text-zinc-300'>
                                    {log.details}
                                </td>
                            </tr>
                        )}

                        {log.src_log && (
                            <tr>
                                <td className='font-semibold pr-2 text-right text-cradle2'>
                                    Caused by:
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {log.src_log && <Activity log={log.src_log} />}
            </div>
        </div>
    );
}
