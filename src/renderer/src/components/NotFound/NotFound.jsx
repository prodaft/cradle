import { Link, useLocation } from 'react-router-dom';

/**
 * NotFound component - a placeholder component for pages that are not found.
 * 
 * @param {string} message - An optional message to display in place of the default message.
 * @returns {NotFound}
 * @constructor
 */
export default function NotFound({ message }) {
    const location = useLocation();

    return (
        <div className='flex flex-col justify-center h-full' data-testid='not-found'>
            <h1 className='text-5xl font-bold text-center w-full'>404 Not Found</h1>
            {message ? (
                <p className='text-center'>{message}</p>
            ) : (
                <p className='text-center'>
                    Oops! We can't seem to find a page for{' '}
                    <code>{location.pathname}</code>.
                </p>
            )}
            <Link to='/' className='underline text-cradle2 text-center w-full'>
                Go back to Home
            </Link>
        </div>
    );
}
