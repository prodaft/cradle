import { useEffect, useState } from 'react';
import {
    useIsActivePane,
    useIsBackgroundTab,
    useTabContext,
} from '../hooks/tabs/useTabContext';

/**
 * Example component showing how to use tab-aware routing
 * This component demonstrates the proper way to handle routing in a multi-tab environment
 */
const TabAwareComponent = () => {
    const { params, location, navigate, isActive, isPaneActive } = useTabContext();
    const isBackground = useIsBackgroundTab();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isActivePane = useIsActivePane();

    const [localState, setLocalState] = useState('');

    // Example: Handle URL parameters
    const noteId = params.id; // This will be captured for background tabs

    // Example: Handle location changes
    useEffect(() => {
        if (isActive && isPaneActive) {
            // Only active tabs in active panes should react to location changes
            console.log('Active tab location changed:', location.pathname);
        } else if (isBackground) {
            // Background tabs use captured data
            console.log('Background tab using captured location:', location.pathname);
        }
    }, [location.pathname, isActive, isPaneActive, isBackground]);

    // Example: Navigation function
    const handleNavigation = (newPath: string) => {
        if (isBackground) {
            // Background tabs cannot navigate - this will show a warning
            navigate(newPath);
            return;
        }

        if (!isActive || !isPaneActive) {
            // Only active tabs in active panes can navigate
            console.warn('Only the active tab in the active pane can navigate');
            return;
        }

        // Safe to navigate
        navigate(newPath);
    };

    // Example: Local state management (works in all tabs)
    const handleLocalStateChange = (value: string) => {
        setLocalState(value);
    };

    return (
        <div className='p-4'>
            <h2>Tab-Aware Component Example</h2>

            <div className='mb-4'>
                <h3>Tab Status:</h3>
                <ul>
                    <li>Is Active Tab: {isActive ? 'Yes' : 'No'}</li>
                    <li>Is Active Pane: {isPaneActive ? 'Yes' : 'No'}</li>
                    <li>Is Background Tab: {isBackground ? 'Yes' : 'No'}</li>
                </ul>
            </div>

            <div className='mb-4'>
                <h3>URL Information:</h3>
                <ul>
                    <li>Current Path: {location.pathname}</li>
                    <li>Note ID: {noteId || 'None'}</li>
                </ul>
            </div>

            <div className='mb-4'>
                <h3>Local State (works in all tabs):</h3>
                <input
                    type='text'
                    value={localState}
                    onChange={(e) => handleLocalStateChange(e.target.value)}
                    placeholder='This works in all tabs'
                    className='border p-2'
                />
            </div>

            <div className='mb-4'>
                <h3>Navigation (only works in active tab):</h3>
                <button
                    onClick={() => handleNavigation('/notes')}
                    className='bg-blue-500 text-white px-4 py-2 rounded mr-2'
                >
                    Go to Notes
                </button>
                <button
                    onClick={() => handleNavigation('/files')}
                    className='bg-green-500 text-white px-4 py-2 rounded'
                >
                    Go to Files
                </button>
            </div>

            {isBackground && (
                <div className='bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded'>
                    <strong>Background Tab:</strong> This tab is running but hidden. It
                    uses captured URL data and cannot navigate.
                </div>
            )}
        </div>
    );
};

export default TabAwareComponent;
