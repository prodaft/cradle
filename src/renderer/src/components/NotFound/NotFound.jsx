import { Link, useLocation } from 'react-router-dom';

/**
 * NotFound component - a placeholder component for pages that are not found.
 * @returns {NotFound}
 * @constructor
 */
export default function NotFound() {
    const location = useLocation();

    return (
        <div className="flex flex-col justify-center h-full">
            <h1 className="text-5xl font-bold text-center w-full">404 Not Found</h1>
            <p className="text-center">Oops! We can't seem to find a page for <code>{location.pathname}</code>.</p>
            <Link to="/" className="underline text-cradle2 text-center w-full">Go back to Home</Link>
        </div>
    );
};
