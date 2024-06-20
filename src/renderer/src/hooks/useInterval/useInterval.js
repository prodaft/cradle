import { useEffect, useRef } from 'react';

/**
 * Custom hook that calls the callback function at a specified interval.
 * Also calls the callback immediately.
 *
 * @param callback - the callback function to call
 * @param delay - the interval in milliseconds
 */
const useInterval = (callback, delay) => {
    const savedCallback = useRef();

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        const tick = () => {
            if (savedCallback.current) {
                savedCallback.current();
            }
        };

        if (delay) {
            tick();
            const id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
};

export default useInterval;
