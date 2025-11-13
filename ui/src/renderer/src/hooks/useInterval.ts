/**
 * Hook for executing a callback at regular intervals
 */

import { useEffect, useRef } from 'react';

/**
 * Custom hook that calls the callback function at a specified interval.
 * Also calls the callback immediately.
 *
 * @param callback - The callback function to call
 * @param delay - The interval in milliseconds
 */
export const useInterval = (callback: () => void, delay: number | null): void => {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = (): void => {
      if (savedCallback.current) {
        savedCallback.current();
      }
    };

    if (delay !== null) {
      tick();
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

export default useInterval;
