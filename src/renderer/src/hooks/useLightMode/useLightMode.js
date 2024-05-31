import { useState, useEffect } from 'react';

/**
 * Custom hook to determine if the user's system is in light mode
 * 
 * @returns {boolean} isLightMode
 */
const useLightMode = () => {
    const [isLightMode, setIsLightMode] = useState(
        window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        const handleChange = (e) => {
            setIsLightMode(e.matches);
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    return isLightMode;
};

export default useLightMode;