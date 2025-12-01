/**
 * Hook for filtering React children based on search value
 */

import { ReactElement, useEffect, useState } from 'react';

/**
 * Child element with searchKey prop
 */
interface SearchableChild extends ReactElement {
    props: {
        searchKey?: string;
        [key: string]: any;
    };
}

/**
 * Return type for useFrontendSearch hook
 */
export interface UseFrontendSearchReturn {
    searchVal: string;
    setSearchVal: (value: string) => void;
    filteredChildren: SearchableChild[];
}

/**
 * useFrontendSearch hook - This hook is used to filter the children based on the search value.
 * The hook returns the following values:
 * - filteredChildren: The children that match the search value
 * - searchVal: The search value
 * - setSearchVal: The function to set the search value
 * To use this hook, pass the children to be filtered.
 * IMPORTANT - The children should have a searchKey prop that will be used for filtering.
 * Update the searchVal using setSearchVal to filter the children.
 * Use the filteredChildren to display the filtered children.
 *
 * @param children - The children to be filtered
 * @returns Search state and filtered children
 */
export const useFrontendSearch = (
    children: SearchableChild[],
): UseFrontendSearchReturn => {
    const [searchVal, setSearchVal] = useState<string>('');
    const [filteredChildren, setFilteredChildren] =
        useState<SearchableChild[]>(children);

    useEffect(() => {
        if (searchVal === '') {
            setFilteredChildren(children);
        } else {
            const filtered = children.filter((child) => {
                console.log(child.props);
                return (child.props.searchKey || child.props.name || child.props.key || child.props.id || '').toString().toLowerCase().includes(searchVal.toLowerCase());
            });
            setFilteredChildren(filtered);
        }
    }, [searchVal, children]);

    return { searchVal, setSearchVal, filteredChildren };
};

export default useFrontendSearch;
