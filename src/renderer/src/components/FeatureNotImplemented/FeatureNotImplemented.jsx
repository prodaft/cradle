import { Link } from 'react-router-dom';

/**
 * FeatureNotImplemented component - a placeholder component for features that are not yet implemented.
 * 
 * @function FeatureNotImplemented
 * @returns {FeatureNotImplemented}
 * @constructor
 */
export default function FeatureNotImplemented() {
    return (
        <div className='flex flex-col justify-center h-full'>
            <h1 className='text-5xl font-bold text-center w-full'>
                Feature Not Implemented
            </h1>
            <p className='text-center'>
                We're sorry, but this feature is not yet implemented.
            </p>
            <Link to='/' className='underline text-cradle2 text-center w-full'>
                Go back to Home
            </Link>
        </div>
    );
};
