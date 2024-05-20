/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import useFrontendSearch from './useFrontendSearch';

describe('useFrontendSearch', () => {
    const children = [
        { props: { searchKey: 'Child 1' } },
        { props: { searchKey: 'Child 2' } },
        { props: { searchKey: 'Child 3' } },
    ];

    it('returns all children when search value is empty', () => {
        const { result } = renderHook(() => useFrontendSearch(children));
        expect(result.current.filteredChildren).toEqual(children);
    });

    it('returns matching children when search value is provided', () => {
        const { result } = renderHook(() => useFrontendSearch(children));
        act(() => result.current.setSearchVal('1'));
        expect(result.current.filteredChildren).toEqual([children[0]]);
    });

    it('returns no children when search value does not match', () => {
        const { result } = renderHook(() => useFrontendSearch(children));
        act(() => result.current.setSearchVal('4'));
        expect(result.current.filteredChildren).toEqual([]);
    });
});