/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { useOutletContext } from 'react-router-dom';
import useNavbarContents from './useNavbarContents';
import '@testing-library/jest-dom';

jest.mock('react-router-dom', () => ({
    useOutletContext: jest.fn(),
}));

describe('useNavbarContents', () => {
    it('should set and clear navbar contents based on dependencies', () => {
        const setNavbarContents = jest.fn();
        useOutletContext.mockReturnValue({ setNavbarContents });

        const contents = 'Test Navbar Contents';
        const dependencies = ['dependency1', 'dependency2'];

        renderHook(() => useNavbarContents(contents, dependencies));

        expect(setNavbarContents).toHaveBeenCalledTimes(1);
        expect(setNavbarContents).toHaveBeenCalledWith([contents]);
    });
});
