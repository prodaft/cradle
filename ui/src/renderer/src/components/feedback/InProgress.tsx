import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface InProgressProps {
    message?: string | ReactNode;
}

/**
 * InProgress component - a placeholder for pages under development.
 */
export default function InProgress({ message }: InProgressProps) {
    return (
        <div
            className='flex flex-col items-center justify-center min-h-screen text-gray-800 px-4'
            data-testid='in-progress'
        >
            <div className='bg-cradle3 shadow-md rounded-2xl py-24 px-3 max-w-4xl w-full text-center'>
                <h1 className='text-5xl font-extrabold mb-6 text-cradle2'>
                    🚧 Feature Under Development 🚧
                </h1>

                <p className='text-xl mb-10 cradle-text-tertiary'>
                    {message || (
                        <>
                            This page is still cooking... 🍳 <br />
                            Come back later!
                        </>
                    )}
                </p>

                <Link
                    to='/'
                    className='inline-block px-6 py-3 bg-cradle2 rounded-lg shadow-sm transition-transform transform hover:-translate-y-0.5'
                >
                    ← Go back to Home
                </Link>
            </div>
        </div>
    );
}
