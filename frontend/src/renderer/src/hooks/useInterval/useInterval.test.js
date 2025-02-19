import useInterval from './useInterval';
import { renderHook, act } from '@testing-library/react';
import { describe } from '@jest/globals';

jest.useFakeTimers();

describe('useInterval', () => {
    test('calls the callback immediately and then at specified intervals', () => {
        const callback = jest.fn();
        const delay = 1000;

        renderHook(() => useInterval(callback, delay));
        // Expect the callback to be called immediately
        expect(callback).toHaveBeenCalledTimes(1);

        // Advance the timers by 1 second
        act(() => {
            jest.advanceTimersByTime(1000);
        });

        // Expect the callback to be called again
        expect(callback).toHaveBeenCalledTimes(2);

        // Advance the timers by another second
        act(() => {
            jest.advanceTimersByTime(1000);
        });

        // Expect the callback to be called again
        expect(callback).toHaveBeenCalledTimes(3);
    });

    test('does not call the callback when delay is undefined', () => {
        const callback = jest.fn();

        renderHook(() => useInterval(callback, null));
        // Advance the timers by 1 second
        act(() => {
            jest.advanceTimersByTime(1000);
        });

        // Expect the callback not to be called
        expect(callback).not.toHaveBeenCalled();
    });

    test('cleans up the interval on unmount', () => {
        const callback = jest.fn();
        const delay = 1000;

        const { unmount } = renderHook(() => useInterval(callback, delay));
        // Expect the callback to be called immediately
        expect(callback).toHaveBeenCalledTimes(1);

        // Unmount the component
        unmount();

        // Advance the timers by 1 second
        act(() => {
            jest.advanceTimersByTime(1000);
        });

        // Expect the callback not to be called again after unmount
        expect(callback).toHaveBeenCalledTimes(1);
    });
});
